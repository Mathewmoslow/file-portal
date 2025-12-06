import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useFileStore } from '../../store/fileStore';
import { api } from '../../services/api';
import { Save, X, ExternalLink, Share2, Copy, Check } from 'lucide-react';
import './CodeEditor.css';

export const CodeEditor = () => {
  const previewBase = import.meta.env.VITE_PREVIEW_BASE_URL || 'https://files.mathewmoslow.com';
  const [shareModal, setShareModal] = useState<{ open: boolean; url?: string; loading?: boolean; error?: string }>({ open: false });
  const [copied, setCopied] = useState(false);
  const {
    activeFile,
    openFiles,
    unsavedFiles,
    updateFileContent,
    saveFile,
    closeFile
  } = useFileStore();

  const openFilesArray = Array.from(openFiles.entries());
  const currentFile = activeFile ? openFiles.get(activeFile) : undefined;
  const currentContent = currentFile?.content ?? '';
  const isUnsaved = activeFile ? unsavedFiles.has(activeFile) : false;

  const handleEditorChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFileContent(activeFile, value);
    }
  };

  const handleSave = async () => {
    if (activeFile && currentContent !== undefined) {
      await saveFile(activeFile, currentContent);
    }
  };

  const handlePreview = () => {
    if (!activeFile) return;
    const url = `${previewBase}${activeFile}`;
    window.open(url, '_blank');
  };

  const handleShare = async (expiresIn: string = '7d') => {
    if (!activeFile) return;
    setShareModal({ open: true, loading: true });
    try {
      const result = await api.generateShareLink(activeFile, expiresIn);
      setShareModal({ open: true, url: result.shareUrl });
    } catch (err: any) {
      setShareModal({ open: true, error: err.message || 'Failed to generate share link' });
    }
  };

  const handleCopyShareUrl = async () => {
    if (!shareModal.url) return;
    try {
      await navigator.clipboard.writeText(shareModal.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareModal.url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'sql': 'sql',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, currentContent]);

  if (openFilesArray.length === 0) {
    return (
      <div className="editor-empty">
        <div className="empty-state">
          <h2>📝 No File Open</h2>
          <p>Select a file from the file tree to start editing</p>
        </div>
      </div>
    );
  }

  const renderBinaryPreview = () => {
    if (!currentFile) return null;
    const mime = currentFile.mimeType || 'application/octet-stream';
    const url =
      currentFile.encoding === 'base64'
        ? `data:${mime};base64,${currentFile.content}`
        : `${previewBase}${currentFile.path}`;
    const isImage = mime.startsWith('image/');
    const isPdf = mime === 'application/pdf';

    return (
      <div className="binary-preview">
        <div className="binary-toolbar">
          <span>Preview only (binary file)</span>
          <a
            className="toolbar-btn"
            href={url || `https://files.mathewmoslow.com${currentFile.path}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in new tab
          </a>
        </div>
        <div className="binary-content">
          {isImage && url && <img src={url} alt={currentFile.name} style={{ maxWidth: '100%' }} />}
          {isPdf && url && (
            <iframe title={currentFile.name} src={url} style={{ width: '100%', height: '100%' }} />
          )}
          {!isImage && !isPdf && (
            <div className="binary-fallback">
              <p>This file is binary. Use the button above to view or download.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="code-editor">
      <div className="editor-tabs">
        {openFilesArray.map(([path]) => {
          const fileName = path.split('/').pop() || path;
          const isActive = path === activeFile;
          const hasUnsaved = unsavedFiles.has(path);

          return (
            <div
              key={path}
              className={`editor-tab ${isActive ? 'active' : ''}`}
              onClick={() => useFileStore.setState({ activeFile: path })}
            >
              <span className="tab-name">
                {fileName}
                {hasUnsaved && <span className="unsaved-indicator">●</span>}
              </span>
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(path);
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="editor-toolbar">
        {!currentFile?.isBinary && (
          <>
            <button
              className="toolbar-btn"
              onClick={handleSave}
              disabled={!isUnsaved}
              title="Save (Ctrl+S)"
            >
              <Save size={16} />
              <span>Save</span>
            </button>
            {isUnsaved && <span className="toolbar-status">Unsaved changes</span>}
          </>
        )}
        {currentFile?.isBinary && (
          <span className="toolbar-status">Binary file (preview only)</span>
        )}
        {activeFile && (
          <>
            <button className="toolbar-btn secondary" onClick={handlePreview} title="Open preview">
              <ExternalLink size={16} />
              <span>Preview</span>
            </button>
            <button className="toolbar-btn secondary" onClick={() => handleShare('7d')} title="Generate share link">
              <Share2 size={16} />
              <span>Share</span>
            </button>
          </>
        )}
      </div>

      <div className="editor-container">
        {activeFile && !currentFile?.isBinary && (
          <Editor
            height="100%"
            language={getLanguage(activeFile)}
            value={currentContent}
            onChange={handleEditorChange}
            theme="vs"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              tabSize: 2,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
            }}
          />
        )}
        {activeFile && currentFile?.isBinary && renderBinaryPreview()}
      </div>

      {shareModal.open && (
        <div className="share-modal-backdrop" onClick={() => setShareModal({ open: false })}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Share File</h3>
            {shareModal.loading && <p className="share-loading">Generating link...</p>}
            {shareModal.error && <p className="share-error">{shareModal.error}</p>}
            {shareModal.url && (
              <>
                <p className="share-info">Link expires in 7 days</p>
                <div className="share-url-container">
                  <input
                    type="text"
                    readOnly
                    value={shareModal.url}
                    className="share-url-input"
                  />
                  <button className="share-copy-btn" onClick={handleCopyShareUrl}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="share-expiry-options">
                  <span>Change expiration:</span>
                  <button onClick={() => handleShare('1h')}>1 hour</button>
                  <button onClick={() => handleShare('24h')}>24 hours</button>
                  <button onClick={() => handleShare('7d')}>7 days</button>
                  <button onClick={() => handleShare('30d')}>30 days</button>
                </div>
              </>
            )}
            <button className="share-close-btn" onClick={() => setShareModal({ open: false })}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
