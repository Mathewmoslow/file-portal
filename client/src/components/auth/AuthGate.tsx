import { useState } from 'react';
import { api } from '../../services/api';
import './AuthGate.css';

interface AuthGateProps {
  onLogin: () => void;
}

export const AuthGate = ({ onLogin }: AuthGateProps) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.login(password);
      if (response.success) {
        onLogin();
      } else {
        setError(response.error?.message || 'Login failed');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <h1>File Atelier</h1>
        <p className="auth-subtitle">Enter your password to access your files</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoFocus
          />

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !password}
          >
            {isLoading ? 'Authenticating...' : 'Enter'}
          </button>
        </form>

        <p className="auth-hint">Secure access to your personal file archive</p>
      </div>
    </div>
  );
};
