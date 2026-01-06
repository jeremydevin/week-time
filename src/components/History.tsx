import React from 'react';
import { useTimers } from '../store/TimerContext';

const History: React.FC = () => {
  const { history } = useTimers();

  if (history.length === 0) {
    return (
      <div className="empty-history">
        <p>No history yet. Complete a week to see your summary!</p>
      </div>
    );
  }

  return (
    <div className="history-container">
      {history.map(week => (
        <div key={week.id} className="history-card">
          <div className="history-header">
            <h3>Week of {new Date(week.weekStart).toLocaleDateString()}</h3>
          </div>
          <div className="history-items">
            {(week.timersSnapshot || []).map((timer, idx) => (
              <div key={idx} className="history-item">
                <div className="history-item-info">
                  <div
                    className="color-dot"
                    style={{ backgroundColor: timer.color }}
                  />
                  <span className="item-title">{timer.title}</span>
                </div>
                <div className="item-stats">
                  <span className="completed">
                    {Math.floor(timer.completedSeconds / 3600)}h {Math.floor((timer.completedSeconds % 3600) / 60)}m
                  </span>
                  <span className="total">
                    / {Math.floor(timer.totalSeconds / 3600)}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <style>{`
        .empty-history {
          text-align: center;
          padding: 40px;
          color: var(--text-secondary);
        }

        .history-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 40px;
        }

        .history-card {
          background: var(--card-bg);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--shadow-sm);
        }

        .history-header {
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          padding-bottom: 8px;
        }

        .history-header h3 {
          font-size: 1.1rem;
          margin: 0;
        }

        .history-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .history-item-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .item-title {
          font-weight: 500;
        }

        .item-stats {
          font-variant-numeric: tabular-nums;
        }

        .completed {
          font-weight: 600;
        }

        .total {
          color: var(--text-secondary);
          font-size: 0.9em;
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
};

export default History;
