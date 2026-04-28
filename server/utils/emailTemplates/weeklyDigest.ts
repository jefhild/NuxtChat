import { t } from "../emailI18n";

export interface AttributedUser {
  name: string;
  slug: string;
}

export interface InteractionSummary {
  total: number;
  attributed: AttributedUser[];
}

export interface WeeklyDigestData {
  displayname: string;
  email: string;
  slug: string;
  periodStart: string;
  periodEnd: string;
  favorites: InteractionSummary;
  upvotes: InteractionSummary;
  messages: InteractionSummary;
  settingsUrl: string;
  siteUrl: string;
}

export interface WeeklyDigestCustomBlock {
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
}

function renderAttributionList(
  summary: InteractionSummary,
  locale: string,
  profileBaseUrl: string
): string {
  const anonymousCount = summary.total - summary.attributed.length;
  const lines: string[] = [];

  for (const user of summary.attributed) {
    lines.push(
      `<a href="${profileBaseUrl}/profiles/${user.slug}" style="color:#6366f1;text-decoration:none;">${escapeHtml(user.name)}</a>`
    );
  }

  if (anonymousCount > 0 && summary.attributed.length > 0) {
    lines.push(
      `<span style="color:#9ca3af;">${t("emails.digest.attributed_suffix", locale, { n: anonymousCount })}</span>`
    );
  } else if (anonymousCount > 0) {
    lines.push(
      `<span style="color:#9ca3af;">${t("emails.digest.anonymous_only", locale, { n: anonymousCount })}</span>`
    );
  }

  return lines.join(", ");
}

function renderSection(
  heading: string,
  countSuffix: string,
  summary: InteractionSummary,
  locale: string,
  profileBaseUrl: string,
  countLink: string
): string {
  if (summary.total === 0) return "";

  const attribution = renderAttributionList(summary, locale, profileBaseUrl);

  return `
    <tr>
      <td style="padding:20px 0 16px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#374151;">${escapeHtml(heading)}</p>
        <p style="margin:0;line-height:1;">
          <a href="${countLink}" style="font-size:36px;font-weight:700;color:#6366f1;text-decoration:none;">${summary.total}</a>
          <span style="font-size:14px;color:#9ca3af;margin-left:8px;">${escapeHtml(countSuffix)}</span>
        </p>
        ${attribution ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280;">${attribution}</p>` : ""}
      </td>
    </tr>
    <tr><td style="border-top:1px solid #f3f4f6;padding:0;"></td></tr>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderWeeklyDigest(
  data: WeeklyDigestData,
  locale: string,
  options: { customBlock?: WeeklyDigestCustomBlock | null } = {}
): string {
  const customBlock = options.customBlock || null;
  const profileUrl = `${data.siteUrl}/profiles/${data.slug}`;
  const chatUrl = `${data.siteUrl}/chat`;
  const hasActivity =
    data.favorites.total > 0 ||
    data.upvotes.total > 0 ||
    data.messages.total > 0;

  const sections = hasActivity
    ? [
        renderSection(
          t("emails.digest.favorites_heading", locale),
          t("emails.digest.times", locale),
          data.favorites,
          locale,
          data.siteUrl,
          profileUrl
        ),
        renderSection(
          t("emails.digest.upvotes_heading", locale),
          t("emails.digest.times", locale),
          data.upvotes,
          locale,
          data.siteUrl,
          profileUrl
        ),
        renderSection(
          t("emails.digest.messages_heading", locale),
          t("emails.digest.conversations_waiting", locale),
          data.messages,
          locale,
          data.siteUrl,
          chatUrl
        ),
      ].join("")
    : "";

  const activityContent = hasActivity
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f3f4f6;">${sections}</table>`
    : `<p style="color:#6b7280;font-size:15px;margin:24px 0;">${t("emails.digest.quiet_week", locale)}</p>`;

  const ctaUrl = data.messages.total > 0 ? chatUrl : profileUrl;
  const ctaLabel = data.messages.total > 0
    ? t("emails.digest.cta_chat", locale)
    : t("emails.digest.view_profile", locale);

  const customBlockHtml = customBlock
    ? `
              <div style="margin:0 0 24px;padding:18px 18px 6px;border:1px solid #e5e7eb;border-radius:14px;background:#f8fafc;">
                ${customBlock.title ? `<p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#111827;">${escapeHtml(customBlock.title)}</p>` : ""}
                ${customBlock.bodyHtml || ""}
                ${
                  customBlock.ctaLabel && customBlock.ctaUrl
                    ? `<p style="margin:4px 0 12px;"><a href="${customBlock.ctaUrl}" style="display:inline-block;background:#eef2ff;color:#4338ca;text-decoration:none;font-size:13px;font-weight:700;padding:10px 16px;border-radius:999px;">${escapeHtml(customBlock.ctaLabel)}</a></p>`
                    : ""
                }
              </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${t("emails.digest.subject", locale)}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#6366f1;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">ImChatty</p>
              <p style="margin:2px 0 0;font-size:13px;color:#c7d2fe;">${escapeHtml(t("emails.digest.tagline", locale))}</p>
              <p style="margin:10px 0 0;font-size:12px;color:#a5b4fc;">${escapeHtml(data.periodStart)} – ${escapeHtml(data.periodEnd)}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 4px;font-size:17px;color:#111827;">
                ${t("emails.digest.greeting", locale, { name: escapeHtml(data.displayname) })}
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
                ${t("emails.digest.intro", locale)}
              </p>

              ${customBlockHtml}

              ${activityContent}

              <!-- CTA -->
              <p style="margin:28px 0 0;">
                <a href="${ctaUrl}"
                   style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;">
                  ${escapeHtml(ctaLabel)}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${t("emails.digest.footer", locale)}</p>
              <p style="margin:8px 0 0;font-size:12px;">
                <a href="${data.settingsUrl}" style="color:#6b7280;">${t("emails.digest.settings_link", locale)}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
