import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CryptoService } from '../_lib/crypto.js';
import * as docx from 'docx';

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx as any;
type DocxTextRun = any;

interface ParsedElement {
  type: 'paragraph' | 'heading' | 'list' | 'table' | 'image' | 'blockquote';
  level?: number;
  text?: string;
  runs?: DocxTextRun[];
  children?: ParsedElement[];
  src?: string;
  rows?: string[][];
  align?: 'left' | 'center' | 'right' | 'justify';
  listType?: 'bullet' | 'number';
}

// Simple HTML to text content extractor
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Parse inline styles and create TextRuns
function parseInlineContent(html: string): TextRun[] {
  const runs: TextRun[] = [];

  // Simple regex-based parsing for common formatting
  const parts = html.split(/(<\/?(?:b|strong|i|em|u|s|strike|sup|sub|a)[^>]*>)/gi);

  let bold = false;
  let italic = false;
  let underline = false;
  let strike = false;
  let superscript = false;
  let subscript = false;

  for (const part of parts) {
    const lower = part.toLowerCase();

    if (lower === '<b>' || lower === '<strong>') {
      bold = true;
    } else if (lower === '</b>' || lower === '</strong>') {
      bold = false;
    } else if (lower === '<i>' || lower === '<em>') {
      italic = true;
    } else if (lower === '</i>' || lower === '</em>') {
      italic = false;
    } else if (lower === '<u>') {
      underline = true;
    } else if (lower === '</u>') {
      underline = false;
    } else if (lower === '<s>' || lower === '<strike>') {
      strike = true;
    } else if (lower === '</s>' || lower === '</strike>') {
      strike = false;
    } else if (lower === '<sup>') {
      superscript = true;
    } else if (lower === '</sup>') {
      superscript = false;
    } else if (lower === '<sub>') {
      subscript = true;
    } else if (lower === '</sub>') {
      subscript = false;
    } else if (!part.startsWith('<')) {
      const text = htmlToText(part);
      if (text) {
        runs.push(new TextRun({
          text,
          bold,
          italics: italic,
          underline: underline ? {} : undefined,
          strike,
          superScript: superscript,
          subScript: subscript,
        }));
      }
    }
  }

  // If no runs were created, just return plain text
  if (runs.length === 0) {
    const text = htmlToText(html);
    if (text) {
      runs.push(new TextRun({ text }));
    }
  }

  return runs;
}

// Parse HTML and convert to docx paragraphs
function parseHtmlToDocx(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Split by block elements
  const blocks = html.split(/<\/(?:p|div|h[1-6]|li|blockquote|tr)>/gi);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Check for headings
    const h1Match = trimmed.match(/<h1[^>]*>([\s\S]*?)$/i);
    const h2Match = trimmed.match(/<h2[^>]*>([\s\S]*?)$/i);
    const h3Match = trimmed.match(/<h3[^>]*>([\s\S]*?)$/i);
    const h4Match = trimmed.match(/<h4[^>]*>([\s\S]*?)$/i);

    if (h1Match) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: parseInlineContent(h1Match[1]),
      }));
    } else if (h2Match) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: parseInlineContent(h2Match[1]),
      }));
    } else if (h3Match) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: parseInlineContent(h3Match[1]),
      }));
    } else if (h4Match) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_4,
        children: parseInlineContent(h4Match[1]),
      }));
    } else {
      // Check for list items
      const liMatch = trimmed.match(/<li[^>]*>([\s\S]*?)$/i);
      if (liMatch) {
        const isOrdered = /<ol/i.test(trimmed);
        paragraphs.push(new Paragraph({
          bullet: isOrdered ? undefined : { level: 0 },
          numbering: isOrdered ? { reference: 'default-numbering', level: 0 } : undefined,
          children: parseInlineContent(liMatch[1]),
        }));
      } else {
        // Check for blockquote
        const bqMatch = trimmed.match(/<blockquote[^>]*>([\s\S]*?)$/i);
        if (bqMatch) {
          paragraphs.push(new Paragraph({
            indent: { left: 720 },
            children: [
              new TextRun({ text: '"', italics: true }),
              ...parseInlineContent(bqMatch[1]),
              new TextRun({ text: '"', italics: true }),
            ],
          }));
        } else {
          // Regular paragraph
          const pMatch = trimmed.match(/<(?:p|div)[^>]*>([\s\S]*?)$/i);
          const content = pMatch ? pMatch[1] : trimmed;

          // Check alignment from style
          let alignment = AlignmentType.LEFT;
          if (/text-align:\s*center/i.test(trimmed)) {
            alignment = AlignmentType.CENTER;
          } else if (/text-align:\s*right/i.test(trimmed)) {
            alignment = AlignmentType.RIGHT;
          } else if (/text-align:\s*justify/i.test(trimmed)) {
            alignment = AlignmentType.JUSTIFIED;
          }

          const runs = parseInlineContent(content);
          if (runs.length > 0) {
            paragraphs.push(new Paragraph({
              alignment,
              children: runs,
            }));
          }
        }
      }
    }
  }

  // If no paragraphs were created, create one with all content
  if (paragraphs.length === 0) {
    const text = htmlToText(html);
    if (text) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text })],
      }));
    }
  }

  return paragraphs;
}

/**
 * DOCX Export endpoint
 * POST /api/export/docx
 * Body: { html: string, filename?: string }
 * Auth: Bearer token OR share token (query param)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authorization - accept bearer token OR share token
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.toString().split(' ')[1];
    const shareToken = req.query.token as string | undefined;

    let authorized = false;

    // Check bearer token
    if (bearerToken) {
      const decoded = CryptoService.verifyToken(bearerToken);
      if (decoded) {
        authorized = true;
      }
    }

    // Check share token if bearer didn't work
    if (!authorized && shareToken) {
      const shareData = CryptoService.verifyShareToken(shareToken);
      if (shareData) {
        authorized = true;
      }
    }

    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get HTML content
    const { html, filename } = req.body || {};

    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'Missing html content' });
    }

    // Parse HTML and create document
    const paragraphs = parseHtmlToDocx(html);

    const doc = new Document({
      title: filename || 'Document',
      creator: 'File Atelier',
      numbering: {
        config: [{
          reference: 'default-numbering',
          levels: [{
            level: 0,
            format: 'decimal',
            text: '%1.',
            alignment: AlignmentType.START,
          }],
        }],
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch in twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: paragraphs,
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    const safeName = (filename && typeof filename === 'string'
      ? filename.replace(/\.[^.]+$/, '')
      : 'document') + '.docx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

    return res.status(200).send(Buffer.from(buffer));

  } catch (error: any) {
    console.error('DOCX export error:', error);
    return res.status(500).json({ error: error?.message || 'Export failed' });
  }
}
