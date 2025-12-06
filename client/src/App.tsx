import { useState, useEffect, useRef } from 'react';
import { AuthGate } from './components/auth/AuthGate';
import { FileTree } from './components/explorer/FileTree';
import { CodeEditor } from './components/editor/CodeEditor';
import { MindMapView } from './components/mindmap/MindMapView';
import { ThreeMindMap } from './components/mindmap/ThreeMindMap';
import { api } from './services/api';
import { LogOut } from 'lucide-react';
import { useFileStore } from './store/fileStore';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [view, setView] = useState<'atlas' | 'editor'>('atlas');
  const [supportsWebGL, setSupportsWebGL] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const appRef = useRef<HTMLDivElement | null>(null);
  const { fileTree, currentPath, loadFileTree, openFile, createFile, createDirectory, uploadFile, error } = useFileStore();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Check if already authenticated
    setIsAuthenticated(api.isAuthenticated());
  }, []);

const [newItemModal, setNewItemModal] = useState<{ open: boolean; type: 'file' | 'folder' }>({
    open: false,
    type: 'file',
  });
  const [newItemName, setNewItemName] = useState('');

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

  useEffect(() => {
    if (!window.WebGLRenderingContext) {
      setSupportsWebGL(false);
      setView('atlas');
    }
  }, []);

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

  const normalizePath = (base: string, relative: string) => {
    const cleanBase = base === '/' ? '' : base.replace(/\/+$/, '');
    const cleanRel = relative.replace(/^\/+/, '');
    return `${cleanBase}/${cleanRel}`.replace(/\/+/g, '/');
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const ensureDirsForPath = async (path: string) => {
    const parts = path.split('/').filter(Boolean);
    let acc = '';
    for (let i = 0; i < parts.length - 1; i++) {
      acc += `/${parts[i]}`;
      const dirPath = acc || '/';
      try {
        await createDirectory(dirPath);
      } catch {
        // ignore if exists
      }
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const rel = (file as any).webkitRelativePath || file.webkitRelativePath || file.name;
      const targetPath = normalizePath(currentPath || '/', rel);
      await ensureDirsForPath(targetPath);
      const base64 = await readFileAsBase64(file);
      await uploadFile(targetPath, base64);
    }
  };

  const createItem = async () => {
    if (!newItemName.trim()) return;
    if (newItemModal.type === 'file') {
      await createFile(normalizePath(currentPath || '/', newItemName.trim()), '');
    } else {
      await createDirectory(normalizePath(currentPath || '/', newItemName.trim()));
    }
    setNewItemModal({ open: false, type: 'file' });
    setNewItemName('');
  };

  return (
    <div className="app" ref={appRef}>
      <header className="app-header">
        <div className="header-left">
          <h1 onClick={() => loadFileTree('/')}>File Atelier</h1>
          <div className="header-meta">{currentPath || '/'}</div>
        </div>
        <div className="header-actions">
          <button onClick={handleUp} className="text-btn">Up</button>
          <button onClick={() => setNewItemModal({ open: true, type: 'file' })} className="text-btn">New File</button>
          <button onClick={() => setNewItemModal({ open: true, type: 'folder' })} className="text-btn">New Folder</button>
          <button onClick={() => uploadInputRef.current?.click()} className="text-btn">Upload</button>
          <input
            type="file"
            ref={uploadInputRef}
            multiple
            // @ts-expect-error webkitdirectory support for folder uploads
            webkitdirectory="true"
            // @ts-expect-error directory attribute for some browsers
            directory="true"
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
          <div className="header-right">
            <div className="view-switch">
              <button
              className={`switch-btn ${view === 'atlas' ? 'active' : ''}`}
              onClick={() => setView('atlas')}
            >
              Atlas 3D
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
              <FileTree onFileOpen={() => setView('editor')} />
            </aside>
            <div
              className={`resizer ${isResizing ? 'dragging' : ''}`}
              onMouseDown={() => setIsResizing(true)}
            />
          </>
        )}

        <main className="main-content">
          {view === 'atlas' ? (
            supportsWebGL ? (
              <ThreeMindMap
                files={fileTree}
                currentPath={currentPath || '/'}
                onOpenFile={(path) => {
                  openFile(path);
                  setView('editor');
                }}
                onSelectPath={(path) => loadFileTree(path)}
                onFallback={() => setSupportsWebGL(false)}
              />
            ) : (
              <MindMapView
                files={fileTree}
                currentPath={currentPath || '/'}
                onOpenFile={(path) => {
                  openFile(path);
                  setView('editor');
                }}
                onSelectPath={(path) => loadFileTree(path)}
              />
            )
          ) : (
            <CodeEditor />
          )}
        </main>
      </div>

      {error && (
        <div className="error-toast">
          <div className="error-content">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {newItemModal.open && (
        <div className="modal-backdrop" onClick={() => setNewItemModal({ open: false, type: 'file' })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{newItemModal.type === 'file' ? 'Create File' : 'Create Folder'}</h2>
            <input
              autoFocus
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={newItemModal.type === 'file' ? 'index.html' : 'assets'}
            />
            <div className="modal-actions">
              <button className="text-btn" onClick={() => setNewItemModal({ open: false, type: 'file' })}>Cancel</button>
              <button className="text-btn" onClick={createItem}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
