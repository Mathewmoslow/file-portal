import { useMemo, useState, useEffect, useRef } from 'react';
import './MindMapView.css';
import type { FileNode } from '../../types';

interface MindMapViewProps {
  files: FileNode[];
  currentPath: string;
  onOpenFile: (path: string) => void;
  onSelectPath: (path: string) => void;
}

type PositionedNode = FileNode & { x: number; y: number; depth: number };

export const MindMapView = ({ files, currentPath, onOpenFile, onSelectPath }: MindMapViewProps) => {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [modalFile, setModalFile] = useState<FileNode | null>(null);
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowResults(true);
      }
      if (e.key === 'Escape') {
        setShowResults(false);
        setModalFile(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { roots, leaves } = useMemo(() => {
    const dirs = files.filter((f) => f.type === 'directory');
    const nonDirs = files.filter((f) => f.type === 'file');
    return { roots: dirs, leaves: nonDirs };
  }, [files]);

  const polarPositions = (items: FileNode[], radius: number, startAngle = -90) =>
    items.map((item, index) => {
      const angle = startAngle + (index * 360) / Math.max(items.length, 1);
      const rad = (angle * Math.PI) / 180;
      return {
        ...item,
        x: 50 + radius * Math.cos(rad),
        y: 50 + radius * Math.sin(rad),
        depth: 1,
      } as PositionedNode;
    });

  const positionedRoots = polarPositions(roots, 28);
  const positionedLeaves = polarPositions(leaves, 36, -60);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return [];
    return files
      .filter((f) => f.name.toLowerCase().includes(term))
      .map((f) => ({ ...f, match: f.name }));
  }, [files, search]);

  const openFromModal = (path: string) => {
    onOpenFile(path);
    setModalFile(null);
  };

  return (
    <div className="mindmap-shell">
      <div className="top-nav">
        <div className="nav-left">
          <div className="nav-title">File Atlas</div>
          <div className="nav-breadcrumb">
            {currentPath || '/'}
            {activePath ? <span>→ {activePath}</span> : null}
          </div>
        </div>
        <div className="search-container">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search files…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowResults(e.target.value.length > 0);
            }}
            onFocus={() => setShowResults(search.length > 0)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
          />
          <span className="search-shortcut">⌘K</span>
          <div className={`search-results ${showResults ? 'active' : ''}`}>
            {filtered.map((item) => (
              <div
                key={item.path}
                className="search-result-item"
                onClick={() => {
                  setModalFile(item);
                  setShowResults(false);
                }}
              >
                <div className="result-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  </svg>
                </div>
                <div className="result-info">
                  <div className="result-name">{item.name}</div>
                  <div className="result-meta">{item.type}</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && search && (
              <div className="search-empty">No matches</div>
            )}
          </div>
        </div>
      </div>

      <div className="mindmap-canvas">
        <svg className="mindmap-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {positionedRoots.map((node) => (
            <path
              key={`line-${node.path}`}
              className="mindmap-line"
              d={`M 50 50 Q ${(50 + node.x) / 2} ${(50 + node.y) / 2} ${node.x} ${node.y}`}
            />
          ))}
          {positionedLeaves.map((node) => (
            <path
              key={`line-leaf-${node.path}`}
              className="mindmap-line"
              d={`M 50 50 Q ${(50 + node.x) / 2} ${(50 + node.y) / 2} ${node.x} ${node.y}`}
              style={{ opacity: 0.4 }}
            />
          ))}
        </svg>

        <div className="mindmap-node root" style={{ left: '50%', top: '50%' }}>
          <div className="node-content">
            <div className="node-label">Root</div>
            <div className="node-count">{files.length} items</div>
          </div>
        </div>

        {positionedRoots.map((node) => (
          <div
            key={node.path}
            className={`mindmap-node ${activePath === node.path ? 'active' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => {
              setActivePath(node.path);
              onSelectPath(node.path);
            }}
          >
            <div className="node-content">
              <div className="node-label">{node.name}</div>
              <div className="node-count">{node.size ? `${node.size}b` : ''}</div>
            </div>
          </div>
        ))}

        {positionedLeaves.map((node) => (
          <div
            key={node.path}
            className={`mindmap-node child ${modalFile?.path === node.path ? 'active' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => setModalFile(node)}
          >
            <div className="node-content">
              <div className="node-label">{node.name}</div>
            </div>
          </div>
        ))}

        <div className="return-pill" onClick={() => onSelectPath('/')}>
          Return to Root
        </div>
      </div>

      <div className={`file-modal-overlay ${modalFile ? 'active' : ''}`} onClick={() => setModalFile(null)}>
        <div className="file-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-hero">
            <div className="modal-badge">{modalFile?.type || 'File'}</div>
            <button className="modal-close" onClick={() => setModalFile(null)}>
              <svg viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="modal-content">
            <div className="modal-type">{modalFile?.type || 'File'}</div>
            <h2 className="modal-title">{modalFile?.name || 'Untitled'}</h2>
            <p className="modal-subtitle">{modalFile?.path}</p>

            <div className="modal-meta">
              <div className="meta-item">
                <div className="meta-label">Size</div>
                <div className="meta-value">{modalFile?.size ? `${modalFile.size} bytes` : '—'}</div>
              </div>
              <div className="meta-item">
                <div className="meta-label">Modified</div>
                <div className="meta-value">{modalFile?.modified || '—'}</div>
              </div>
              <div className="meta-item">
                <div className="meta-label">Type</div>
                <div className="meta-value">{modalFile?.type}</div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => modalFile && openFromModal(modalFile.path)}
              >
                Open in Editor
              </button>
              <button className="btn" onClick={() => modalFile && setActivePath(modalFile.path)}>
                Highlight
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
