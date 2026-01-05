import React, { useState, useEffect, useRef } from 'react';
import type { Timer } from '../types';

interface ManualTimeModalProps {
    timer: Timer;
    onClose: () => void;
    onConfirm: (seconds: number) => void;
}

const ManualTimeModal: React.FC<ManualTimeModalProps> = ({ timer, onClose, onConfirm }) => {
    const [minutes, setMinutes] = useState('');
    const [hours, setHours] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const m = parseInt(minutes || '0', 10);
        const h = parseInt(hours || '0', 10);
        const totalSeconds = (h * 3600) + (m * 60);

        if (totalSeconds > 0) {
            onConfirm(totalSeconds);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Log Time</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <p className="timer-title">for <strong>{timer.title}</strong></p>

                <form onSubmit={handleSubmit}>
                    <div className="time-inputs">
                        <div className="input-group">
                            <label>Hours</label>
                            <input
                                ref={inputRef}
                                type="number"
                                min="0"
                                value={hours}
                                onChange={e => setHours(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div className="input-group">
                            <label>Minutes</label>
                            <input
                                type="number"
                                min="0"
                                max="59"
                                value={minutes}
                                onChange={e => setMinutes(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary" disabled={!minutes && !hours}>
                            Log Time
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .modal-header h2 {
           font-size: 1.25rem;
           margin: 0;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .timer-title {
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        .time-inputs {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .input-group {
          flex: 1;
        }

        /* Reuse styles from Dashboard */
        /* Since scoped styles don't leak, we might need to duplicate or move to global if we want reuse. 
           For now, duplicating minimal styles for consistency/speed. 
        */

        .input-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        input {
          width: 100%;
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(0,0,0,0.1);
          font-size: 1.5rem;
          background: var(--bg-color);
          color: var(--text-primary);
          text-align: center;
        }
        
        input:focus {
           outline: none;
           border-color: var(--accent-blue);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
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
        
        .modal-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

         /* Dark Mode overrides if needed handled by vars */
      `}</style>
        </div>
    );
};

export default ManualTimeModal;
