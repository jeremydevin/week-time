import React from 'react';
import type { Timer } from '../types';
import { useTimers } from '../store/TimerContext';

interface TimerCardProps {
  timer: Timer;
  onLogTime: () => void;
}

const TimerCard: React.FC<TimerCardProps> = ({ timer, onLogTime }) => {
  const { toggleTimer, deleteTimer } = useTimers();

  const isStopwatch = timer.type === 'stopwatch';

  // For goal: progress is completed / total. For stopwatch: no progress bar really, or maybe just 100%?
  const progress = isStopwatch ? 0 : (timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds;
  const percentage = Math.min(100, Math.max(0, progress * 100)); // Still use this for goal

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`; // More precise for stopwatch
  };

  // Precise formatter for main display
  const mainTimeDisplay = () => {
    const seconds = isStopwatch ? (timer.elapsedSeconds || 0) : timer.remainingSeconds;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60; // Just seconds

    // For stopwatch, maybe always show seconds?
    if (h > 0) return <>{h}h {m}m</>;
    return <>{m}m <span style={{ fontSize: '0.8em', opacity: 0.8 }}>{s}s</span></>;
  };

  const total = formatTime(timer.totalSeconds);

  return (
    <div
      className={`timer-card size-${timer.size} ${timer.isRunning ? 'running' : ''}`}
      style={{ '--timer-color': timer.color } as React.CSSProperties}
    >
      <div className="timer-header">
        <h3>{timer.title}</h3>
        <button
          className="btn-icon delete-btn"
          onClick={(e) => { e.stopPropagation(); deleteTimer(timer.id); }}
          aria-label="Delete timer"
        >
          &times;
        </button>
      </div>

      <div className="timer-body">
        <div className="time-display">
          <span className="remaining">{mainTimeDisplay()}</span>
          {!isStopwatch && (
            <span className="total">/ {total}</span>
          )}
        </div>

        {!isStopwatch && (
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}

        {isStopwatch && (
          <div style={{ height: '8px' }} /> /* Spacer to match layout */
        )}
      </div>

      <div className="controls-row">
        <button className="toggle-btn" onClick={() => toggleTimer(timer.id)}>
          {timer.isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          className="log-btn"
          onClick={(e) => { e.stopPropagation(); onLogTime(); }}
          aria-label="Log time manually"
        >
          +
        </button>
      </div>

      <style>{`
        .timer-card {
          background: var(--card-bg);
          border-radius: var(--radius-lg);
          padding: 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
        }

        .timer-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .timer-card.running {
          border: 2px solid var(--timer-color);
        }

        /* Responsive Grid Spans */
        .size-small { grid-column: span 1; grid-row: span 1; }
        .size-medium { grid-column: span 2; grid-row: span 1; }
        .size-large { grid-column: span 2; grid-row: span 2; }

        .timer-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
        }

        .timer-header h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
          color: var(--text-primary);
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .size-large .timer-header h3,
        .size-medium .timer-header h3 {
            font-size: 1.1rem;
        }

        .btn-icon.delete-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
          opacity: 0.6;
        }

        .btn-icon.delete-btn:hover { opacity: 1; color: var(--destructive); }
        
        .timer-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 6px;
          min-height: 0; /* Allow flex shrinking */
        }

        .time-display {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap; /* allow wrapping if super tight */
          gap: 4px;
        }

        .remaining {
          font-size: 1.2rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        
        .size-medium .remaining,
        .size-large .remaining {
             font-size: 1.5rem;
        }

        .total {
          font-size: 0.8rem;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .progress-bar-container {
          background: rgba(0,0,0,0.05);
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background-color: var(--timer-color);
          transition: width 1s linear;
        }

        .controls-row {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .toggle-btn {
          background: var(--bg-color);
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          color: var(--timer-color);
          cursor: pointer;
          flex: 1;
          transition: background 0.2s;
        }
        
        .toggle-btn:hover {
          background: rgba(0,0,0,0.05);
        }
        
        .log-btn {
          background: var(--bg-color);
          border: none;
          width: 40px; 
          border-radius: 20px;
          font-size: 1.2rem;
          color: var(--timer-color);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .log-btn:hover {
           background: rgba(0,0,0,0.05);
        }
        
        /* Dark mode adj */
        @media (prefers-color-scheme: dark) {
          .toggle-btn, .log-btn {
             background: rgba(255,255,255,0.1);
          }
          .progress-bar-container {
             background: rgba(255,255,255,0.1);
          }
        }
      `}</style>
    </div>
  );
};

export default TimerCard;
