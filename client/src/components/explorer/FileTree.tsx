import { useEffect } from 'react';
import { useFileStore } from '../../store/fileStore';
import type { FileNode } from '../../types';
import { File, Folder, FolderOpen } from 'lucide-react';
import './FileTree.css';

export const FileTree = () => {
  const { fileTree, loadFileTree, openFile, activeFile, isLoading } = useFileStore();

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
      </div>
      <div className="tree-content">
        {fileTree.length === 0 ? (
          <div className="tree-empty">No files found</div>
        ) : (
          fileTree.map((node) => renderNode(node))
        )}
      </div>
    </div>
  );
};
