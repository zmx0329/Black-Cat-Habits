import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Habit = {
  id: string;
  name: string;
  type: 'GOOD' | 'BAD';
  description?: string;
  frequency?: number[];
  daily_goal?: number;
  created_at?: string;
  updated_at?: string;
};

type Log = {
  id: string;
  habit_id: string;
  user_id?: string;
  status: 'completed' | 'missed' | 'skipped';
  timestamp?: string;
  created_at?: string;
  note?: string;
};

type ChatMessage = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp?: string;
  created_at?: string;
};

const DEFAULT_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type, apikey",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });

const sseResponse = () => {
  const stream = new TransformStream();
  return {
    stream, response: new Response(stream.readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    })
  };
};

const isMissingColumn = (message?: string, column?: string) =>
  Boolean(message && column && message.toLowerCase().includes(column.toLowerCase()) && message.toLowerCase().includes('does not exist'));

const isMissingTable = (message?: string, table?: string) =>
  Boolean(message && table && message.toLowerCase().includes(table.toLowerCase()) && message.toLowerCase().includes('does not exist'));

const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatWeekdays = (frequency: number[] = []) => {
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  if (!frequency.length) return '未设置';
  return frequency.map(day => labels[day] || `周${day}`).join('、');
};

const parseDateFromText = (text: string, fallbackYear: number) => {
  const isoMatch = text.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const cnMatch = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (cnMatch) {
    const month = Number(cnMatch[1]);
    const day = Number(cnMatch[2]);
    const date = new Date(fallbackYear, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

const getNowContext = () => {
  const now = new Date();
  const hour = now.getHours();
  const timeLabel =
    hour < 6 ? '深夜' : hour < 11 ? '早晨' : hour < 18 ? '白天' : hour < 22 ? '傍晚' : '深夜';
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return {
    now,
    hour,
    timeLabel,
    weekday: weekdays[now.getDay()],
    timeText: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  };
};

const buildRangeStats = (habits: Habit[], logs: Log[], start: Date, end: Date) => {
  const dateKeys: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (cursor <= endDate) {
    dateKeys.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const logsByDate = new Map<string, Log[]>();
  logs.forEach(log => {
    const key = toLocalDateKey(new Date(log.timestamp || log.created_at || ''));
    if (!logsByDate.has(key)) logsByDate.set(key, []);
    logsByDate.get(key)?.push(log);
  });

  const dayStats = dateKeys.map(dateKey => {
    const dayLogs = logsByDate.get(dateKey) || [];
    const counts = new Map<string, number>();
    dayLogs.forEach(log => {
      if (log.status !== 'completed') return;
      counts.set(log.habit_id, (counts.get(log.habit_id) || 0) + 1);
    });

    const dateObj = new Date(dateKey);
    const dayIndex = dateObj.getDay();
    let scheduledHabits = 0;
    let completedHabits = 0;
    let goodTargetTotal = 0;
    let goodDoneTotal = 0;
    let badTriggeredTotal = 0;
    let badTriggeredHabits = 0;

    habits.forEach(habit => {
      const count = counts.get(habit.id) || 0;
      if (habit.type === 'BAD') {
        badTriggeredTotal += count;
        if (count > 0) badTriggeredHabits += 1;
        return;
      }
      const isScheduled = Array.isArray(habit.frequency) ? habit.frequency.includes(dayIndex) : true;
      const target = isScheduled ? (habit.daily_goal || 0) : 0;
      if (target > 0) {
        scheduledHabits += 1;
        goodTargetTotal += target;
        goodDoneTotal += count;
        if (count >= target) completedHabits += 1;
      }
    });

    const weekdayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return {
      date: dateKey,
      weekday: weekdayLabels[dateObj.getDay()],
      scheduledHabits,
      completedHabits,
      goodTargetTotal,
      goodDoneTotal,
      badTriggeredTotal,
      badTriggeredHabits
    };
  });

  const total = dayStats.reduce(
    (acc, day) => {
      acc.scheduledHabits += day.scheduledHabits;
      acc.completedHabits += day.completedHabits;
      acc.goodTargetTotal += day.goodTargetTotal;
      acc.goodDoneTotal += day.goodDoneTotal;
      acc.badTriggeredTotal += day.badTriggeredTotal;
      return acc;
    },
    {
      scheduledHabits: 0,
      completedHabits: 0,
      goodTargetTotal: 0,
      goodDoneTotal: 0,
      badTriggeredTotal: 0
    }
  );

  return { dayStats, total };
};

const buildChatContext = (input: {
  userText: string;
  habits: Habit[];
  logs: Log[];
  messages: ChatMessage[];
  memories: { id: string; text: string; created_at?: string }[];
}) => {
  const { userText, habits, logs, messages, memories } = input;
  const { timeLabel, weekday, timeText, now } = getNowContext();
  const todayKey = toLocalDateKey(now);
  const dayIndex = now.getDay();
  const habitMap = new Map(habits.map(h => [h.id, h]));

  const todayLogs = logs.filter(log => toLocalDateKey(new Date(log.timestamp || log.created_at || '')) === todayKey);
  const todayCounts = new Map<string, number>();
  todayLogs.forEach(log => {
    if (log.status !== 'completed') return;
    todayCounts.set(log.habit_id, (todayCounts.get(log.habit_id) || 0) + 1);
  });

  let plannedCount = 0;
  let completedHabits = 0;
  let goodTargetTotal = 0;
  let goodDoneTotal = 0;
  let remainingTotal = 0;
  let badTriggeredTotal = 0;
  let badTriggeredHabits = 0;

  const habitDetails = habits.map(habit => {
    const count = todayCounts.get(habit.id) || 0;
    if (habit.type === 'BAD') {
      if (count > 0) badTriggeredHabits += 1;
      badTriggeredTotal += count;
      return {
        name: habit.name,
        type: habit.type,
        description: habit.description || '无',
        plan: '每天都要管',
        today: `${count} 次触发`
      };
    }

    const isScheduledToday = Array.isArray(habit.frequency) ? habit.frequency.includes(dayIndex) : true;
    const target = isScheduledToday ? (habit.daily_goal || 0) : 0;
    if (target > 0) {
      plannedCount += 1;
      goodTargetTotal += target;
      goodDoneTotal += count;
      remainingTotal += Math.max(0, target - count);
      if (count >= target) completedHabits += 1;
    }

    return {
      name: habit.name,
      type: habit.type,
      description: habit.description || '无',
      plan: `周计划: ${formatWeekdays(habit.frequency)}，日目标 ${habit.daily_goal || 0} 次`,
      today: isScheduledToday ? `${count}/${target} 次` : `未安排，完成 ${count} 次`
    };
  });

  const weekStart = new Date(now);
  const diff = now.getDate() - dayIndex + (dayIndex === 0 ? -6 : 1);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);

  const weekStats = buildRangeStats(habits, logs, weekStart, now);
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
  const lastWeekStats = buildRangeStats(habits, logs, lastWeekStart, lastWeekEnd);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStats = buildRangeStats(habits, logs, monthStart, now);

  const last30Start = new Date(now);
  last30Start.setDate(last30Start.getDate() - 29);
  const last30Stats = buildRangeStats(habits, logs, last30Start, now);

  const habitCounts = new Map<string, number>();
  logs.forEach(log => {
    if (log.status !== 'completed') return;
    const habit = habitMap.get(log.habit_id);
    if (!habit) return;
    habitCounts.set(log.habit_id, (habitCounts.get(log.habit_id) || 0) + 1);
  });

  const goodRank = habits
    .filter(h => h.type === 'GOOD')
    .map(h => ({ name: h.name, count: habitCounts.get(h.id) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const badRank = habits
    .filter(h => h.type === 'BAD')
    .map(h => ({ name: h.name, count: habitCounts.get(h.id) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const badWorstDays = [...last30Stats.dayStats]
    .filter(day => day.badTriggeredTotal > 0)
    .sort((a, b) => b.badTriggeredTotal - a.badTriggeredTotal)
    .slice(0, 3);

  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.timestamp || b.created_at || '').getTime() - new Date(a.timestamp || a.created_at || '').getTime())
    .slice(0, 20)
    .map(log => {
      const habit = habitMap.get(log.habit_id);
      const time = new Date(log.timestamp || log.created_at || '').toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      return `${toLocalDateKey(new Date(log.timestamp || log.created_at || ''))} ${time} ${habit?.name || '未知习惯'}(${habit?.type === 'BAD' ? '坏' : '好'}): ${log.status}${log.note ? ` | 记录:${log.note}` : ''}`;
    });

  const recentConversation = messages
    .slice(-6)
    .map(msg => `${msg.sender === 'ai' ? '教官' : '用户'}: ${msg.text}`)
    .join('\n');

  const bestWeekDay = [...weekStats.dayStats]
    .filter(day => day.scheduledHabits > 0)
    .sort((a, b) => (b.completedHabits / b.scheduledHabits) - (a.completedHabits / a.scheduledHabits))[0];
  const worstWeekDay = [...weekStats.dayStats]
    .filter(day => day.scheduledHabits > 0)
    .sort((a, b) => (a.completedHabits / a.scheduledHabits) - (b.completedHabits / b.scheduledHabits))[0];

  const queryDate = parseDateFromText(userText, now.getFullYear());
  let queryInsights = '';
  if (queryDate) {
    const key = toLocalDateKey(queryDate);
    const dayLogs = logs.filter(log => toLocalDateKey(new Date(log.timestamp || log.created_at || '')) === key);
    const detail = dayLogs.map(log => {
      const habit = habitMap.get(log.habit_id);
      const time = new Date(log.timestamp || log.created_at || '').toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      return `${time} ${habit?.name || '未知习惯'}(${habit?.type === 'BAD' ? '坏' : '好'}) ${log.status}${log.note ? ` | ${log.note}` : ''}`;
    });
    queryInsights += `\n# 指定日期 ${key} 记录\n${detail.length ? detail.join('；') : '无记录'}`;
  }

  if (/本周|这周/.test(userText)) {
    queryInsights += `\n# 本周概览\n${weekStats.dayStats
      .map(day => `${day.date} ${day.weekday} | 好习惯达标 ${day.completedHabits}/${day.scheduledHabits} | 次数 ${day.goodDoneTotal}/${day.goodTargetTotal} | 坏习惯 ${day.badTriggeredTotal} 次`)
      .join('\n')}`;
  }

  if (/本月|这个月/.test(userText)) {
    queryInsights += `\n# 本月累计\n好习惯次数 ${monthStats.total.goodDoneTotal}/${monthStats.total.goodTargetTotal}，达标习惯 ${monthStats.total.completedHabits}/${monthStats.total.scheduledHabits}，坏习惯触发 ${monthStats.total.badTriggeredTotal} 次`;
  }

  if (/最多|最勤|最高/.test(userText) && /习惯/.test(userText)) {
    queryInsights += `\n# 习惯排行\n好习惯: ${goodRank.map(item => `${item.name} ${item.count}次`).join('；') || '无'}\n坏习惯: ${badRank.map(item => `${item.name} ${item.count}次`).join('；') || '无'}`;
  }

  if (/坏习惯.*严重|最严重/.test(userText)) {
    queryInsights += `\n# 坏习惯高发日(近30天)\n${badWorstDays.length
      ? badWorstDays.map(day => `${day.date} ${day.weekday} ${day.badTriggeredTotal} 次`).join('；')
      : '无'}`;
  }

  if (/记录|总结/.test(userText)) {
    const notes = recentLogs.filter(item => item.includes('记录:'));
    queryInsights += `\n# 最近记录(含备注)\n${notes.length ? notes.slice(0, 8).join('；') : '无备注记录'}`;
  }

  return `
# 用户问题
${userText}

# 时间
当前时间: ${timeText}
时间标签: ${timeLabel}
今天周几: ${weekday}

# 今日状态
好习惯: 已达标 ${completedHabits}/${plannedCount}，完成次数 ${goodDoneTotal}/${goodTargetTotal}，剩余 ${remainingTotal}
坏习惯: 触发 ${badTriggeredTotal} 次 / ${badTriggeredHabits} 项

# 习惯计划与今日执行
${habitDetails.map(h => `${h.name}(${h.type === 'BAD' ? '坏' : '好'}): ${h.plan} | 今日 ${h.today} | 描述:${h.description}`).join('\n')}

# 本周概览(从周一至今)
${weekStats.dayStats.map(day => `${day.date} ${day.weekday} | 好习惯达标 ${day.completedHabits}/${day.scheduledHabits} | 次数 ${day.goodDoneTotal}/${day.goodTargetTotal} | 坏习惯 ${day.badTriggeredTotal} 次`).join('\n')}

# 上周概览
${lastWeekStats.dayStats.map(day => `${day.date} ${day.weekday} | 好习惯达标 ${day.completedHabits}/${day.scheduledHabits} | 次数 ${day.goodDoneTotal}/${day.goodTargetTotal} | 坏习惯 ${day.badTriggeredTotal} 次`).join('\n') || '无'}

# 本周最好/最差日
最好: ${bestWeekDay ? `${bestWeekDay.date} ${bestWeekDay.weekday} 达标 ${bestWeekDay.completedHabits}/${bestWeekDay.scheduledHabits}` : '无'}
最差: ${worstWeekDay ? `${worstWeekDay.date} ${worstWeekDay.weekday} 达标 ${worstWeekDay.completedHabits}/${worstWeekDay.scheduledHabits}` : '无'}

# 本月累计
好习惯次数 ${monthStats.total.goodDoneTotal}/${monthStats.total.goodTargetTotal}，达标习惯 ${monthStats.total.completedHabits}/${monthStats.total.scheduledHabits}，坏习惯触发 ${monthStats.total.badTriggeredTotal} 次

# 近30天坏习惯高发日
${badWorstDays.length ? badWorstDays.map(day => `${day.date} ${day.weekday} ${day.badTriggeredTotal} 次`).join('；') : '无'}

# 习惯排行(历史累计)
好习惯: ${goodRank.map(item => `${item.name} ${item.count}次`).join('；') || '无'}
坏习惯: ${badRank.map(item => `${item.name} ${item.count}次`).join('；') || '无'}

# 最近记录(20条)
${recentLogs.join('\n') || '无记录'}

# 最近对话(6条)
${recentConversation || '无'}

# 长期记忆(20条内)
${memories.length ? memories.map(item => item.text).join('；') : '无'}

${queryInsights}
`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse({ ok: true });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const apiUrl = Deno.env.get('DEEPSEEK_API_URL') || DEFAULT_API_URL;

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Missing Supabase env' }, 500);
  }
  if (!apiKey) {
    return jsonResponse({ error: 'Missing Deepseek API key' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  console.log('Auth header present:', authHeader ? 'Yes' : 'No', 'Length:', authHeader.length);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  console.log('getUser result:', user ? 'User found' : 'No user', 'Error:', userError?.message || 'None');

  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized', details: userError?.message }, 401);
  }

  const body = await req.json().catch(() => null);
  const text = body?.text?.toString().trim();
  if (!text) {
    return jsonResponse({ error: 'Missing text' }, 400);
  }

  const { data: habitsData, error: habitsError } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true });

  if (habitsError) {
    return jsonResponse({ error: habitsError.message || 'Failed to load habits' }, 500);
  }

  let logsData: Log[] | null = null;
  let logsError = null as { message?: string } | null;
  ({ data: logsData, error: logsError } = await supabase
    .from('logs')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: false }));

  if (logsError && isMissingColumn(logsError.message, 'timestamp')) {
    ({ data: logsData, error: logsError } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }));
  }

  if (logsError) {
    return jsonResponse({ error: logsError.message || 'Failed to load logs' }, 500);
  }

  let messagesData: ChatMessage[] | null = null;
  let messagesError = null as { message?: string } | null;
  ({ data: messagesData, error: messagesError } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: true })
    .limit(30));

  if (messagesError && isMissingColumn(messagesError.message, 'timestamp')) {
    ({ data: messagesData, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(30));
  }

  if (messagesError) {
    return jsonResponse({ error: messagesError.message || 'Failed to load messages' }, 500);
  }

  let memoriesData: { id: string; text: string; created_at?: string }[] | null = null;
  let memoriesError = null as { message?: string } | null;
  ({ data: memoriesData, error: memoriesError } = await supabase
    .from('agent_memories')
    .select('id, text, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20));

  if (memoriesError) {
    if (isMissingTable(memoriesError.message, 'agent_memories')) {
      memoriesData = [];
    } else {
      return jsonResponse({ error: memoriesError.message || 'Failed to load memories' }, 500);
    }
  }

  const habits = (habitsData || []) as Habit[];
  const logs = (logsData || []).map(log => ({ ...log, timestamp: log.timestamp || log.created_at })) as Log[];
  const messages = (messagesData || []).map(msg => ({ ...msg, timestamp: msg.timestamp || msg.created_at })) as ChatMessage[];
  const memories = memoriesData || [];

  const systemPrompt = `
你是“猫教官”，一个习惯陪跑教练，不是闲聊机器人。
风格：直白、锐评、带一点黑色幽默，核心永远落到“下一步怎么做”。奖惩分明：对结果负责，对努力认可。用自然口语说话，像真人教练。

铁规则：
1) 以数据为准：只允许使用“数据快照”里的事实，不允许凭空编造；若数据不足，先要求查询或补充。
2) 回复优先级：先给最小行动 → 再讲原因 → 再给方法/计划。
3) 问题模糊时，用 1-2 个关键追问把问题变具体。
4) 复盘必须对比：本周 vs 上周（若无上周数据，用本周内最好/最差对比）。
5) 坏习惯：强调“触发-替代-阻断”；好习惯：强调“降低启动成本-环境设计-奖励机制”。
6) 不输出表格/代码/结构化字段，只要自然语言清晰表达。
7) 合规与边界：不做医疗诊断、不做心理治疗式建议；出现极端内容要提示寻求现实帮助。

你必须严格遵守以上规则，且只能基于提供的数据回答。`;

  const userContext = buildChatContext({
    userText: text,
    habits,
    logs,
    messages,
    memories,
  });

  const payload = {
    model: 'deepseek-chat',
    temperature: 0.4,
    max_tokens: 700,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt.trim() },
      { role: 'user', content: userContext },
      {
        role: 'system',
        content: `如果你识别出应写入长期记忆的内容，必须在全部回复末尾额外输出：\\nMEMORY: {\"items\":[\"...\"]}\\n记忆只写稳定偏好/触发/有效策略/约束条件。`
      }
    ]
  };

  const aiRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!aiRes.ok) {
    const text = await aiRes.text().catch(() => '');
    return jsonResponse({ error: `AI failed: ${aiRes.status} ${text}` }, 502);
  }

  const { stream, response } = sseResponse();
  const writer = stream.writable.getWriter();
  if (!writer || !aiRes.body) {
    return jsonResponse({ error: 'Stream not supported' }, 502);
  }

  const reader = aiRes.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const encoder = new TextEncoder();
  let buffer = '';
  let fullText = '';
  let hold = '';
  let suppress = false;
  const holdback = 48;
  const marker = 'MEMORY:';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\\s*/, '');
        if (dataStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(dataStr);
          const token = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content ?? '';
          if (!token) continue;
          fullText += token;

          if (suppress) continue;
          hold += token;
          const markerIndex = hold.indexOf(marker);
          if (markerIndex !== -1) {
            const visible = hold.slice(0, markerIndex);
            if (visible) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ token: visible })}\\n\\n`));
            }
            suppress = true;
            hold = hold.slice(markerIndex);
            continue;
          }

          if (hold.length > holdback) {
            const visible = hold.slice(0, hold.length - holdback);
            hold = hold.slice(-holdback);
            if (visible) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ token: visible })}\\n\\n`));
            }
          }
        } catch (err) {
          console.warn('Stream parse error', err);
        }
      }
    }
  }

  if (!suppress && hold) {
    await writer.write(encoder.encode(`data: ${JSON.stringify({ token: hold })}\\n\\n`));
  }

  const memoryMatch = fullText.match(/MEMORY:\\s*(\\{[\\s\\S]*?\\})/);
  if (memoryMatch) {
    try {
      const parsed = JSON.parse(memoryMatch[1]);
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      const filtered = items
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 1)
        .slice(0, 5);
      if (filtered.length) {
        await supabase.from('agent_memories').insert(
          filtered.map(text => ({ user_id: user.id, text }))
        );
      }
    } catch (err) {
      console.warn('Memory parse failed', err);
    }
  }

  await writer.write(new TextEncoder().encode('data: [DONE]\\n\\n'));
  await writer.close();
  return response;
});
