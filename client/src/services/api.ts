import axios, { type AxiosInstance } from 'axios';
import type { AuthResponse, FileListResponse, FileResponse, FileNode, FileData } from '../types';
import { getApiBase } from '../utils/apiBase';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: getApiBase(),
      timeout: 0,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, clear auth
          this.token = null;
          localStorage.removeItem('token');
        }
        return Promise.reject(error);
      }
    );

    // Clear old persisted token and load session token
    try {
      localStorage.removeItem('token');
    } catch {
      // ignore
    }
    this.token = sessionStorage.getItem('token');
  }

  // Authentication
  async login(password: string): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>('/auth/login', { password });
      if (response.data.success && response.data.token) {
        this.token = response.data.token;
        sessionStorage.setItem('token', this.token);
      }
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: error.response?.data?.error?.message || 'Login failed',
        },
      };
    }
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    this.token = null;
    sessionStorage.removeItem('token');
  }

  // File operations
  async listFiles(path = '/'): Promise<FileNode[]> {
    const response = await this.client.get<FileListResponse>('/files/list', {
      params: { path },
    });
    return response.data.items || [];
  }

  async readFile(path: string): Promise<FileData> {
    const response = await this.client.get<FileResponse>('/files/read', {
      params: { path },
    });
    if (!response.data.file) {
      throw new Error(response.data.error?.message || 'Unable to read file');
    }
    return response.data.file;
  }

  async createFile(path: string, content = ''): Promise<void> {
    await this.client.post('/files/create', { path, content });
  }

  async updateFile(path: string, content: string): Promise<void> {
    await this.client.put('/files/update', { path, content });
  }

  async deleteFile(path: string, recursive = false): Promise<void> {
    await this.client.delete('/files/delete', {
      data: { path, recursive },
    });
  }

  async createDirectory(path: string): Promise<void> {
    await this.client.post('/files/dir/create', { path });
  }

  async uploadBase64(path: string, base64: string): Promise<void> {
    await this.client.post('/files/upload', { path, contentBase64: base64 });
  }

  async renamePath(from: string, to: string): Promise<void> {
    await this.client.post('/files/rename', { from, to });
  }

  async searchFiles(query: string, limit = 50): Promise<FileNode[]> {
    const response = await this.client.get<{
      success: boolean;
      results: FileNode[];
      totalResults: number;
    }>('/files/search', {
      params: { q: query, limit },
    });
    return response.data.results || [];
  }

  async generateShareLink(path: string, expiresIn: string = '7d'): Promise<{ shareUrl: string; expiresIn: string }> {
    const response = await this.client.post<{
      success: boolean;
      shareUrl: string;
      expiresIn: string;
      error?: { message: string };
    }>('/files/share', { path, expiresIn });

    if (!response.data.success || !response.data.shareUrl) {
      throw new Error(response.data.error?.message || 'Failed to generate share link');
    }

    return {
      shareUrl: response.data.shareUrl,
      expiresIn: response.data.expiresIn
    };
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }
}

export const api = new ApiService();
