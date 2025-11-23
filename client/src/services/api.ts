import axios, { type AxiosInstance } from 'axios';
import type { AuthResponse, FileListResponse, FileResponse, FileNode } from '../types';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      timeout: 30000,
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

    // Load token from localStorage
    this.token = localStorage.getItem('token');
  }

  // Authentication
  async login(password: string): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>('/auth/login', { password });
      if (response.data.success && response.data.token) {
        this.token = response.data.token;
        localStorage.setItem('token', this.token);
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
    localStorage.removeItem('token');
  }

  // File operations
  async listFiles(path = '/'): Promise<FileNode[]> {
    const response = await this.client.get<FileListResponse>('/files/list', {
      params: { path },
    });
    return response.data.items || [];
  }

  async readFile(path: string): Promise<string> {
    const response = await this.client.get<FileResponse>('/files/read', {
      params: { path },
    });
    return response.data.file?.content || '';
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

  isAuthenticated(): boolean {
    return this.token !== null;
  }
}

export const api = new ApiService();
