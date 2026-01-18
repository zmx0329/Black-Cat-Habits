import { Habit, Log, HabitType } from '../types';

const DEFAULT_API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface DeepseekResponse {
  choices?: { message?: { content?: string }; delta?: { content?: string } }[];
}

const buildStatsPrompt = (habits: Habit[], logs: Log[]) => {
  const now = new Date();
  const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const todayKey = toDateKey(now);

const todayLogs = logs.filter(log => toDateKey(new Date(log.timestamp)) === todayKey);

  const goodCompleted: string[] = [];
  const badTriggered: string[] = [];
  const pending: string[] = [];

  habits.forEach(h => {
    const count = h.todayCount || 0;
    if (h.type === HabitType.GOOD) {
      if (h.daily_goal && count >= h.daily_goal) {
        goodCompleted.push(`${h.name}（${count}/${h.daily_goal}，${h.description || '无描述'}）`);
      } else if (count > 0) {
        pending.push(`${h.name}（未达标 ${count}/${h.daily_goal || 0}，${h.description || '无描述'}）`);
      } else {
        pending.push(`${h.name}（未开始，目标${h.daily_goal || 0}，${h.description || '无描述'}）`);
      }
    } else if (h.type === HabitType.BAD) {
      const hasBadLog = todayLogs.some(l => l.habit_id === h.id);
      if (hasBadLog) {
        badTriggered.push(`${h.name}（${h.description || '无描述'}）`);
      }
    }
  });

  return `
# Time
当前时间: ${now.toLocaleString('zh-CN')}

# Data
已完成（好习惯，含目标/描述）: ${JSON.stringify(goodCompleted)}
已触发（坏习惯，含描述）: ${JSON.stringify(badTriggered)}
未完成（含未达标/未开始，带目标/描述）: ${JSON.stringify(pending)}
总日志条数: ${logs.length}

# Reminder
只挑最典型的一个习惯举例，避免枚举。
`;
};

export async function fetchDailyRemark(
  habits: Habit[],
  logs: Log[],
  onToken?: (text: string) => void
): Promise<string> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  const apiUrl = import.meta.env.VITE_DEEPSEEK_API_URL || DEFAULT_API_URL;

  if (!apiKey) {
    throw new Error('Missing VITE_DEEPSEEK_API_KEY');
  }

  const payload = {
    model: 'deepseek-chat',
    temperature: 0.7,
    max_tokens: 120,
    stream: Boolean(onToken),
    messages: [
      {
        role: 'system',
        content: `
你是一只高贵、冷酷、洞察人性的黑猫“人生教官”。你信奉结果正义，痛恨借口和伪勤奋。
世界观：
1) 结果至上：只看 Done/Pending，不听借口。
2) 极度厌恶虚伪：好习惯+坏习惯同时出现时，必须揭穿“伪勤奋”。
3) 痛恨拖延：Pending 即“即将发生的失败”。
4) 尊重强者：真正完成任务时才收起利爪给认可。
5) 因果论：评价要指向未来后果；学习类未做=智商/阶层固化，健康类未做=身材/健康/寿命崩坏。
语调：
 - 毒舌隐喻、因果导向，冷嘲懒惰，肯定强者。
输出：直接给一句总评，50字左右，不要加引号，不要罗列数据。
`
      },
      {
        role: 'user',
        content: buildStatsPrompt(habits, logs)
      }
    ]
  };

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Deepseek request failed: ${res.status} ${text}`);
  }

  // Streaming mode
  if (payload.stream && res.body && onToken) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const dataStr = line.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(dataStr);
          const token =
            parsed?.choices?.[0]?.delta?.content ??
            parsed?.choices?.[0]?.message?.content ??
            '';
          if (token) {
            fullText += token;
            onToken(fullText);
          }
        } catch (err) {
          console.warn('Deepseek stream parse error:', err);
        }
      }
    }
    if (fullText.trim()) return fullText.trim();
  }

  // Non-stream fallback
  const data: DeepseekResponse = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Deepseek response empty');
  }
  return content;
}

export async function fetchCheckinRemark(input: {
  habit: Habit;
  isScheduledToday: boolean;
  missedDaysCount: number;
  weekDoneDays: number;
  todayTarget: number;
  todayCurrent: number;
  dailyStatus: '未完成' | '刚达标' | '已超额';
}): Promise<string> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  const apiUrl = import.meta.env.VITE_DEEPSEEK_API_URL || DEFAULT_API_URL;
  if (!apiKey) throw new Error('Missing VITE_DEEPSEEK_API_KEY');

  const payload = {
    model: 'deepseek-chat',
    temperature: 0.7,
    max_tokens: 120,
    messages: [
      {
        role: 'system',
        content: `你是毒舌黑猫教官。只看今天的进度，输出 20 字以内中文反馈，不加引号。`
      },
      {
        role: 'user',
        content: `
# 打卡快照
当前时间: ${new Date().getHours() <= 10 ? '早晨' : new Date().getHours() >= 22 ? '深夜' : '白天'}
习惯名称: ${input.habit.name}
习惯类型: ${input.habit.type}
今日进度: 当前 ${input.todayCurrent} / 目标 ${input.todayTarget}

# 判断逻辑
1) 坏习惯：只要点击就是错，直接讽刺意志力。
2) 好习惯进行中：current < target，提醒还差 {remaining} 次。
3) 好习惯已达标：current == target 用“刚好完成”，current > target 用“超额完成，给予鼓励”。
输出 30字，不要复读数据，不加引号。`
      }
    ]
  };

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Deepseek checkin failed: ${res.status} ${text}`);
  }

  const data: DeepseekResponse = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Deepseek checkin response empty');
  }
  return content.slice(0, 60);
}
