import React, { useState } from 'react';
import { useTimers } from '../store/TimerContext';
import TimerCard from './TimerCard';
import ManualTimeModal from './ManualTimeModal';
import type { TimerSize, TimerType } from '../types';

const Dashboard: React.FC = () => {
  const { timers, addTimer, deductTime } = useTimers();
  const [isAdding, setIsAdding] = useState(false);
  const [loggingTimerId, setLoggingTimerId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState('');
  const [color, setColor] = useState('#007aff');
  const [size, setSize] = useState<TimerSize>('small');
  const [type, setType] = useState<TimerType>('goal');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    if (type === 'goal' && !hours) return;

    addTimer({
      type,
      title,
      totalSeconds: type === 'goal' ? parseFloat(hours) * 3600 : 0,
      elapsedSeconds: 0,
      color,
      size,
    });

    setTitle('');
    setHours('');
    setIsAdding(false);
    setType('goal'); // reset
  };

  const handleLogTime = (seconds: number) => {
    if (loggingTimerId) {
      deductTime(loggingTimerId, seconds);
      setLoggingTimerId(null);
    }
  };

  const activeTimerForLog = timers.find(t => t.id === loggingTimerId);

  // Split timers
  const goalTimers = timers.filter(t => t.type === 'goal' || !t.type); // Default to goal if undefined
  const stopwatchTimers = timers.filter(t => t.type === 'stopwatch');

  return (
    <div className="dashboard">
      {/* Weekly Goals Section */}
      {(goalTimers.length > 0 || stopwatchTimers.length === 0) && (
        <section>
          {stopwatchTimers.length > 0 && <h2 className="section-title">Weekly Goals</h2>}
          <div className="dashboard-grid">
            {goalTimers.map(timer => (
              <TimerCard
                key={timer.id}
                timer={timer}
                onLogTime={() => setLoggingTimerId(timer.id)}
              />
            ))}

            {/* Add button included here */}
            <button className="add-card-btn" onClick={() => setIsAdding(true)}>
              <span className="plus-icon">+</span>
              <span className="add-text">Add Timer</span>
            </button>
          </div>
        </section>
      )}

      {/* Casual / Time Tracking Section */}
      {stopwatchTimers.length > 0 && (
        <section style={{ marginTop: '32px' }}>
          <h2 className="section-title">Time Tracking</h2>
          <div className="dashboard-grid">
            {stopwatchTimers.map(timer => (
              <TimerCard
                key={timer.id}
                timer={timer}
                onLogTime={() => setLoggingTimerId(timer.id)}
              />
            ))}
            {goalTimers.length === 0 && (
              <button className="add-card-btn" onClick={() => setIsAdding(true)}>
                <span className="plus-icon">+</span>
                <span className="add-text">Add Timer</span>
              </button>
            )}
          </div>
        </section>
      )}

      {activeTimerForLog && (
        <ManualTimeModal
          timer={activeTimerForLog}
          onClose={() => setLoggingTimerId(null)}
          onConfirm={handleLogTime}
        />
      )}

      {isAdding && (
        <div className="modal-overlay" onClick={() => setIsAdding(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>New Timer</h2>
            <form onSubmit={handleAdd}>
              <div className="form-group type-selector">
                <label>Type</label>
                <div className="toggle-bg">
                  <button
                    type="button"
                    className={type === 'goal' ? 'active' : ''}
                    onClick={() => setType('goal')}
                  >Goal</button>
                  <button
                    type="button"
                    className={type === 'stopwatch' ? 'active' : ''}
                    onClick={() => setType('stopwatch')}
                  >Time Tracking</button>
                </div>
              </div>

              <div className="form-group">
                <label>Activity Name</label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={type === 'goal' ? "e.g. Work" : "e.g. Cooking"}
                />
              </div>

              {type === 'goal' && (
                <div className="form-group">
                  <label>Weekly Goal (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                    placeholder="20"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Size</label>
                <div className="size-options">
                  {(['small', 'medium', 'large'] as TimerSize[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`size-opt ${size === s ? 'selected' : ''}`}
                      onClick={() => setSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  style={{ width: '100%', height: '40px' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsAdding(false)}>Cancel</button>
                <button type="submit" className="primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .section-title {
            font-size: 1.25rem;
            margin-bottom: 16px;
            color: var(--text-primary);
        }
        
        .type-selector {
           margin-bottom: 20px;
        }
        
        .toggle-bg {
           background: rgba(0,0,0,0.05);
           padding: 4px;
           border-radius: var(--radius-md);
           display: flex;
        }
        
        .toggle-bg button {
           flex: 1;
           border: none;
           background: none;
           padding: 8px;
           border-radius: var(--radius-sm);
           cursor: pointer;
           font-weight: 500;
           color: var(--text-secondary);
           transition: all 0.2s;
        }
        
        .toggle-bg button.active {
           background: var(--card-bg);
           color: var(--text-primary);
           box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); /* Slightly wider base */
          grid-auto-rows: 170px; /* Matching height */
          grid-auto-flow: dense; /* Fill gaps */
          gap: 16px;
        }
        
        .dashboard {
             padding-bottom: 80px; 
        }

        .add-card-btn {
          background: rgba(0,0,0,0.03);
          border: 2px dashed var(--text-secondary);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.2s;
          grid-column: span 1;
          grid-row: span 1;
          height: 100%; /* Ensure it fills the grid cell */
          box-sizing: border-box; /* Include border in height */
        }

        .add-card-btn:hover {
          background: rgba(0,0,0,0.06);
          border-color: var(--text-primary);
          color: var(--text-primary);
        }

        .plus-icon {
          font-size: 2rem;
          margin-bottom: 4px;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fadein 0.2s;
        }

        .modal {
          background: var(--card-bg);
          padding: 24px;
          border-radius: var(--radius-lg);
          width: 90%;
          max-width: 400px;
          box-shadow: var(--shadow-md);
          animation: slideup 0.3s;
        }

        .form-group {
          margin-bottom: 16px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        input {
          width: 100%;
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(0,0,0,0.1);
          font-size: 1rem;
          background: var(--bg-color);
          color: var(--text-primary);
        }

        .size-options {
          display: flex;
          gap: 8px;
        }

        .size-opt {
          flex: 1;
          padding: 8px;
          background: var(--bg-color);
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          cursor: pointer;
          text-transform: capitalize;
        }

        .size-opt.selected {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
          font-weight: 600;
          background: rgba(0,122,255,0.1);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .modal-actions button {
          padding: 10px 20px;
          border-radius: var(--radius-md);
          border: none;
          font-size: 1rem;
          cursor: pointer;
          background: var(--bg-color);
          color: var(--text-secondary);
        }

        .modal-actions button.primary {
          background: var(--accent-blue);
          color: white;
          font-weight: 600;
        }

        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideup { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        /* Responsive */
        @media (max-width: 480px) {
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr); /* 2 col on mobile usually looks best for widgets */
          }
           /* Override sizes on mobile to flow better? */
          .size-large { grid-column: span 2; }
          .size-medium { grid-column: span 2; }
          
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
