import { useState, useEffect, useRef } from 'react';
import { AuthGate } from './components/auth/AuthGate';
import { FileTree } from './components/explorer/FileTree';
import { CodeEditor } from './components/editor/CodeEditor';
import { MindMapView } from './components/mindmap/MindMapView';
import { api } from './services/api';
import { LogOut } from 'lucide-react';
import { useFileStore } from './store/fileStore';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [view, setView] = useState<'mindmap' | 'editor'>('mindmap');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const appRef = useRef<HTMLDivElement | null>(null);
  const { fileTree, currentPath, loadFileTree, openFile, createFile, createDirectory, uploadFile } = useFileStore();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !appRef.current) return;
      const rect = appRef.current.getBoundingClientRect();
      const min = 220;
      const max = Math.min(520, rect.width - 320);
      const next = Math.min(max, Math.max(min, e.clientX - rect.left));
      setSidebarWidth(next);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!isAuthenticated) {
    return <AuthGate onLogin={handleLogin} />;
  }

  const handleUp = () => {
    if (!currentPath || currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parent = '/' + parts.join('/');
    loadFileTree(parent || '/');
  };

  const handleUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const first = files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      await uploadFile(first.name, base64);
    };
    reader.readAsDataURL(first);
  };

  return (
    <div className="app" ref={appRef}>
      <header className="app-header">
        <div className="header-left">
          <h1>File Atelier</h1>
          <div className="header-meta">{currentPath || '/'}</div>
        </div>
        <div className="header-actions">
          <button onClick={handleUp} className="text-btn">Up</button>
          <button onClick={() => createFile('/untitled.txt', '')} className="text-btn">New File</button>
          <button onClick={() => createDirectory('/new-folder')} className="text-btn">New Folder</button>
          <button onClick={() => uploadInputRef.current?.click()} className="text-btn">Upload</button>
          <input
            type="file"
            ref={uploadInputRef}
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
        <div className="header-right">
          <div className="view-switch">
            <button
              className={`switch-btn ${view === 'mindmap' ? 'active' : ''}`}
              onClick={() => setView('mindmap')}
            >
              Atlas
            </button>
            <button
              className={`switch-btn ${view === 'editor' ? 'active' : ''}`}
              onClick={() => setView('editor')}
            >
              Editor
            </button>
          </div>
          <button
            className="text-btn"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title="Toggle navigator"
          >
            {sidebarCollapsed ? 'Show Nav' : 'Hide Nav'}
          </button>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="app-body">
        {!sidebarCollapsed && (
          <>
            <aside className="sidebar" style={{ width: sidebarWidth }}>
              <FileTree />
            </aside>
            <div
              className={`resizer ${isResizing ? 'dragging' : ''}`}
              onMouseDown={() => setIsResizing(true)}
            />
          </>
        )}

        <main className="main-content">
          {view === 'mindmap' ? (
            <MindMapView
              files={fileTree}
              currentPath={currentPath || '/'}
              onOpenFile={(path) => {
                openFile(path);
                setView('editor');
              }}
              onSelectPath={(path) => loadFileTree(path)}
            />
          ) : (
            <CodeEditor />
          )}
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
