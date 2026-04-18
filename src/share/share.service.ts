import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

const TTL_MS = parseInt(process.env.SHARE_CONFIG_TTL_SECONDS ?? '604800') * 1000;

interface ShareEntry {
  config: Record<string, unknown>;
  createdAt: Date;
  timer: ReturnType<typeof setTimeout>;
}

@Injectable()
export class ShareService {
  private readonly shares = new Map<string, ShareEntry>();

  createShare(config: Record<string, unknown>): { token: string; expiresAt: string } {
    const safeConfig = this.sanitize(config);
    const token = uuidv4().replace(/-/g, '').slice(0, 12);
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

    const timer = setTimeout(() => {
      this.shares.delete(token);
    }, TTL_MS);

    // Don't block process exit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (timer as any).unref?.();

    this.shares.set(token, { config: safeConfig, createdAt: new Date(), timer });
    return { token, expiresAt };
  }

  getShare(token: string): Record<string, unknown> | null {
    return this.shares.get(token)?.config ?? null;
  }

  /** Strip credential fields before storing. */
  private sanitize(config: Record<string, unknown>): Record<string, unknown> {
    const safe = { ...config };
    if (typeof safe.config === 'object' && safe.config !== null) {
      const inner = { ...(safe.config as Record<string, unknown>) };
      delete inner.password;
      delete inner.apiKeyValue;
      if (inner.auth && typeof inner.auth === 'object') {
        const auth = { ...(inner.auth as Record<string, unknown>) };
        delete auth.token;
        delete auth.password;
        delete auth.apiKeyValue;
        inner.auth = auth;
      }
      safe.config = inner;
    }
    return safe;
  }
}
