import { getDict } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { appConfig } from '@/config/app';
import type { EmailMessage } from './mailer';

/** Bilingual transactional email templates (activation + password reset). */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface TemplateVars {
  name: string;
  url: string;
}

function wrapHtml(contentHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr>
        <td style="padding:24px 0;text-align:center;">
          <span style="font-size:18px;font-weight:700;color:#111827;">${escapeHtml(appConfig.name)}</span>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:32px;">
          ${contentHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 0;text-align:center;font-size:12px;color:#a1a1aa;">${escapeHtml(appConfig.supportEmail)}</td>
      </tr>
    </table>
  </body>
</html>`;
}

function buttonCard(t: {
  subject: string;
  hello: (name: string) => string;
  intro: string;
  cta: string;
  expires: string;
  fallback: string;
  ignore: string;
}, vars: TemplateVars): Pick<EmailMessage, 'subject' | 'text' | 'html'> {
  const html = wrapHtml(`
    <p style="margin:0 0 16px;font-size:14px;color:#111827;">${escapeHtml(t.hello(vars.name))}</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#3f3f46;">${escapeHtml(t.intro)}</p>
    <p style="margin:0 0 24px;text-align:center;">
      <a href="${escapeHtml(vars.url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">${escapeHtml(t.cta)}</a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:#71717a;">${escapeHtml(t.expires)}</p>
    <p style="margin:0 0 8px;font-size:12px;color:#71717a;">${escapeHtml(t.fallback)}</p>
    <p style="margin:8px 0 0;font-size:12px;color:#a1a1aa;word-break:break-all;">${escapeHtml(vars.url)}</p>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />
    <p style="margin:0;font-size:12px;color:#a1a1aa;">${escapeHtml(t.ignore)}</p>`);
  const text = [
    t.hello(vars.name),
    '',
    t.intro,
    '',
    `${t.cta}: ${vars.url}`,
    t.expires,
    '',
    t.fallback,
    vars.url,
    '',
    t.ignore,
  ].join('\n');
  return { subject: t.subject, text, html };
}

export function renderActivationMail(locale: Locale, vars: TemplateVars): EmailMessage {
  const t = getDict(locale).marketing.emails.activation;
  return { to: '', ...buttonCard(t, vars) };
}

export function renderResetMail(locale: Locale, vars: TemplateVars): EmailMessage {
  const t = getDict(locale).marketing.emails.reset;
  return { to: '', ...buttonCard(t, vars) };
}
