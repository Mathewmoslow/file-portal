import { useEffect, useRef, useState } from 'react';
import { useFileStore } from '../../store/fileStore';
import type { FileNode } from '../../types';
import { File, Folder, Trash2, Edit3, ExternalLink } from 'lucide-react';
import './FileTree.css';

interface FileTreeProps {
  onFileOpen?: () => void;
}

export const FileTree = ({ onFileOpen }: FileTreeProps) => {
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
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const previewBase = import.meta.env.VITE_PREVIEW_BASE_URL || 'https://files.mathewmoslow.com';

  useEffect(() => {
    loadFileTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'file') {
      openFile(node.path);
      onFileOpen?.();
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
      <div
        key={node.path}
        className={`tree-node ${dropTarget === node.path ? 'drop-target' : ''}`}
        style={{ paddingLeft: `${depth * 12}px` }}
        draggable
        onDragStart={() => setDraggingPath(node.path)}
        onDragEnd={() => {
          setDraggingPath(null);
          setDropTarget(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDropTarget(node.type === 'directory' ? node.path : null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggingPath && node.type === 'directory') {
            if (draggingPath === node.path || isDescendant(node.path, draggingPath)) {
              setDraggingPath(null);
              setDropTarget(null);
              return;
            }
            const baseName = draggingPath.split('/').pop() || draggingPath;
            const target = normalizePath(node.path, baseName);
            handleMove(draggingPath, target);
          }
          setDraggingPath(null);
          setDropTarget(null);
        }}
      >
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


  const normalizePath = (base: string, relative: string) => {
    const cleanBase = base === '/' ? '' : base.replace(/\/+$/, '');
    const cleanRel = relative.replace(/^\/+/, '');
    return `${cleanBase}/${cleanRel}`.replace(/\/+/g, '/');
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
    await uploadFiles(Array.from(files).map((file) => ({ file, relPath: file.name })));
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

  type UploadItem = { file: File; relPath?: string };

  const uploadFiles = async (items: UploadItem[]) => {
    for (const item of items) {
      const rel = item.relPath || (item.file as any).webkitRelativePath || item.file.webkitRelativePath || item.file.name;
      const targetPath = normalizePath(currentPath || '/', rel);
      const dirs = targetPath.split('/').filter(Boolean);
      let acc = '';
      for (let i = 0; i < dirs.length - 1; i++) {
        acc += `/${dirs[i]}`;
        try {
          await createDirectory(acc || '/');
        } catch {
          // ignore
        }
      }
      const base64 = await readFileAsBase64(item.file);
      await uploadFile(targetPath, base64);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropActive(false);
    if (draggingPath) {
      const targetBase = dropTarget || currentPath || '/';
      const baseName = draggingPath.split('/').pop() || draggingPath;
      if (draggingPath === targetBase || isDescendant(draggingPath, targetBase)) {
        setDraggingPath(null);
        setDropTarget(null);
        return;
      }
      const target = normalizePath(targetBase, baseName);
      await handleMove(draggingPath, target);
      setDraggingPath(null);
      setDropTarget(null);
      return;
    }
    const droppedItems = await getFilesFromDataTransfer(e.dataTransfer);
    const files = droppedItems.length
      ? droppedItems
      : Array.from(e.dataTransfer.files || []).map((file) => ({ file, relPath: file.name }));
    if (!files.length) return;
    await uploadFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropActive(true);
    if (draggingPath) {
      setDropTarget(currentPath || '/');
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropActive(false);
    if (!draggingPath) {
      setDropTarget(null);
    }
  };

  const handleMove = async (from: string, to: string) => {
    if (from === to) return;
    await renamePath(from, to);
    await loadFileTree(currentPath || '/');
  };

  const isDescendant = (parent: string, child: string) => {
    const p = parent.replace(/\/+$/, '') + '/';
    return child !== parent && child.startsWith(p);
  };

  const getFilesFromDataTransfer = async (dt: DataTransfer): Promise<UploadItem[]> => {
    const items = dt.items;
    if (!items) return [];
    const entries = Array.from(items)
      .map((item) => (item as any).webkitGetAsEntry?.() as FileSystemEntry | null)
      .filter(Boolean) as FileSystemEntry[];

    const filePromises: Promise<UploadItem[]>[] = entries.map((entry) => walkEntry(entry, ''));
    const nested = await Promise.all(filePromises);
    return nested.flat();
  };

  const walkEntry = (entry: FileSystemEntry, pathPrefix: string): Promise<UploadItem[]> => {
    return new Promise((resolve, reject) => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        fileEntry.file(
          (file) => {
            resolve([{ file, relPath: pathPrefix ? `${pathPrefix}/${file.name}` : file.name }]);
          },
          (err) => reject(err)
        );
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();
        const entries: FileSystemEntry[] = [];
        const readEntries = () => {
          reader.readEntries(
            (batch) => {
              if (!batch.length) {
                const childPromises = entries.map((child) =>
                  walkEntry(child, pathPrefix ? `${pathPrefix}/${dirEntry.name}` : dirEntry.name)
                );
                Promise.all(childPromises)
                  .then((childFiles) => resolve(childFiles.flat()))
                  .catch(reject);
                return;
              }
              entries.push(...batch);
              readEntries();
            },
            (err) => reject(err)
          );
        };
        readEntries();
      } else {
        resolve([]);
      }
    });
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

  const breadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = ['/', ...parts.map((_, idx) => '/' + parts.slice(0, idx + 1).join('/'))];
    return crumbs;
  };

  return (
    <div className="file-tree">
      <div className="tree-header">
        <h3>Files</h3>
        <div className="tree-breadcrumb">
          {breadcrumbs().map((p, idx) => (
            <span key={p} onClick={() => navigateTo(p)} className="crumb">
              {idx === 0 ? 'Root' : p.split('/').filter(Boolean).pop()}
              {idx < breadcrumbs().length - 1 && <span className="crumb-sep">/</span>}
            </span>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          // @ts-expect-error webkitdirectory support for folder uploads
          webkitdirectory="true"
          // @ts-expect-error directory support
          directory="true"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error webkitdirectory support
          webkitdirectory="true"
          // @ts-expect-error directory support
          directory="true"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
      </div>
      <div
        className={`tree-content ${dropActive ? 'drop-active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {fileTree.length === 0 ? (
          <div className="tree-empty">No files found</div>
        ) : (
          fileTree.map((node) => renderNode(node))
        )}
      </div>
    </div>
  );
};
