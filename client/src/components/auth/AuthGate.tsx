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
        <img src="/logo.png" alt="Atelier Moslow" className="auth-logo" />

        <form onSubmit={handleSubmit} autoComplete="on">
          <input
            type="text"
            name="username"
            autoComplete="username"
            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
            aria-hidden="true"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
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
      </div>
    </div>
  );
};
