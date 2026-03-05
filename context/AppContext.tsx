import React, { useState, createContext, useContext, useEffect } from 'react';
import { Habit, Log, Profile, HabitType } from '../types';
import { supabase } from '../supabase';

interface AppContextType {
    habits: Habit[];
    logs: Log[];
    loading: boolean;
    addHabit: (habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
    updateHabit: (habit: Habit) => Promise<void>;
    deleteHabit: (habitId: string) => Promise<void>;
    reorderHabits: (newHabits: Habit[]) => Promise<void>;
    addLog: (habitId: string, status?: 'completed' | 'missed' | 'skipped') => Promise<Log | null>;
    deleteLog: (logId: string) => Promise<void>;
    updateLogNote: (logId: string, note: string) => Promise<void>;
    user: Profile | null;
    login: (email: string, password: string) => Promise<{ error?: string }>;
    signup: (email: string, password: string, username: string) => Promise<{ error?: string }>;
    logout: () => Promise<void>;
    refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const isMissingColumn = (error: { message?: string } | null, column: string) => {
        const message = error?.message?.toLowerCase();
        return Boolean(message && message.includes(column.toLowerCase()) && message.includes('does not exist'));
    };

    const normalizeTimestamp = <T extends { timestamp?: string; created_at?: string }>(item: T) => ({
        ...item,
        timestamp: item.timestamp || item.created_at || new Date().toISOString()
    });

    const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const timeoutPromise = new Promise<T>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`${label} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });
        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    };

    // Check auth state on mount
    useEffect(() => {
        let mounted = true;

        // Safety timeout to avoid stuck loading on slow networks
        const timer = setTimeout(() => {
            if (mounted) {
                console.warn("‚è?Loading timed out");
                setLoading(false);
            }
        }, 10000);

        const checkAuth = async () => {
            try {
                console.log('üîê Checking authentication...');
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('‚ù?Session error:', sessionError);
                    setLoading(false);
                    return;
                }

                if (session?.user) {
                    console.log('‚ú?Session found, user ID:', session.user.id);

                    // Build profile from auth metadata immediately
                    const profile: Profile = {
                        id: session.user.id,
                        username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
                        avatar_url: session.user.user_metadata?.avatar_url || null,
                        created_at: session.user.created_at
                    };

                    console.log('‚ú?Profile built from metadata:', profile.username);
                    setUser(profile);

                    // Load data
                    try {
                        await fetchData(session.user.id);
                        console.log('‚ú?Initial data loaded');
                    } catch (fetchError) {
                        console.error('‚ù?Data fetch failed:', fetchError);
                    }

                    // Background: sync to profiles table (non-blocking)
                    syncProfileToDatabase(profile).catch(err =>
                        console.warn('Profile sync failed (non-critical):', err)
                    );
                } else {
                    console.log('‚ÑπÔ∏è  No active session');
                }
            } catch (error) {
                console.error("‚ù?Auth check failed:", error);
            } finally {
                if (mounted) {
                    console.log('‚ú?Auth check complete');
                    setLoading(false);
                    clearTimeout(timer);
                }
            }
        };

        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('üîÑ Auth state changed:', event);

            if (event === 'SIGNED_IN' && session?.user && mounted) {
                // Build profile immediately from metadata
                const profile: Profile = {
                    id: session.user.id,
                    username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
                    avatar_url: session.user.user_metadata?.avatar_url || null,
                    created_at: session.user.created_at
                };

                console.log('‚ú?Profile built from auth event:', profile.username);
                setUser(profile);

                // Load data
                try {
                    await fetchData(session.user.id);
                    setLoading(false);
                } catch (error) {
                    console.error('‚ù?Data fetch in auth change failed:', error);
                    setLoading(false);
                }

                // Background sync
                syncProfileToDatabase(profile).catch(err =>
                    console.warn('Profile sync failed (non-critical):', err)
                );
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setHabits([]);
                setLogs([]);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    // Helper function to sync profile to database (non-blocking)
    const syncProfileToDatabase = async (profile: Profile) => {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: profile.id,
                username: profile.username,
                avatar_url: profile.avatar_url,
                created_at: profile.created_at
            }, {
                onConflict: 'id'
            });

        if (error) {
            console.warn('Profile sync warning:', error.message);
        } else {
            console.log('‚ú?Profile synced to database');
        }
    };

    const fetchData = async (userId: string) => {
        console.log('üìä Fetching data for user:', userId);

        // Fetch habits
        console.log('üìä Fetching habits...');
        let { data: habitsData, error: habitsError } = await withTimeout(
            supabase
                .from('habits')
                .select('*')
                .eq('user_id', userId)
                .order('display_order', { ascending: true }),
            8000,
            'Fetch habits'
        );

        if (isMissingColumn(habitsError, 'display_order')) {
            ({ data: habitsData, error: habitsError } = await withTimeout(
                supabase
                    .from('habits')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: true }),
                8000,
                'Fetch habits (created_at fallback)'
            ));
        }

        if (habitsError) console.error('‚ù?Habits fetch error:', habitsError);
        else console.log('‚ú?Habits fetched:', habitsData?.length || 0);

        // Fetch logs
        console.log('üìä Fetching logs...');
        let { data: logsData, error: logsError } = await withTimeout(
            supabase
                .from('logs')
                .select('*')
                .eq('user_id', userId)
                .order('timestamp', { ascending: false }),
            8000,
            'Fetch logs'
        );

        if (isMissingColumn(logsError, 'timestamp')) {
            ({ data: logsData, error: logsError } = await withTimeout(
                supabase
                    .from('logs')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false }),
                8000,
                'Fetch logs (created_at fallback)'
            ));
        }

        if (logsError) console.error('‚ù?Logs fetch error:', logsError);
        else console.log('‚ú?Logs fetched:', logsData?.length || 0);

        console.log('üìä Calculating stats...');
        // Calculate today's count and this week's unique active days for each habit
        const now = new Date();
        const day = now.getDay(); // 0 is Sunday
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(now);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);

        const normalizedLogs = (logsData || []).map(normalizeTimestamp);

        const habitsWithCount = (habitsData || []).map(habit => {
            const habitLogs = normalizedLogs.filter(log => log.habit_id === habit.id && log.status === 'completed');

            const todayLogs = habitLogs.filter(log => {
                const logDate = new Date(log.timestamp);
                const current = new Date();
                return logDate.getDate() === current.getDate() &&
                    logDate.getMonth() === current.getMonth() &&
                    logDate.getFullYear() === current.getFullYear();
            });

            const thisWeekLogs = habitLogs.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate >= monday;
            });

            const uniqueDays = new Set(thisWeekLogs.map(log => {
                const d = new Date(log.timestamp);
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            }));

            const isTodayScheduled = habit.type === HabitType.BAD
                ? true
                : (Array.isArray(habit.frequency) ? habit.frequency.includes(day) : true);
            const todayCount = isTodayScheduled ? todayLogs.length : 0;
            const todaysTarget = habit.type === HabitType.BAD
                ? 0
                : (isTodayScheduled ? (habit.daily_goal || 0) : 0);

            return { ...habit, todayCount, todaysTarget, thisWeekDays: uniqueDays.size };
        });

        console.log('‚ú?Stats calculated');
        setHabits(habitsWithCount);
        setLogs(normalizedLogs);
        console.log('‚ú?Data fetch complete!');
    };

    const refreshData = async () => {
        if (user) {
            await fetchData(user.id);
        }
    };

    const login = async (email: string, password: string): Promise<{ error?: string }> => {
        // This function is no longer used - AuthPage handles login directly
        return {};
    };

    const signup = async (email: string, password: string, username: string): Promise<{ error?: string }> => {
        // This function is no longer used - AuthPage handles signup directly
        return {};
    };

    const logout = async () => {
        console.log('üîì Logging out...');
        try {
            await supabase.auth.signOut();
            // Clear all local state
            setUser(null);
            setHabits([]);
            setLogs([]);
            console.log('‚ú?Logout successful');
            // Force navigation to login page using hash router
            window.location.hash = '/login';
        } catch (error) {
            console.error('‚ù?Logout error:', error);
            // Even if there's an error, try to navigate to login
            window.location.hash = '/login';
        }
    };

    const addHabit = async (habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
        if (!user) return;
        // Place new habit at top by shifting existing display_order down
        const { data, error } = await supabase
            .from('habits')
            .insert({
                ...habit,
                user_id: user.id,
                display_order: 0
            })
            .select()
            .single();

        if (!error && data) {
            // Bump existing display_order to keep ordering stable
            await Promise.all(
                habits.map((h, idx) =>
                    supabase
                        .from('habits')
                        .update({ display_order: idx + 1 })
                        .eq('id', h.id)
                )
            );

            const updatedExisting = habits.map((h, idx) => ({ ...h, display_order: idx + 1 }));
            setHabits([{ ...data, todayCount: 0, todaysTarget: habit.daily_goal || 0 }, ...updatedExisting]);
        }
    };

    const updateHabit = async (updatedHabit: Habit) => {
        const { error } = await supabase
            .from('habits')
            .update({
                name: updatedHabit.name,
                type: updatedHabit.type,
                description: updatedHabit.description,
                frequency: updatedHabit.frequency,
                daily_goal: updatedHabit.daily_goal,
                reminders: updatedHabit.reminders,
                color: updatedHabit.color,
                icon: updatedHabit.icon,
                streak: updatedHabit.streak,
                display_order: updatedHabit.display_order,
                updated_at: new Date().toISOString()
            })
            .eq('id', updatedHabit.id);

        if (!error) {
            setHabits(habits.map(h => h.id === updatedHabit.id ? updatedHabit : h));
        }
    };

    const deleteHabit = async (habitId: string) => {
        const { error } = await supabase
            .from('habits')
            .delete()
            .eq('id', habitId);

        if (!error) {
            setHabits(habits.filter(h => h.id !== habitId));
            setLogs(logs.filter(l => l.habit_id !== habitId));
        }
    };

    const reorderHabits = async (newHabits: Habit[]) => {
        setHabits(newHabits);
        // Update display_order in database
        for (let i = 0; i < newHabits.length; i++) {
            await supabase
                .from('habits')
                .update({ display_order: i })
                .eq('id', newHabits[i].id);
        }
    };

    const addLog = async (habitId: string, status: 'completed' | 'missed' | 'skipped' = 'completed') => {
        if (!user) return null;
        const now = new Date().toISOString();
        let { data, error } = await supabase
            .from('logs')
            .insert({
                habit_id: habitId,
                user_id: user.id,
                status,
                timestamp: now
            })
            .select()
            .single();

        if (isMissingColumn(error, 'timestamp')) {
            ({ data, error } = await supabase
                .from('logs')
                .insert({
                    habit_id: habitId,
                    user_id: user.id,
                    status,
                    created_at: now
                })
                .select()
                .single());
        }

        if (!error && data) {
            const normalizedLog = normalizeTimestamp(data);
            setLogs([normalizedLog, ...logs]);
            // Update today count
            if (status === 'completed') {
                const today = new Date().toISOString().split('T')[0];
                setHabits(habits.map(h =>
                    h.id === habitId ? { ...h, todayCount: (h.todayCount || 0) + 1 } : h
                ));
            }
            await refreshData();
            return normalizedLog;
        }
        // Refresh fully to ensure proper calculation
        await refreshData();
        return null;
    };

    const deleteLog = async (logId: string) => {
        const log = logs.find(l => l.id === logId);
        const { error } = await supabase
            .from('logs')
            .delete()
            .eq('id', logId);

        if (!error) {
            setLogs(logs.filter(l => l.id !== logId));
            // Update today count
            if (log && log.status === 'completed') {
                // Just relying on refresh for accuracy
            }
            await refreshData();
        }
    };

    const updateLogNote = async (logId: string, note: string) => {
        const { error } = await supabase
            .from('logs')
            .update({ note })
            .eq('id', logId);

        if (!error) {
            setLogs(logs.map(l => l.id === logId ? { ...l, note } : l));
        }
    };

    return (
        <AppContext.Provider value={{
            habits, logs, loading, user,
            addHabit, updateHabit, deleteHabit, reorderHabits,
            addLog, deleteLog, updateLogNote,
            login, signup, logout, refreshData
        }}>
            {children}
        </AppContext.Provider>
    );
};


