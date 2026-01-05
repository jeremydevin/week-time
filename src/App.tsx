import { useState } from 'react';
import { TimerProvider, useTimers } from './store/TimerContext';
import Dashboard from './components/Dashboard';
import History from './components/History';

const AppContent = () => {
  const [view, setView] = useState<'dashboard' | 'history'>('dashboard');
  const { resetWeek } = useTimers();

  const handleEndWeek = () => {
    if (confirm('Are you sure you want to end the week? This will save current progress to history and reset all timers.')) {
      resetWeek();
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>WeekTime</h1>
        <nav className="app-nav">
          <button
            className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-btn ${view === 'history' ? 'active' : ''}`}
            onClick={() => setView('history')}
          >
            History
          </button>
        </nav>
      </header>

      <main>
        {view === 'dashboard' ? <Dashboard /> : <History />}
      </main>

      {view === 'dashboard' && (
        <footer className="app-footer">
          <button className="end-week-btn" onClick={handleEndWeek}>
            End Week & Save History
          </button>
        </footer>
      )}

      <style>{`
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .app-nav {
          display: flex;
          background: rgba(0,0,0,0.05);
          padding: 4px;
          border-radius: var(--radius-md);
        }

        .nav-btn {
          background: none;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all 0.2s;
        }

        .nav-btn.active {
          background: var(--card-bg);
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
        }

        .app-footer {
          margin-top: 40px;
          display: flex;
          justify-content: center;
          padding-bottom: 40px;
        }

        .end-week-btn {
          background: none;
          border: 1px solid var(--accent-red);
          color: var(--accent-red);
          padding: 12px 24px;
          border-radius: var(--radius-lg);
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .end-week-btn:hover {
          background: rgba(255, 59, 48, 0.1);
        }
      `}</style>
    </div>
  );
};

function App() {
  return (
    <TimerProvider>
      <AppContent />
    </TimerProvider>
  );
}

export default App;
