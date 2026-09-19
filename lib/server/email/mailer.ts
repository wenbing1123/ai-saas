import nodemailer, { type Transporter } from 'nodemailer';
import { getSettings } from '@/lib/repositories/settings';
import { logger } from '@/lib/server/logger';
import { appConfig } from '@/config/app';
import type { SmtpConfig } from '@/lib/types';

/**
 * SMTP transport for transactional mail (activation links, password resets).
 *
 * Configuration resolves per send from platform settings (admin panel) with
 * SMTP_* environment variables as fallback. When no host is configured the app
 * runs in dev "log mode": messages are printed to the server console instead
 * of being sent, so local development works without a mail server.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

declare global {
  // eslint-disable-next-line no-var
  var nebulaSmtp: { signature: string; transport: Transporter } | undefined;
}

async function resolveSmtp(): Promise<SmtpConfig | null> {
  const settings = await getSettings();
  const env = process.env;
  const stored = settings.smtp ?? { host: '', port: 587, secure: false, user: '', pass: '', from: '' };
  const host = stored.host || env.SMTP_HOST || '';
  if (!host) return null;

  const fallbackFrom = (() => {
    try {
      const host2 = new URL(appConfig.appUrl).hostname;
      return `${appConfig.name} <no-reply@${host2}>`;
    } catch {
      return `${appConfig.name} <${appConfig.supportEmail}>`;
    }
  })();

  return {
    host,
    port: Number(stored.port || env.SMTP_PORT || 587),
    secure: stored.secure || env.SMTP_SECURE === 'true',
    user: stored.user || env.SMTP_USER || '',
    pass: stored.pass || env.SMTP_PASS || '',
    from: stored.from || env.SMTP_FROM || fallbackFrom,
  };
}

function getTransport(cfg: SmtpConfig): Transporter {
  const signature = JSON.stringify(cfg);
  if (!globalThis.nebulaSmtp || globalThis.nebulaSmtp.signature !== signature) {
    globalThis.nebulaSmtp = {
      signature,
      transport: nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      }),
    };
  }
  return globalThis.nebulaSmtp.transport;
}

/**
 * Send a transactional email.
 * @returns 'smtp' when delivered, 'log' when no SMTP host is configured.
 */
export async function sendEmail(msg: EmailMessage): Promise<'smtp' | 'log'> {
  const cfg = await resolveSmtp();
  if (!cfg) {
    logger.info(
      { to: msg.to, subject: msg.subject, text: msg.text },
      '✉️ EMAIL (SMTP not configured — log mode)',
    );
    return 'log';
  }
  await getTransport(cfg).sendMail({
    from: cfg.from,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
  return 'smtp';
}
