import type { VercelResponse } from '@vercel/node';

export function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

export function handleOptions(res: VercelResponse) {
  setCorsHeaders(res);
  res.status(200).end();
}
