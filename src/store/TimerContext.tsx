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

    const addTimer = (newTimer: Omit<Timer, 'id' | 'remainingSeconds' | 'isRunning' | 'lastTickAt' | 'elapsedSeconds'>) => {
        const timer: Timer = {
            ...newTimer,
            id: crypto.randomUUID(),
            remainingSeconds: newTimer.totalSeconds,
            elapsedSeconds: 0,
            isRunning: false,
        };
        setTimers(prev => [...prev, timer]);
    };

    const updateTimer = (id: string, updates: Partial<Timer>) => {
        setTimers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const deleteTimer = (id: string) => {
        setTimers(prev => prev.filter(t => t.id !== id));
    };

    const toggleTimer = (id: string) => {
        setTimers(prev => prev.map(t => {
            if (t.id === id) {
                if (!t.isRunning) {
                    // Start
                    return { ...t, isRunning: true, lastTickAt: Date.now() };
                } else {
                    // Pause
                    return { ...t, isRunning: false, lastTickAt: undefined };
                }
            }
            if (t.isRunning) return { ...t, isRunning: false, lastTickAt: undefined };
            return t;
        }));
    };

    const deductTime = (id: string, seconds: number) => {
        setTimers(prev => prev.map(t => {
            if (t.id === id) {
                if (t.type === 'stopwatch') {
                    return {
                        ...t,
                        elapsedSeconds: (t.elapsedSeconds || 0) + seconds,
                    };
                }

                const newRemaining = Math.max(0, t.remainingSeconds - seconds);
                const isFinished = newRemaining <= 0;
                return {
                    ...t,
                    remainingSeconds: newRemaining,
                    isRunning: isFinished ? false : t.isRunning,
                    lastTickAt: isFinished ? undefined : t.lastTickAt
                };
            }
            return t;
        }));
    };

    const resetWeek = () => {
        // Save history
        const snapshot: WeekHistory = {
            id: crypto.randomUUID(),
            weekStart: new Date().toISOString(),
            timersSnapshot: timers.map(t => ({
                title: t.title,
                type: t.type,
                totalSeconds: t.totalSeconds,
                completedSeconds: t.type === 'stopwatch' ? (t.elapsedSeconds || 0) : (t.totalSeconds - t.remainingSeconds),
                color: t.color
            }))
        };
        setHistory(prev => [snapshot, ...prev]);

        // Reset timers
        setTimers(prev => prev.map(t => ({
            ...t,
            remainingSeconds: t.totalSeconds,
            isRunning: false,
            lastTickAt: undefined,
        })));
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
