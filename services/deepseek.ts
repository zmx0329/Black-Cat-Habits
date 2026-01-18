import { Habit, Log, HabitType } from '../types';

const DEFAULT_API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface DeepseekResponse {
  choices?: { message?: { content?: string }; delta?: { content?: string } }[];
}

const sanitizeRemark = (text: string) => {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/(总评|点评|评价|结论|总结)[：:]\s*/g, '');
  while (/^[\p{Script=Han}A-Za-z]{1,6}[：:]\s*/u.test(cleaned)) {
    cleaned = cleaned.replace(/^[\p{Script=Han}A-Za-z]{1,6}[：:]\s*/u, '');
  }
  return cleaned;
};

const readStream = async (
  res: Response,
  onToken: (text: string) => void
): Promise<string> => {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let rawBuffer = '';
  let outputText = '';
  let leading = true;
  const labelPrefixes = ['总评', '点评', '评价', '结论', '总结'];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.replace(/^data:\s*/, '');
      if (dataStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(dataStr);
        const token =
          parsed?.choices?.[0]?.delta?.content ??
          parsed?.choices?.[0]?.message?.content ??
          '';
        if (token) {
          rawBuffer += token;
          if (leading) {
            const colonIndex = rawBuffer.search(/[:：]/);
            if (colonIndex >= 0 && colonIndex <= 5) {
              rawBuffer = rawBuffer.slice(colonIndex + 1).replace(/^\s+/, '');
            } else if (labelPrefixes.some(prefix => prefix.startsWith(rawBuffer))) {
              continue;
            } else if (rawBuffer.length > 0) {
              outputText += rawBuffer;
              rawBuffer = '';
              leading = false;
            }
          } else if (rawBuffer.length > 0) {
            outputText += rawBuffer;
            rawBuffer = '';
          }
          if (!leading) {
            onToken(outputText);
          }
        }
      } catch (err) {
        console.warn('Deepseek stream parse error:', err);
      }
    }
  }

  if (leading && rawBuffer.length > 0) {
    outputText += rawBuffer;
  }
  return outputText.trim();
};

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
已完成（好习惯，含目标/描述）: ${goodCompleted.length ? goodCompleted.join('；') : '无'}
已触发（坏习惯，含描述）: ${badTriggered.length ? badTriggered.join('；') : '无'}
未完成（含未达标/未开始，带目标/描述）: ${pending.length ? pending.join('；') : '无'}
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
    temperature: 0.5,
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
输出：直接给总评，40字左右，不要加引号，不要罗列数据。必须中文通顺、自然口语、避免生造词或错别字。
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
  if (payload.stream && onToken) {
    const streamed = await readStream(res, onToken);
    if (streamed) return streamed;
  }

  // Non-stream fallback
  const data: DeepseekResponse = await res.json();
  const content = sanitizeRemark(data.choices?.[0]?.message?.content?.trim() || '');
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
}, onToken?: (text: string) => void): Promise<string> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  const apiUrl = import.meta.env.VITE_DEEPSEEK_API_URL || DEFAULT_API_URL;
  if (!apiKey) throw new Error('Missing VITE_DEEPSEEK_API_KEY');

  const payload = {
    model: 'deepseek-chat',
    temperature: 0.5,
    max_tokens: 120,
    stream: Boolean(onToken),
    messages: [
      {
        role: 'system',
        content: `你是毒舌黑猫教官。只看今天的进度，输出 40左右中文反馈，不加引号，要求通顺自然。`
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
输出40字左右，语句通顺，不要复读数据，不加引号。`
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

  if (payload.stream && onToken) {
    const streamed = await readStream(res, onToken);
    if (streamed) return streamed;
  }

  const data: DeepseekResponse = await res.json();
  const content = sanitizeRemark(data.choices?.[0]?.message?.content?.trim() || '');
  if (!content) {
    throw new Error('Deepseek checkin response empty');
  }
  return content.slice(0, 60);
}

export async function fetchHabitDetailRemark(input: {
  habit: Habit;
  weekCount: number;
  weekDoneDays: number;
  totalCount: number;
  activeDays: number;
  daysSinceStart: number;
  lastCheckin: string;
}, onToken?: (text: string) => void): Promise<string> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  const apiUrl = import.meta.env.VITE_DEEPSEEK_API_URL || DEFAULT_API_URL;
  if (!apiKey) throw new Error('Missing VITE_DEEPSEEK_API_KEY');

  const consistency = input.daysSinceStart > 0
    ? Math.round((input.activeDays / input.daysSinceStart) * 100)
    : 0;

  const payload = {
    model: 'deepseek-chat',
    temperature: 0.5,
    max_tokens: 160,
    stream: Boolean(onToken),
    messages: [
      {
        role: 'system',
        content:
          '你是毒舌但公正的习惯监督官。只点评当前习惯，结合本周+历史表现给一句话评价。好就鼓励，不好就批评，强调后果。中文通顺，不加引号，40字左右。'
      },
      {
        role: 'user',
        content: `
习惯名称: ${input.habit.name}
习惯类型: ${input.habit.type}
描述: ${input.habit.description || '无'}
本周打卡次数: ${input.weekCount}
本周打卡天数: ${input.weekDoneDays}
历史打卡总次数: ${input.totalCount}
历史活跃天数: ${input.activeDays}
坚持天数(从首次记录至今): ${input.daysSinceStart}
历史一致性: ${consistency}%
最近一次打卡: ${input.lastCheckin}
`
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
    throw new Error(`Deepseek habit detail failed: ${res.status} ${text}`);
  }

  if (payload.stream && onToken) {
    const streamed = await readStream(res, onToken);
    if (streamed) return streamed;
  }

  const data: DeepseekResponse = await res.json();
  const content = sanitizeRemark(data.choices?.[0]?.message?.content?.trim() || '');
  if (!content) {
    throw new Error('Deepseek habit detail response empty');
  }
  return content;
}

export async function fetchStatsDailyRemark(input: {
  dateLabel: string;
  summary: {
    totalHabits: number;
    scheduledHabits: number;
    completedHabits: number;
    pendingHabits: number;
    missedHabits: number;
    badTriggered: number;
  };
  details: {
    name: string;
    type: HabitType;
    target: number;
    current: number;
    status: string;
    description?: string;
  }[];
}, onToken?: (text: string) => void): Promise<string> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  const apiUrl = import.meta.env.VITE_DEEPSEEK_API_URL || DEFAULT_API_URL;
  if (!apiKey) throw new Error('Missing VITE_DEEPSEEK_API_KEY');

  const detailLines = input.details.map(item => {
    const targetPart = item.type === HabitType.BAD ? '坏习惯' : `目标${item.target}`;
    return `${item.name}(${targetPart})：${item.current}次，${item.status}`;
  }).join('；');

  const payload = {
    model: 'deepseek-chat',
    temperature: 0.5,
    max_tokens: 120,
    stream: Boolean(onToken),
    messages: [
      {
        role: 'system',
        content: '你是毒舌但公正的习惯监督官，只点评用户所选日期的计划完成情况。输出总结式话术，好的表扬鼓励，不好的要毒舌批评，强调严重后果，中文40字左右，不加引号。'

      },
      {
        role: 'user',
        content: `
日期: ${input.dateLabel}
当日习惯总数: ${input.summary.totalHabits}
当日计划数: ${input.summary.scheduledHabits}
已完成: ${input.summary.completedHabits}
未完成: ${input.summary.pendingHabits}
未开始: ${input.summary.missedHabits}
坏习惯触发: ${input.summary.badTriggered}
明细: ${detailLines || '无'}
请根据“计划次数 vs 实际完成”做总结式点评，只看这一天，不要提一周或历史。`
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
    throw new Error(`Deepseek stats day failed: ${res.status} ${text}`);
  }

  if (payload.stream && onToken) {
    const streamed = await readStream(res, onToken);
    if (streamed) return streamed;
  }

  const data: DeepseekResponse = await res.json();
  const content = sanitizeRemark(data.choices?.[0]?.message?.content?.trim() || '');
  if (!content) {
    throw new Error('Deepseek stats day response empty');
  }
  return content;
}
