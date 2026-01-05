import { useState } from 'react';
import { TimerProvider } from './store/TimerContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Login from './components/Login';
import './index.css';

const AppContent: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [view, setView] = useState<'dashboard' | 'history'>('dashboard');

  if (loading) return <div className="loading">Loading...</div>;

  // Simple auth gate: if not logged in, show login.
  // Or allow guest mode? User asked for sync/login, so let's enforce or offer login.
  // Actually, let's offer Login if not logged in, but maybe allow guest use? 
  // For now, let's keep it simple: Show Dashboard if logged in OR guest (but we haven't built guest toggle).
  // Let's just show Login if !user for the "Sync" feature, but maybe we want a "Continue as Guest" or just force login for now since user specifically asked for "Setup auth so users can login".

  if (!user) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>WeekTime</h1>
        </header>
        <main>
          <Login />
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>WeekTime</h1>
        <div className="header-actions">
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
          <button onClick={() => signOut()} className="text-btn sign-out-btn">Sign Out</button>
        </div>
      </header>

      <main>
        {view === 'dashboard' ? <Dashboard /> : <History />}
      </main>

      <style>{`
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .sign-out-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 0.9rem;
            padding: 4px 8px;
            white-space: nowrap;
        }
        .sign-out-btn:hover {
            color: var(--text-primary);
            text-decoration: underline;
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
      `}</style>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <AppContent />
      </TimerProvider>
    </AuthProvider>
  );
}

export default App;
