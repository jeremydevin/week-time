import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Timer, WeekHistory, TimerType } from '../types';

interface TimerContextType {
    timers: Timer[];
    history: WeekHistory[];
    addTimer: (timer: Omit<Timer, 'id' | 'remainingSeconds' | 'isRunning' | 'lastTickAt'>) => void;
    updateTimer: (id: string, updates: Partial<Timer>) => void;
    deleteTimer: (id: string) => void;
    toggleTimer: (id: string) => void;
    deductTime: (id: string, seconds: number) => void;
    resetWeek: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const STORAGE_KEY_TIMERS = 'weektime_timers';
const STORAGE_KEY_HISTORY = 'weektime_history';

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [timers, setTimers] = useState<Timer[]>([]);
    const [history, setHistory] = useState<WeekHistory[]>([]);

    // Initial Load & Sync
    useEffect(() => {
        if (!user) {
            // Fallback to local storage if no user (or just clear? User asked for sync, implies login required? 
            // Let's support local-only for non-logged in, but maybe merge later? 
            // For now, simple: if logged in, use DB. If not, use LocalStorage.
            const saved = localStorage.getItem(STORAGE_KEY_TIMERS);
            if (saved) {
                try {
                    const loaded: Timer[] = JSON.parse(saved);
                    /* Catch up logic for local... same as before */
                    const now = Date.now();
                    const caughtUp = loaded.map(t => {
                        if (t.isRunning && t.lastTickAt) {
                            const deltaMs = now - t.lastTickAt;
                            if (deltaMs > 0) {
                                const secondsPassed = Math.floor(deltaMs / 1000);
                                if (t.type === 'stopwatch') {
                                    return {
                                        ...t,
                                        elapsedSeconds: (t.elapsedSeconds || 0) + secondsPassed,
                                        lastTickAt: t.lastTickAt + (secondsPassed * 1000)
                                    };
                                } else {
                                    const newRemaining = Math.max(0, t.remainingSeconds - secondsPassed);
                                    const isFinished = newRemaining <= 0;
                                    return {
                                        ...t,
                                        remainingSeconds: newRemaining,
                                        lastTickAt: isFinished ? undefined : t.lastTickAt + (secondsPassed * 1000),
                                        isRunning: !isFinished
                                    };
                                }
                            }
                        }
                        return t;
                    });
                    setTimers(caughtUp);
                } catch { setTimers([]) }
            }

            const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
            if (savedHistory) {
                try {
                    setHistory(JSON.parse(savedHistory));
                } catch {
                    setHistory([]);
                }
            }


            return;
        }

        // Fetch from Supabase
        const fetchRemote = async () => {
            const { data: timersData, error: timersError } = await supabase
                .from('timers')
                .select('*')
                .eq('user_id', user.id);

            if (timersData && !timersError) {
                // Map DB snake_case to camelCase
                const mapped: Timer[] = timersData.map((d: any) => ({
                    id: d.id,
                    title: d.title,
                    type: d.type as TimerType,
                    totalSeconds: d.total_seconds,
                    remainingSeconds: d.remaining_seconds,
                    elapsedSeconds: d.elapsed_seconds,
                    isRunning: d.is_running,
                    lastTickAt: d.last_tick_at ? parseInt(d.last_tick_at) : undefined, // BigInt comes as string?
                    color: d.color,
                    size: d.size as any,
                }));

                // Do catchup logic on fetched data too? Yes, essential.
                const now = Date.now();
                const caughtUp = mapped.map(t => {
                    if (t.isRunning && t.lastTickAt) {
                        const deltaMs = now - t.lastTickAt;
                        if (deltaMs > 0) {
                            const secondsPassed = Math.floor(deltaMs / 1000);
                            if (t.type === 'stopwatch') {
                                return {
                                    ...t,
                                    elapsedSeconds: (t.elapsedSeconds || 0) + secondsPassed,
                                    lastTickAt: t.lastTickAt + (secondsPassed * 1000)
                                };
                            } else {
                                const newRemaining = Math.max(0, t.remainingSeconds - secondsPassed);
                                const isFinished = newRemaining <= 0;
                                return {
                                    ...t,
                                    remainingSeconds: newRemaining,
                                    lastTickAt: isFinished ? undefined : t.lastTickAt + (secondsPassed * 1000),
                                    isRunning: !isFinished
                                };
                            }
                        }
                    }
                    return t;
                });
                setTimers(caughtUp);
            }

            const { data: historyData, error: historyError } = await supabase
                .from('week_history')
                .select('*')
                .eq('user_id', user.id)
                .order('week_start', { ascending: false });

            if (historyData && !historyError) {
                const mappedHistory: WeekHistory[] = historyData.map((d: any) => ({
                    id: d.id,
                    weekStart: d.week_start,
                    timersSnapshot: d.timers_snapshot,
                }));
                setHistory(mappedHistory);
            }

        };
        fetchRemote();
    }, [user]);

    // Persistence: Save to DB whenever timers change? 
    // Debouncing is better, or save on specific actions (add/delete/pause).
    // Ticking updates state every second -> too many writes.
    // Strategy: 
    // - Add/Delete/Update(Edit properties) -> Immediate Write
    // - Tick -> Local state only.
    // - Pause/Resume (Toggle) -> Immediate Write.
    // - Tab close -> Try to write? (Hard)
    // 
    // For this context migration, we'll keep local state as source of truth for UI, 
    // and push specific actions to DB. "LastTickAt" ensures consistency.

    // We need to override the actions to write to DB.

    // ... (Keep Ticking Logic local for performance, but careful about sync?)
    // If I open on another device, it won't see it running until I "save" the running state.
    // ToggleTimer saves the "isRunning" state and "lastTickAt". 
    // So as long as we save on Toggle, other devices can pick it up and calculate the delta. Perfect.

    // Need to update persistence effect to NOT auto-save everything if user is logged in
    // because ticking causes 1Hz updates.
    useEffect(() => {
        if (!user) {
            localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify(timers));
        }
        // If user exists, we rely on event-based persistence (add/toggle/etc) 
        // effectively disabling auto-save for ticks to save DB bandwidth.
    }, [timers, user]);

    useEffect(() => {
        if (!user) {
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        }
    }, [history, user]);

    // Ticking Logic
    useEffect(() => {
        const interval = setInterval(() => {
            setTimers(currentTimers => {
                // Optimization: if nothing is running, don't change state (prevents re-renders)
                if (!currentTimers.some(t => t.isRunning)) return currentTimers;

                const now = Date.now();
                return currentTimers.map(timer => {
                    if (timer.isRunning && timer.lastTickAt) {
                        const deltaMs = now - timer.lastTickAt;
                        // Only update if at least 1 second passed to simple integer updates
                        if (deltaMs >= 1000) {
                            const secondsPassed = Math.floor(deltaMs / 1000);

                            if (timer.type === 'stopwatch') {
                                return {
                                    ...timer,
                                    elapsedSeconds: (timer.elapsedSeconds || 0) + secondsPassed,
                                    lastTickAt: timer.lastTickAt + (secondsPassed * 1000)
                                };
                            } else {
                                // Goal Type
                                const newRemaining = timer.remainingSeconds - secondsPassed;

                                if (newRemaining <= 0) {
                                    return { ...timer, remainingSeconds: 0, isRunning: false, lastTickAt: undefined };
                                }

                                // Advance lastTickAt by the exact seconds we consumed to preserve ms precision (prevent drift)
                                return {
                                    ...timer,
                                    remainingSeconds: newRemaining,
                                    lastTickAt: timer.lastTickAt + (secondsPassed * 1000)
                                };
                            }
                        }
                    }
                    return timer;
                });
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const addTimer = async (newTimer: Omit<Timer, 'id' | 'remainingSeconds' | 'isRunning' | 'lastTickAt' | 'elapsedSeconds'>) => {
        const timer: Timer = {
            ...newTimer,
            id: crypto.randomUUID(),
            remainingSeconds: newTimer.totalSeconds,
            elapsedSeconds: 0,
            isRunning: false,
        };
        setTimers(prev => [...prev, timer]);

        if (user) {
            await supabase.from('timers').insert({
                id: timer.id,
                user_id: user.id,
                title: timer.title,
                type: timer.type,
                total_seconds: timer.totalSeconds,
                remaining_seconds: timer.remainingSeconds,
                elapsed_seconds: timer.elapsedSeconds,
                is_running: timer.isRunning,
                color: timer.color,
                size: timer.size
            });
        }
    };

    const updateTimer = async (id: string, updates: Partial<Timer>) => {
        setTimers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

        if (user) {
            // Map camelCase updates to snake_case for DB
            const dbUpdates: any = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.color !== undefined) dbUpdates.color = updates.color;
            if (updates.size !== undefined) dbUpdates.size = updates.size;
            if (updates.totalSeconds !== undefined) {
                dbUpdates.total_seconds = updates.totalSeconds;
                dbUpdates.remaining_seconds = updates.remainingSeconds; // Usually reset on edit? depends on logic. 
                // For simplicity, just update what's passed.
            }

            if (Object.keys(dbUpdates).length > 0) {
                await supabase.from('timers').update(dbUpdates).eq('id', id);
            }
        }
    };

    const deleteTimer = async (id: string) => {
        setTimers(prev => prev.filter(t => t.id !== id));
        if (user) {
            await supabase.from('timers').delete().eq('id', id);
        }
    };

    const toggleTimer = async (id: string) => {
        const timer = timers.find(t => t.id === id);
        if (!timer) return;

        const now = Date.now();
        const isStarting = !timer.isRunning;
        const nextTimer = {
            ...timer,
            isRunning: isStarting,
            lastTickAt: isStarting ? now : undefined
        };

        setTimers(prev => prev.map(t => t.id === id ? nextTimer : t));

        if (user) {
            await supabase.from('timers').update({
                is_running: nextTimer.isRunning,
                last_tick_at: nextTimer.lastTickAt || null, // Explicit null for DB
                remaining_seconds: nextTimer.remainingSeconds,
                elapsed_seconds: nextTimer.elapsedSeconds
            }).eq('id', id);
        }
    };

    const deductTime = async (id: string, seconds: number) => {
        const timer = timers.find(t => t.id === id);
        if (!timer) return;

        let nextTimer: Timer;

        if (timer.type === 'stopwatch') {
            nextTimer = {
                ...timer,
                elapsedSeconds: (timer.elapsedSeconds || 0) + seconds,
            };
        } else {
            const newRemaining = Math.max(0, timer.remainingSeconds - seconds);
            const isFinished = newRemaining <= 0;
            nextTimer = {
                ...timer,
                remainingSeconds: newRemaining,
                isRunning: isFinished ? false : timer.isRunning,
                lastTickAt: isFinished ? undefined : timer.lastTickAt
            };
        }

        setTimers(prev => prev.map(t => t.id === id ? nextTimer : t));

        if (user) {
            await supabase.from('timers').update({
                remaining_seconds: nextTimer.remainingSeconds,
                elapsed_seconds: nextTimer.elapsedSeconds,
                is_running: nextTimer.isRunning,
                last_tick_at: nextTimer.lastTickAt || null
            }).eq('id', id);
        }
    };

    const resetWeek = async () => {
        // Prepare snapshot
        const snapshotId = crypto.randomUUID();
        const weekStart = new Date().toISOString();

        // We need the CURRENT state of timers to snapshot. 
        // using 'timers' state directly is safe here as this is triggered by user action.
        const snapshotItems = timers.map(t => ({
            title: t.title,
            type: t.type,
            totalSeconds: t.totalSeconds,
            completedSeconds: t.type === 'stopwatch' ? (t.elapsedSeconds || 0) : (t.totalSeconds - t.remainingSeconds),
            color: t.color
        }));

        const snapshot: WeekHistory = {
            id: snapshotId,
            weekStart,
            timersSnapshot: snapshotItems
        };

        setHistory(prev => [snapshot, ...prev]);

        // Reset timers locally
        setTimers(prev => prev.map(t => ({
            ...t,
            remainingSeconds: t.totalSeconds,
            elapsedSeconds: 0,
            isRunning: false,
            lastTickAt: undefined,
        })));

        if (user) {
            // 1. Save History
            await supabase.from('week_history').insert({
                id: snapshotId,
                user_id: user.id,
                week_start: weekStart,
                snapshot_json: snapshotItems
            });

            // 2. Reset all timers in DB
            // We can do a bulk update or iterate. 
            // For simplicity/correctness with different totals: 
            // Ideally we'd run a SQL function, but here we can just update each or update all matching user_id IF they all reset to same logic (they don't, totalSeconds varies).
            // Actually, we can update is_running=false, elapsed_seconds=0, remaining_seconds=total_seconds.
            // Supabase supports update with value from another column? "remaining_seconds = total_seconds"?
            // Not via simple JS SDK syntax easily without RPC.
            // So we iterate updates or assume small number of timers.

            for (const t of timers) {
                await supabase.from('timers').update({
                    remaining_seconds: t.totalSeconds,
                    elapsed_seconds: 0,
                    is_running: false,
                    last_tick_at: null
                }).eq('id', t.id);
            }
        }
    };

    return (
        <TimerContext.Provider value={{ timers, history, addTimer, updateTimer, deleteTimer, toggleTimer, deductTime, resetWeek }}>
            {children}
        </TimerContext.Provider>
    );
};

export const useTimers = () => {
    const context = useContext(TimerContext);
    if (!context) throw new Error('useTimers must be used within a TimerProvider');
    return context;
};
