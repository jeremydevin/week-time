export type TimerSize = 'small' | 'medium' | 'large';
export type TimerType = 'goal' | 'stopwatch';

export interface Timer {
  id: string;
  type: TimerType;
  title: string;
  totalSeconds: number;     // For goal: target. For stopwatch: 0 (or ignored).
  remainingSeconds: number; // For goal: counts down. For stopwatch: ignored.
  elapsedSeconds: number;   // For stopwatch: counts up.
  isRunning: boolean;
  color: string;
  size: TimerSize;
  lastTickAt?: number;
}

export interface WeekHistory {
  id: string;
  weekStart: string;
  timersSnapshot: {
    title: string;
    type: TimerType;
    totalSeconds: number;
    completedSeconds: number;
    color: string;
  }[];
}
