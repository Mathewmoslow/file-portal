import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import { readFileBuffer } from './_lib/sftp.js';
import { authenticateRequest } from './_lib/auth.js';
import { CryptoService } from './_lib/crypto.js';

// Built-in MIME types
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.zip': 'application/zip',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Script injected into HTML to make fetch() resolve relative URLs through /api/serve
 */
function getFetchHelperScript(basePath: string, token: string): string {
  const baseDir = path.posix.dirname(basePath);
  return `<script>(function(){var d="${baseDir}",t="${token}",o=window.fetch;window.fetch=function(u,p){if(typeof u==="string"&&!u.match(/^(https?:|\\\/|data:|blob:)/)){u="/api/serve?path="+encodeURIComponent(d+"/"+u)+(t?"&token="+t:"");}return o.call(this,u,p);};var X=XMLHttpRequest.prototype.open,O=X;XMLHttpRequest.prototype.open=function(m,u){if(typeof u==="string"&&!u.match(/^(https?:|\\\/|data:|blob:)/)){u="/api/serve?path="+encodeURIComponent(d+"/"+u)+(t?"&token="+t:"");}return O.call(this,m,u);};})();</script>`;
}

/**
 * Rewrite relative URLs in HTML to use the serve endpoint
 */
function rewriteHtmlUrls(html: string, basePath: string, token: string): string {
  const baseDir = path.posix.dirname(basePath);

  // Inject fetch helper script right after <head>
  const fetchHelper = getFetchHelperScript(basePath, token);
  html = html.replace(/<head([^>]*)>/i, `<head$1>${fetchHelper}`);

  // Rewrite src and href attributes that are relative paths
  return html.replace(
    /(src|href)=["'](?!https?:\/\/|\/\/|data:|#|mailto:|javascript:)([^"']+)["']/gi,
    (match, attr, url) => {
      // Skip absolute paths and anchors
      if (url.startsWith('/') || url.startsWith('#')) {
        return match;
      }

      // Resolve relative path
      const resolvedPath = path.posix.normalize(`${baseDir}/${url}`);
      const serveUrl = `/api/serve?path=${encodeURIComponent(resolvedPath)}&token=${token}`;

      return `${attr}="${serveUrl}"`;
    }
  );
}

/**
 * File serving endpoint
 * GET /api/serve?path=/folder/file.html&token=SHARE_TOKEN
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get path from query parameter
    const filePath = req.query.path as string;

    if (!filePath) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    // Normalize path
    const normalized = path.posix.normalize(filePath.startsWith('/') ? filePath : '/' + filePath);

    if (normalized.includes('..')) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    // Check authorization
    const shareToken = req.query.token as string | undefined;
    let authorized = false;
    let tokenBasePath: string | null = null;

    if (shareToken) {
      const shareData = CryptoService.verifyShareToken(shareToken);
      if (shareData) {
        const tokenPath = path.posix.normalize(shareData.path);
        const tokenDir = path.posix.dirname(tokenPath);
        const requestDir = path.posix.dirname(normalized);

        // Allow access if:
        // 1. Exact path match, OR
        // 2. Same directory (for relative assets like images/css/js)
        if (tokenPath === normalized || tokenDir === requestDir) {
          authorized = true;
          tokenBasePath = tokenPath;
        }
      }
    }

    if (!authorized) {
      const auth = authenticateRequest(req);
      authorized = auth.authenticated;
    }

    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Read and serve file
    const buffer = await readFileBuffer(normalized);
    let mimeType = getMimeType(normalized);
    const ext = path.extname(normalized).toLowerCase();

    // For .docx files in our processor, they contain HTML - serve as HTML for preview
    const isProcessorDoc = ['.docx', '.doc'].includes(ext);
    if (isProcessorDoc) {
      const content = buffer.toString('utf-8');
      // Check if it's HTML content (our processor format)
      if (content.trim().startsWith('<') || content.includes('<p>') || content.includes('<div>')) {
        mimeType = 'text/html';
      }
    }

    // For HTML files, rewrite relative URLs and inject fetch helper
    if (mimeType === 'text/html') {
      const html = buffer.toString('utf-8');
      const token = shareToken || (req.query.token as string) || '';
      const rewrittenHtml = rewriteHtmlUrls(html, normalized, token);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', Buffer.byteLength(rewrittenHtml));
      res.setHeader('Cache-Control', 'public, max-age=3600');

      return res.status(200).send(rewrittenHtml);
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    return res.status(200).send(buffer);

  } catch (error: any) {
    if (error.message?.includes('No such file') || error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    return res.status(500).json({ error: 'Server error' });
  }
}
