import { useState, useEffect, useRef } from 'react';
import { AuthGate } from './components/auth/AuthGate';
import { FileTree } from './components/explorer/FileTree';
import { CodeEditor } from './components/editor/CodeEditor';
import { MindMapView } from './components/mindmap/MindMapView';
import { ThreeMindMap } from './components/mindmap/ThreeMindMap';
import { api } from './services/api';
import { getApiBase } from './utils/apiBase';
import { LogOut } from 'lucide-react';
import { useFileStore } from './store/fileStore';
import { useCompanionStore } from './processor/store/companion';
import { CompanionPanel } from './processor/companion/CompanionPanel';
import RichTextEditor, { type RichTextHandle } from './processor/editor/RichTextEditor';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [view, setView] = useState<'atlas' | 'editor' | 'processor'>('atlas');
  const [supportsWebGL, setSupportsWebGL] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const appRef = useRef<HTMLDivElement | null>(null);
  const {
    fileTree,
    currentPath,
    loadFileTree,
    openFile,
    createFile,
    createDirectory,
    uploadFile,
    error,
    activeFile,
    openFiles,
    unsavedFiles,
    updateFileContent,
    saveFile,
    renamePath,
  } = useFileStore();
  const { setSelectionPreview } = useCompanionStore();
  const editorRef = useRef<RichTextHandle | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [shareState, setShareState] = useState<{ url?: string; expiresIn?: string; loading?: boolean; error?: string }>({});
  const [zoom, setZoom] = useState(1);
  const apiBase = getApiBase();

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

  const isTextLike = (path?: string) => {
    if (!path) return false;
    const ext = path.split('.').pop()?.toLowerCase() || '';
    return ['txt', 'doc', 'docx', 'rtf', 'md', 'html', 'htm'].includes(ext);
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

  const handleOpenFile = async (path: string) => {
    await openFile(path);
    const file = useFileStore.getState().openFiles.get(path);
    const binary = file?.isBinary;
    if (isTextLike(path) && !binary) {
      setView('processor');
    } else {
      setView('editor');
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

  const handleNewDocument = async () => {
    const base = currentPath || '/';
    const name = `untitled-${Date.now()}.docx`;
    const targetPath = normalizePath(base, name);
    await createFile(targetPath, '<p></p>');
    await handleOpenFile(targetPath);
    setView('processor'); // new document opens in processor (rich editor)
  };

  const currentFile = activeFile ? openFiles.get(activeFile) : undefined;
  const currentContent = currentFile?.content ?? '';
  const isUnsaved = activeFile ? unsavedFiles.has(activeFile) : false;

  const handleProcessorChange = (html: string) => {
    if (activeFile) {
      updateFileContent(activeFile, html);
    }
  };

  const handleProcessorSave = async () => {
    if (activeFile && currentContent !== undefined) {
      await saveFile(activeFile, currentContent);
    }
  };

  const handleCloseDocument = () => {
    if (activeFile) {
      closeFile(activeFile);
    }
  };

  const buildServeUrl = (path: string) => {
    const token = sessionStorage.getItem('token');
    const serveBase = `${apiBase}/serve`;
    return `${serveBase}?path=${encodeURIComponent(path)}${token ? `&token=${token}` : ''}`;
  };

  const handleProcessorPreview = () => {
    if (!activeFile) return;
    const url = buildServeUrl(activeFile);
    window.open(url, '_blank');
  };

  const handleProcessorShare = (expiresIn: string = '7d') => {
    if (!activeFile) return;
    const url = buildServeUrl(activeFile);
    setShareState({ url, expiresIn, loading: false });
  };

  const handleExportDocx = async () => {
    const html = editorRef.current?.getHtml ? editorRef.current.getHtml() : ''
    if (!html) return
    try {
      const token = sessionStorage.getItem('token')
      const res = await fetch(`${apiBase}/export/docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ html, filename: activeFile || 'document' }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || `Export failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (activeFile?.split('/').pop() || 'document') + '.docx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'Export failed')
    }
  }

  const handleExportPdf = () => {
    window.print()
  }

  const handleRename = async (newName: string) => {
    if (!activeFile) return;
    const dir = activeFile.substring(0, activeFile.lastIndexOf('/'));
    const newPath = dir ? `${dir}/${newName}` : `/${newName}`;
    try {
      await renamePath(activeFile, newPath);
      await loadFileTree(currentPath || '/');
      await openFile(newPath);
    } catch (e: any) {
      console.error('Rename failed:', e);
      alert(e?.message || 'Rename failed');
    }
  };

  return (
    <div className="app" ref={appRef}>
      <header className="app-header">
        <div className="header-left">
          <img src="/logo.png" alt="Atelier Moslow" className="header-logo-large" onClick={() => loadFileTree('/')} />
        </div>
        <div className="header-actions">
          <button onClick={handleUp} className="text-btn">Up</button>
          <button onClick={handleNewDocument} className="text-btn">New Document</button>
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
            <button
              className={`switch-btn ${view === 'processor' ? 'active' : ''}`}
              onClick={() => setView('processor')}
            >
              Processor
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
              <FileTree onFileOpen={(path) => handleOpenFile(path)} />
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
                  handleOpenFile(path);
                }}
                onSelectPath={(path) => loadFileTree(path)}
                onFallback={() => setSupportsWebGL(false)}
              />
            ) : (
              <MindMapView
                files={fileTree}
                currentPath={currentPath || '/'}
                onOpenFile={(path) => {
                  handleOpenFile(path);
                }}
                onSelectPath={(path) => loadFileTree(path)}
              />
            )
          ) : (
            view === 'editor' ? <CodeEditor /> : (
              <div className="processor-view">
                <div className="processor-body">
                  <div className="processor-canvas">
                    {activeFile && !currentFile?.isBinary ? (
                      <RichTextEditor
                        ref={editorRef}
                        initialContent={currentContent}
                        onChange={handleProcessorChange}
                        onSave={(html) => {
                          if (activeFile) {
                            updateFileContent(activeFile, html);
                            saveFile(activeFile, html).catch(() => {});
                          }
                        }}
                        onPrint={() => window.print()}
                        fileName={activeFile}
                        isUnsaved={isUnsaved}
                        onPreview={handleProcessorPreview}
                        onShare={handleProcessorShare}
                        onExportDocx={handleExportDocx}
                        onExportPdf={handleExportPdf}
                        zoom={zoom}
                        onZoomChange={setZoom}
                        onRename={handleRename}
                        onSelectionChange={setSelectionPreview}
                        onClose={handleCloseDocument}
                      />
                    ) : (
                      <div className="editor-empty">
                        <div className="empty-state">
                          <h2>{currentFile?.isBinary ? 'Binary file' : 'No Document Open'}</h2>
                          <p>{currentFile?.isBinary ? 'Binary documents are preview-only.' : 'Select or create a document to edit.'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <aside className="processor-rail">
                    <div className="companion-card">
                      <CompanionPanel editorRef={editorRef} />
                    </div>
                  </aside>
                </div>

                {shareState.url && (
                  <div className="share-banner">
                    <div className="share-info">
                      <span>Share link (expires {shareState.expiresIn || '7d'}):</span>
                      <input readOnly value={shareState.url} />
                    </div>
                    <button
                      className="text-btn"
                      onClick={() => {
                        navigator.clipboard?.writeText(shareState.url || '');
                      }}
                    >
                      Copy
                    </button>
                    <div className="share-expiry-options">
                      <span>Expiration:</span>
                      {['1h', '24h', '7d', '30d', 'never'].map((exp) => (
                        <button key={exp} className="text-btn" onClick={() => handleProcessorShare(exp)}>
                          {exp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {shareState.error && (
                  <div className="error-toast">
                    <div className="error-content">
                      <strong>Error:</strong> {shareState.error}
                    </div>
                  </div>
                )}
              </div>
            )
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
