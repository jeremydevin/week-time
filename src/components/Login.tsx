import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin,
            },
        });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Check your email for the magic link!' });
        }
        setLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Welcome Back</h1>
                <p>Sign in to sync your timers.</p>

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="primary">
                        {loading ? 'Sending link...' : 'Send Magic Link'}
                    </button>
                </form>

                {message && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>

            <style>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
        }
        .login-card {
          background: var(--card-bg);
          padding: 32px;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        h1 {
            margin-bottom: 8px;
            font-size: 1.5rem;
        }
        p {
            color: var(--text-secondary);
            margin-bottom: 24px;
        }
        .form-group {
            margin-bottom: 16px;
        }
        button.primary {
            width: 100%;
            padding: 12px;
            background: var(--accent-blue);
            color: white;
            border: none;
            border-radius: var(--radius-md);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
        }
        button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        .message {
            margin-top: 16px;
            padding: 12px;
            border-radius: var(--radius-md);
            font-size: 0.9rem;
        }
        .message.success {
            background: rgba(52, 199, 89, 0.1);
            color: var(--success);
        }
        .message.error {
            background: rgba(255, 59, 48, 0.1);
            color: var(--destructive);
        }
      `}</style>
        </div>
    );
};

export default Login;
