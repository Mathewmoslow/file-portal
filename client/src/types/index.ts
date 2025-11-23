export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  modified?: string;
  children?: FileNode[];
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface FileResponse {
  success: boolean;
  file?: {
    path: string;
    name: string;
    content: string;
    size: number;
    modified: string;
    checksum: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface FileListResponse {
  success: boolean;
  path: string;
  items: FileNode[];
  totalItems: number;
  error?: {
    code: string;
    message: string;
  };
}
