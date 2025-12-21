import type { VercelRequest, VercelResponse } from '@vercel/node';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface CompanionRequest {
  mode: 'action' | 'chat' | 'autonomous';
  action?: string;
  text?: string;
  threadId?: string;
  voiceId: string;
  rules: string[];
  tweaks?: string;
}

/**
 * AI Companion endpoint
 * POST /api/companion
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

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'AI companion not configured. Please set ANTHROPIC_API_KEY in environment variables.'
    });
  }

  try {
    const body = req.body as CompanionRequest;
    const { mode, action, text, voiceId, rules, tweaks } = body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text content' });
    }

    // Build the system prompt based on voice and rules
    let systemPrompt = `You are a writing assistant helping to edit and improve documents.`;

    if (voiceId) {
      systemPrompt += `\n\nWriting voice/style to use: ${voiceId}`;
    }

    if (rules && rules.length > 0) {
      systemPrompt += `\n\nWriting rules to follow:\n${rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
    }

    // Build the user message based on mode and action
    let userMessage = '';

    if (mode === 'action' && action) {
      userMessage = `Please perform the following action on this text: ${action}\n\nText to edit:\n${text}`;
      if (tweaks) {
        userMessage += `\n\nAdditional instructions: ${tweaks}`;
      }
    } else if (mode === 'chat') {
      userMessage = text;
      if (tweaks) {
        userMessage += `\n\nContext/instructions: ${tweaks}`;
      }
    } else if (mode === 'autonomous') {
      userMessage = `Automatically improve this text according to the writing rules and style guide:\n\n${text}`;
      if (tweaks) {
        userMessage += `\n\nFocus on: ${tweaks}`;
      }
    } else {
      userMessage = text;
    }

    // Call Anthropic API
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Using Haiku for speed and cost efficiency
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errorText);
      return res.status(anthropicRes.status).json({
        error: `AI request failed: ${anthropicRes.status}`
      });
    }

    const data = await anthropicRes.json();
    const responseText = data.content?.[0]?.text || '';

    return res.status(200).json({
      text: responseText,
      auditFlags: [], // Could be populated if we parse the response for issues
    });

  } catch (error: any) {
    console.error('Companion API error:', error);
    return res.status(500).json({ error: error?.message || 'Companion request failed' });
  }
}
