import { useEffect, useRef } from 'react';
import { useFileStore } from '../../store/fileStore';
import type { FileNode } from '../../types';
import { File, Folder } from 'lucide-react';
import './FileTree.css';

export const FileTree = () => {
  const { fileTree, loadFileTree, openFile, activeFile, isLoading, createFile, uploadFile } = useFileStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadFileTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'file') {
      openFile(node.path);
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
    const path = name.startsWith('/') ? name : `/${name}`;
    await createFile(path, '');
    await loadFileTree();
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
      const targetPath = `/${file.name}`;
      await uploadFile(targetPath, base64);
    }
    await loadFileTree();
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

  return (
    <div className="file-tree">
      <div className="tree-header">
        <h3>📁 Files</h3>
        <div className="tree-actions">
          <button onClick={handleNewFile}>New File</button>
          <button onClick={() => fileInputRef.current?.click()}>Upload</button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
        </div>
      </div>
      <div className="tree-content" onDrop={handleDrop} onDragOver={handleDragOver}>
        {fileTree.length === 0 ? (
          <div className="tree-empty">No files found</div>
        ) : (
          fileTree.map((node) => renderNode(node))
        )}
        <div className="drop-zone">
          Drag & drop files here to upload
        </div>
      </div>
    </div>
  );
};
