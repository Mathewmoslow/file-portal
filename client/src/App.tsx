import { useState, useEffect } from 'react';
import { AuthGate } from './components/auth/AuthGate';
import { FileTree } from './components/explorer/FileTree';
import { CodeEditor } from './components/editor/CodeEditor';
import { api } from './services/api';
import { LogOut } from 'lucide-react';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    setIsAuthenticated(api.isAuthenticated());
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AuthGate onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>📁 File Portal</h1>
        </div>
        <div className="header-right">
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <FileTree />
        </aside>

        <main className="main-content">
          <CodeEditor />
        </main>
      </div>

      <footer className="app-footer">
        <div className="footer-left">
          <span>File Portal MVP</span>
        </div>
        <div className="footer-right">
          <span>Press Ctrl+S to save</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
