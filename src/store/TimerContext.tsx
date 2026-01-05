import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Timer, WeekHistory } from '../types';

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
    const [timers, setTimers] = useState<Timer[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_TIMERS);
        if (!saved) return [];

        // "Catch up" logic for reloads
        try {
            const loaded: Timer[] = JSON.parse(saved);
            const now = Date.now();
            return loaded.map(t => {
                if (t.isRunning && t.lastTickAt) {
                    const deltaMs = now - t.lastTickAt;
                    if (deltaMs > 0) {
                        const secondsPassed = Math.floor(deltaMs / 1000);
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
                return t;
            });
        } catch {
            return [];
        }
    });

    const [history, setHistory] = useState<WeekHistory[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
        return saved ? JSON.parse(saved) : [];
    });

    // Persistence
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify(timers));
    }, [timers]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    }, [history]);

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
                totalSeconds: t.totalSeconds,
                completedSeconds: t.totalSeconds - t.remainingSeconds,
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
