import { supabase } from '../supabase';

type StreamCallback = (text: string) => void;

/**
 * Sends a message to the AI agent via Supabase Edge Function
 * Handles SSE streaming for real-time responses
 */
export async function sendAgentMessage(
    text: string,
    onToken?: StreamCallback
): Promise<string> {
    let { data: sessionData } = await supabase.auth.getSession();
    let accessToken = sessionData?.session?.access_token;

    // Always attempt a refresh to avoid expired JWT
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshed?.session?.access_token) {
        accessToken = refreshed.session.access_token;
    } else if (!accessToken && refreshError) {
        throw new Error('未登录，请先登录');
    }

    if (!accessToken) {
        throw new Error('未登录，请先登录');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/agent-chat`;

    let response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ text }),
    });

    if (response.status === 401) {
        const retry = await supabase.auth.refreshSession();
        if (retry?.data?.session?.access_token) {
            accessToken = retry.data.session.access_token;
            response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({ text }),
            });
        }
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        if (response.status === 401) {
            await supabase.auth.signOut().catch(() => undefined);
            throw new Error('登录状态失效，请重新登录');
        }
        throw new Error(`请求失败: ${response.status} ${errorText}`);
    }

    // Handle SSE streaming response
    if (!response.body) {
        throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

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
                const token = parsed?.token || '';
                if (token) {
                    fullText += token;
                    onToken?.(fullText);
                }
            } catch {
                // Ignore parse errors for malformed chunks
            }
        }
    }

    return fullText.trim();
}

/**
 * Gets proactive greeting based on user's current habit status
 */
export function getProactiveGreeting(habits: Array<{
    type: 'GOOD' | 'BAD';
    todayCount?: number;
    todaysTarget?: number;
    name: string;
}>): string {
    const now = new Date();
    const hour = now.getHours();

    const goodHabits = habits.filter(h => h.type === 'GOOD');
    const scheduledToday = goodHabits.filter(h => (h.todaysTarget ?? 0) > 0);
    const completedToday = scheduledToday.filter(h => (h.todayCount ?? 0) >= (h.todaysTarget ?? 1));
    const partiallyDone = scheduledToday.filter(h =>
        (h.todayCount ?? 0) > 0 && (h.todayCount ?? 0) < (h.todaysTarget ?? 1)
    );
    const notStarted = scheduledToday.filter(h => (h.todayCount ?? 0) === 0);

    if (scheduledToday.length === 0) {
        return '今天没有计划？哼，不是借口可以摆烂。去设置几个习惯吧。';
    }

    // All completed
    if (completedToday.length === scheduledToday.length) {
        if (hour < 18) {
            return `不错，今天的任务全部完成了。继续保持，别得意。`;
        }
        return `今天表现尚可，全部达标。说说你是怎么做到的？`;
    }

    // Some partially done
    if (partiallyDone.length > 0) {
        const names = partiallyDone.slice(0, 2).map(h => h.name).join('、');
        return `${names} 还没达标，继续。别半途而废。`;
    }

    // Nothing started
    if (notStarted.length === scheduledToday.length) {
        if (hour < 12) {
            return '一个都没开始？早晨的时间最宝贵，先完成最简单的一个。';
        } else if (hour < 18) {
            return '太阳都快落山了，还一个没动？现在立刻开始。';
        }
        return '又是摆烂的一天吗？深夜了还一个没完成，明天必须早起补上。';
    }

    // Mixed state
    const remaining = scheduledToday.length - completedToday.length;
    const firstNotDone = notStarted[0] || partiallyDone[0];
    return `还差 ${remaining} 个习惯，先去完成「${firstNotDone?.name || '习惯'}」。`;
}
