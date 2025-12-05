import { useEffect } from 'react';
import type { FileNode } from '../../types';
import './FileModal.css';

interface FileModalProps {
  file: FileNode | null;
  onClose: () => void;
  onOpen: (path: string) => void;
}

export const FileModal = ({ file, onClose, onOpen }: FileModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!file) return null;

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFileExtension = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ext;
  };

  const ext = getFileExtension(file.name);
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);

  return (
    <div className="file-modal-backdrop" onClick={onClose}>
      <div className="file-modal" onClick={(e) => e.stopPropagation()}>
        {/* Hero Section */}
        <div className="modal-hero">
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {isImage ? (
            <img src={`https://files.mathewmoslow.com${file.path}`} alt={file.name} />
          ) : (
            <svg viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <div className="modal-header">
            <div className="modal-category">
              {file.category || 'Document'}
            </div>
            <h2 className="modal-title">{file.name}</h2>
          </div>

          <div className="modal-meta">
            <div className="meta-item">
              <span className="meta-label">Size</span>
              <span className="meta-value">{formatSize(file.size)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Modified</span>
              <span className="meta-value">{formatDate(file.modified)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Type</span>
              <span className="meta-value">{ext.toUpperCase()}</span>
            </div>
          </div>

          {file.description && (
            <div className="modal-description">
              {file.description}
            </div>
          )}

          {file.preview && (
            <div className="modal-preview">
              <div className="preview-label">Content Preview</div>
              <div className="modal-preview-text">
                {file.preview}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button className="modal-btn secondary" onClick={onClose}>
              Close
            </button>
            <button className="modal-btn primary" onClick={() => onOpen(file.path)}>
              Open in Editor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
