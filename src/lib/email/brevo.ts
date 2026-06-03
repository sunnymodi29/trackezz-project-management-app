import nodemailer from "nodemailer";

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: { email: string; name?: string };
}

export interface SendEmailResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
  messageId?: string;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const fromEmail = process.env.EMAIL?.trim() ?? "";
  const portRaw = process.env.SMTP_PORT?.trim();

  if (!host || !user || !pass || !fromEmail) return null;

  const port = portRaw ? Number(portRaw) : 587;
  if (!Number.isFinite(port) || port <= 0) return null;

  return {
    host,
    port,
    user,
    pass,
    fromEmail,
    fromName: (process.env.SMTP_FROM_NAME ?? "TrackEzz").trim(),
  };
}

export function isBrevoConfigured(): boolean {
  return getSmtpConfig() !== null;
}

function formatSmtpError(message: string): string {
  const lower = message.toLowerCase();
  if (/invalid login|authentication failed|535|auth/i.test(lower)) {
    return "SMTP authentication failed. Use your Brevo login email for SMTP_USER and the SMTP key (not the REST API key) for SMTP_PASS.";
  }
  if (/sender|from address|not verified|not authorised/i.test(lower)) {
    return `Sender not verified in Brevo. Set EMAIL to a verified sender address (${message})`;
  }
  if (/econnrefused|enotfound|etimedout|connect/i.test(lower)) {
    return `Could not reach SMTP server. Check SMTP_HOST (${process.env.SMTP_HOST}) and SMTP_PORT (${process.env.SMTP_PORT ?? 587}).`;
  }
  return message;
}

export async function sendBrevoEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const smtp = getSmtpConfig();

  if (!smtp) {
    console.warn(
      "[email] SMTP_HOST, SMTP_USER, EMAIL, or SMTP_PASS missing — email not sent"
    );
    return {
      sent: false,
      skipped: true,
      error:
        "Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, EMAIL, and SMTP_PASS.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to: params.to.trim(),
      subject: params.subject,
      html: params.htmlContent,
      text: params.textContent,
      replyTo: params.replyTo?.email
        ? params.replyTo.name
          ? `"${params.replyTo.name}" <${params.replyTo.email}>`
          : params.replyTo.email
        : undefined,
    });

    return { sent: true, messageId: info.messageId };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Unknown error";
    console.error("[email] SMTP send failed:", raw);
    return { sent: false, error: formatSmtpError(raw) };
  }
}

/** Throws if the invitation email could not be sent (config missing or SMTP error). */
export async function sendBrevoEmailOrThrow(
  params: SendEmailParams
): Promise<void> {
  const result = await sendBrevoEmail(params);
  if (result.sent) return;
  throw new Error(result.error ?? "Failed to send email");
}

const EMAIL = {
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  primaryLight: "#eef2ff",
  text: "#18181b",
  textMuted: "#71717a",
  textSubtle: "#a1a1aa",
  border: "#e4e4e7",
  surface: "#fafafa",
  card: "#ffffff",
  pageBg: "#f4f4f5",
} as const;

export function buildOrgAdminInviteEmail(params: {
  inviteUrl: string;
  organizationName: string;
  inviterName: string;
}): { subject: string; html: string; text: string } {
  const subject = `You're invited to manage projects at ${params.organizationName}`;
  const text = `${params.inviterName} invited you as a project admin at ${params.organizationName}.\n\nAccept: ${params.inviteUrl}`;
  const html = inviteEmailLayout({
    title: "You're invited as project admin",
    preheader: `${params.inviterName} invited you to ${params.organizationName} on TrackEzz`,
    intro: `${escapeHtml(params.inviterName)} invited you to create and manage projects at this organization.`,
    highlights: [
      { label: "Organization", value: params.organizationName },
      { label: "Access", value: "Project admin" },
    ],
    inviteUrl: params.inviteUrl,
  });
  return { subject, html, text };
}

export function buildProjectInviteEmail(params: {
  inviteUrl: string;
  projectName: string;
  organizationName: string;
  inviterName: string;
  role: string;
}): { subject: string; html: string; text: string } {
  const roleLabel = params.role.replace(/_/g, " ");
  const subject = `You're invited to ${params.projectName} on TrackEzz`;
  const text = `${params.inviterName} invited you to ${params.projectName} (${params.organizationName}) as ${roleLabel}.\n\nAccept: ${params.inviteUrl}`;
  const html = inviteEmailLayout({
    title: "Join your team on TrackEzz",
    preheader: `${params.inviterName} added you to ${params.projectName}`,
    intro: `${escapeHtml(params.inviterName)} invited you to collaborate on a project.`,
    highlights: [
      { label: "Project", value: params.projectName },
      { label: "Organization", value: params.organizationName },
      { label: "Your role", value: roleLabel },
    ],
    inviteUrl: params.inviteUrl,
  });
  return { subject, html, text };
}

function inviteEmailLayout(parts: {
  title: string;
  intro: string;
  inviteUrl: string;
  preheader?: string;
  highlights?: { label: string; value: string }[];
  ctaLabel?: string;
}): string {
  const ctaLabel = parts.ctaLabel ?? "Accept invitation";
  const preheader = parts.preheader ?? parts.title;
  const highlightsHtml =
    parts.highlights && parts.highlights.length > 0
      ? `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;border-collapse:separate;border-spacing:0">
        ${parts.highlights
          .map(
            (row, i) => `
        <tr>
          <td style="padding:${i === 0 ? "0" : "8px"} 0 0 0">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${EMAIL.surface};border:1px solid ${EMAIL.border};border-radius:12px">
              <tr>
                <td style="padding:14px 18px">
                  <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${EMAIL.textMuted};margin:0 0 4px 0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">${escapeHtml(row.label)}</div>
                  <div style="font-size:15px;font-weight:600;color:${EMAIL.text};margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">${escapeHtml(row.value)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`,
          )
          .join("")}
      </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(parts.title)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${EMAIL.pageBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${EMAIL.pageBg};min-height:100%">
    <tr>
      <td align="center" style="padding:40px 16px 48px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border-collapse:collapse">
          <!-- Header -->
          <tr>
            <td style="background-color:${EMAIL.primary};background:linear-gradient(135deg,${EMAIL.primary} 0%,${EMAIL.primaryDark} 100%);border-radius:16px 16px 0 0;padding:28px 32px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="44" valign="middle" style="padding-right:14px">
                    <div style="width:44px;height:44px;background:rgba(255,255,255,0.2);border-radius:12px;text-align:center;line-height:44px;font-size:22px">⚡</div>
                  </td>
                  <td valign="middle">
                    <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;margin:0">Track<span style="opacity:0.92">Ezz</span></div>
                    <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:12px;color:rgba(255,255,255,0.85);margin:4px 0 0 0">Build faster. Track smarter.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body card -->
          <tr>
            <td style="background-color:${EMAIL.card};border:1px solid ${EMAIL.border};border-top:none;border-radius:0 0 16px 16px;padding:36px 32px 32px;box-shadow:0 4px 24px rgba(24,24,27,0.06)">
              <h1 style="margin:0 0 12px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:24px;font-weight:700;line-height:1.3;color:${EMAIL.text};letter-spacing:-0.03em">${escapeHtml(parts.title)}</h1>
              <p style="margin:0 0 24px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.6;color:${EMAIL.textMuted}">${parts.intro}</p>
              ${highlightsHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:${EMAIL.primary};background:linear-gradient(135deg,${EMAIL.primary},${EMAIL.primaryDark})">
                    <a href="${parts.inviteUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(ctaLabel)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:13px;font-weight:600;color:${EMAIL.text}">Or paste this link</p>
              <p style="margin:0;padding:12px 14px;background-color:${EMAIL.primaryLight};border:1px solid ${EMAIL.border};border-radius:8px;word-break:break-all">
                <a href="${parts.inviteUrl}" style="font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:12px;line-height:1.5;color:${EMAIL.primaryDark};text-decoration:none">${escapeHtml(parts.inviteUrl)}</a>
              </p>
              <p style="margin:28px 0 0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.5;color:${EMAIL.textSubtle}">This invitation link expires in <strong style="color:${EMAIL.textMuted}">7 days</strong>. If you didn't expect this email, you can safely ignore it.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 16px 0">
              <p style="margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:11px;color:${EMAIL.textSubtle}">© ${new Date().getFullYear()} TrackEzz · Project management for modern teams</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildWorkspaceInviteEmail(params: {
  inviteUrl: string;
  workspaceName: string;
  organizationName: string;
  inviterName: string;
  role: string;
}): { subject: string; html: string; text: string } {
  const subject = `You're invited to ${params.workspaceName} on TrackEzz`;
  const text = `${params.inviterName} invited you to join the "${params.workspaceName}" team workspace at ${params.organizationName} as ${params.role}.\n\nAccept: ${params.inviteUrl}`;
  const html = inviteEmailLayout({
    title: "You're invited to TrackEzz",
    preheader: `${params.inviterName} invited you to ${params.workspaceName}`,
    intro: `${escapeHtml(params.inviterName)} invited you to join a team workspace.`,
    highlights: [
      { label: "Workspace", value: params.workspaceName },
      { label: "Organization", value: params.organizationName },
      { label: "Your role", value: params.role },
    ],
    inviteUrl: params.inviteUrl,
  });
  return { subject, html, text };
}
