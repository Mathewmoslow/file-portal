import { useEffect, useRef } from 'react';
import { useFileStore } from '../../store/fileStore';
import type { FileNode } from '../../types';
import { File, Folder, Trash2, Edit3, ExternalLink } from 'lucide-react';
import './FileTree.css';

export const FileTree = () => {
  const {
    fileTree,
    loadFileTree,
    openFile,
    activeFile,
    isLoading,
    createFile,
    uploadFile,
    currentPath,
    navigateTo,
    deleteFile,
    createDirectory,
    renamePath,
  } = useFileStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewBase = import.meta.env.VITE_PREVIEW_BASE_URL || 'https://files.mathewmoslow.com';

  useEffect(() => {
    loadFileTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'file') {
      openFile(node.path);
    } else {
      navigateTo(node.path);
    }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'html': '📄',
      'css': '🎨',
      'js': '⚡',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'json': '📋',
      'md': '📝',
      'txt': '📃',
      'png': '🖼️',
      'jpg': '🖼️',
      'gif': '🖼️',
      'svg': '🎯',
    };
    return iconMap[ext || ''] || '📄';
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const isActive = activeFile === node.path;

    return (
      <div key={node.path} className="tree-node" style={{ paddingLeft: `${depth * 12}px` }}>
        <div
          className={`node-content ${isActive ? 'active' : ''}`}
          onClick={() => handleFileClick(node)}
        >
          <span className="node-icon">
            {node.type === 'directory' ? (
              <Folder size={16} />
            ) : (
              <File size={16} />
            )}
          </span>
          <span className="node-name">{node.name}</span>
          {node.type === 'file' && node.size && (
            <span className="node-size">{formatSize(node.size)}</span>
          )}
          <span className="node-actions" onClick={(e) => e.stopPropagation()}>
            {node.type === 'file' && (
              <button className="icon-btn" title="Preview" onClick={() => handlePreview(node)}>
                <ExternalLink size={14} />
              </button>
            )}
            <button className="icon-btn" title="Rename" onClick={() => handleRename(node)}>
              <Edit3 size={14} />
            </button>
            <button className="icon-btn danger" title="Delete" onClick={() => handleDelete(node)}>
              <Trash2 size={14} />
            </button>
          </span>
        </div>
      </div>
    );
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };


  const handleNewFile = async () => {
    const name = window.prompt('New file name (e.g., index.html):');
    if (!name) return;
    await createFile(name, '');
  };

  const handleNewFolder = async () => {
    const name = window.prompt('New folder name (e.g., assets):');
    if (!name) return;
    await createDirectory(name);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    await uploadFiles(Array.from(files));
    e.target.value = '';
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadFiles = async (files: File[]) => {
    for (const file of files) {
      const base64 = await readFileAsBase64(file);
      await uploadFile(file.name, base64);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    await uploadFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  if (isLoading && fileTree.length === 0) {
    return (
      <div className="file-tree">
        <div className="tree-loading">Loading files...</div>
      </div>
    );
  }

  const handleRename = async (node: FileNode) => {
    const newName = window.prompt('Rename to:', node.name);
    if (!newName || newName === node.name) return;
    const newPath = `${currentPath === '/' ? '' : currentPath}/${newName}`.replace(/\/+/g, '/');
    await renamePath(node.path, newPath);
  };

  const handleDelete = async (node: FileNode) => {
    const ok = window.confirm(`Delete ${node.name}?`);
    if (!ok) return;
    await deleteFile(node.path, node.type === 'directory');
  };

  const handlePreview = (node: FileNode) => {
    if (node.type !== 'file') return;
    const url = `${previewBase}${node.path}`;
    window.open(url, '_blank');
  };

  const parentPath = () => {
    if (currentPath === '/' || currentPath === '') return '/';
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    return '/' + parts.join('/');
  };

  return (
    <div className="file-tree">
      <div className="tree-header">
        <h3>Files</h3>
        <span className="tree-path-inline">{currentPath || '/'}</span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
      </div>
      <div className="tree-content" onDrop={handleDrop} onDragOver={handleDragOver}>
        {fileTree.length === 0 ? (
          <div className="tree-empty">No files found</div>
        ) : (
          fileTree.map((node) => renderNode(node))
        )}
      </div>
    </div>
  );
};
