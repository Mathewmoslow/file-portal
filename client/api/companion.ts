import type { VercelRequest, VercelResponse } from '@vercel/node';

interface CompanionRequest {
  mode: 'action' | 'chat' | 'autonomous';
  action?: string;
  text?: string;
  threadId?: string;
  voiceId?: string;
  rules?: string[];
  tweaks?: string;
}

/**
 * AI Companion endpoint
 * POST /api/companion
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key inside handler to ensure fresh read
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not found in environment');
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

    if (rules && Array.isArray(rules) && rules.length > 0) {
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
    console.log('Calling Anthropic API with mode:', mode);

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
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
      return res.status(500).json({
        error: `AI request failed: ${anthropicRes.status}`,
        details: errorText
      });
    }

    const data = await anthropicRes.json();
    const responseText = data.content?.[0]?.text || '';

    console.log('Anthropic API response received, length:', responseText.length);

    return res.status(200).json({
      text: responseText,
      auditFlags: [],
    });

  } catch (error: any) {
    console.error('Companion API error:', error?.message, error?.stack);
    return res.status(500).json({
      error: error?.message || 'Companion request failed',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
