import crypto from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

export const SESSION_COOKIE = 'rp_session';
export const OAUTH_STATE_COOKIE = 'rp_oauth_state';

export type SessionData = {
  githubId: number;
  login: string;
  name: string | null;
  avatarUrl: string;
  accessToken: string;
  selectedRepoFullName?: string;
  selectedRepoId?: string;
};

export type PublicUser = {
  login: string;
  name: string | null;
  avatarUrl: string;
  selectedRepoFullName?: string;
  selectedRepoId?: string;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set');
  }
  return secret;
}

export function signSession(data: SessionData): string {
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function parseSession(token: string): SessionData | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionData;
  } catch {
    return null;
  }
}

function readCookie(req: NextApiRequest, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export function getSession(req: NextApiRequest): SessionData | null {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  return parseSession(token);
}

export function toPublicUser(session: SessionData): PublicUser {
  return {
    login: session.login,
    name: session.name,
    avatarUrl: session.avatarUrl,
    selectedRepoFullName: session.selectedRepoFullName,
    selectedRepoId: session.selectedRepoId
  };
}

function cookieFlags(maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function setSessionCookie(res: NextApiResponse, data: SessionData): void {
  const token = signSession(data);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieFlags(60 * 60 * 24 * 7)}`);
}

export function clearSessionCookie(res: NextApiResponse): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
}

export function setOAuthStateCookie(res: NextApiResponse, state: string): void {
  res.setHeader('Set-Cookie', `${OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; ${cookieFlags(600)}`);
}

export function readOAuthState(req: NextApiRequest): string | null {
  return readCookie(req, OAUTH_STATE_COOKIE);
}

export function clearOAuthStateCookie(res: NextApiResponse): void {
  res.setHeader('Set-Cookie', `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
}

export function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
