import { create } from 'zustand';
import { api } from '../services/api';
import type { FileNode, FileData } from '../types';

interface FileStore {
  // State
  fileTree: FileNode[];
  openFiles: Map<string, FileData>;
  activeFile: string | null;
  unsavedFiles: Set<string>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadFileTree: (path?: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  saveFile: (path: string, content: string) => Promise<void>;
  setActiveFile: (path: string | null) => void;
  updateFileContent: (path: string, content: string) => void;
  createFile: (path: string, content?: string) => Promise<void>;
  uploadFile: (path: string, base64: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
}

export const useFileStore = create<FileStore>((set, get) => ({
  fileTree: [],
  openFiles: new Map(),
  activeFile: null,
  unsavedFiles: new Set(),
  isLoading: false,
  error: null,

  loadFileTree: async (path = '/') => {
    set({ isLoading: true, error: null });
    try {
      const items = await api.listFiles(path);
      set({ fileTree: items, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  openFile: async (path: string) => {
    const { openFiles } = get();

    // If already open, just set as active
    if (openFiles.has(path)) {
      set({ activeFile: path });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const file = await api.readFile(path);
      const newOpenFiles = new Map(openFiles);
      newOpenFiles.set(path, file);
      set({
        openFiles: newOpenFiles,
        activeFile: path,
        isLoading: false
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  closeFile: (path: string) => {
    const { openFiles, activeFile, unsavedFiles } = get();
    const newOpenFiles = new Map(openFiles);
    newOpenFiles.delete(path);

    const newUnsavedFiles = new Set(unsavedFiles);
    newUnsavedFiles.delete(path);

    const newActiveFile = activeFile === path
      ? (newOpenFiles.size > 0 ? Array.from(newOpenFiles.keys())[0] : null)
      : activeFile;

    set({
      openFiles: newOpenFiles,
      activeFile: newActiveFile,
      unsavedFiles: newUnsavedFiles
    });
  },

  saveFile: async (path: string, content: string) => {
    const current = get().openFiles.get(path);
    if (current?.isBinary) {
      set({ error: 'Binary files are not editable here.' });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      await api.updateFile(path, content);
      const { unsavedFiles } = get();
      const newUnsavedFiles = new Set(unsavedFiles);
      newUnsavedFiles.delete(path);
      set({ unsavedFiles: newUnsavedFiles, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setActiveFile: (path: string | null) => {
    set({ activeFile: path });
  },

  updateFileContent: (path: string, content: string) => {
    const current = get().openFiles.get(path);
    if (current?.isBinary) return;
    const { openFiles, unsavedFiles } = get();
    const newOpenFiles = new Map(openFiles);
    if (current) {
      newOpenFiles.set(path, { ...current, content });
    }

    const newUnsavedFiles = new Set(unsavedFiles);
    newUnsavedFiles.add(path);

    set({
      openFiles: newOpenFiles,
      unsavedFiles: newUnsavedFiles
    });
  },

  createFile: async (path: string, content = '') => {
    set({ isLoading: true, error: null });
    try {
      await api.createFile(path, content);
      await get().loadFileTree();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  uploadFile: async (path: string, base64: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.uploadBase64(path, base64);
      await get().loadFileTree();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteFile: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteFile(path);
      get().closeFile(path);
      await get().loadFileTree();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createDirectory: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.createDirectory(path);
      await get().loadFileTree();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
