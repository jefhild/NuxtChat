import sgMail from "@sendgrid/mail";

let initialized = false;

function init(apiKey: string) {
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }
  if (!initialized) {
    sgMail.setApiKey(apiKey);
    initialized = true;
  }
}

export interface DigestEmailOptions {
  to: string;
  subject: string;
  html: string;
  fromEmail: string;
  fromName: string;
  unsubscribeGroupId?: number;
}

export async function sendDigestEmail(
  opts: DigestEmailOptions,
  apiKey: string
): Promise<void> {
  init(apiKey);

  const msg: Parameters<typeof sgMail.send>[0] = {
    to: opts.to,
    from: { email: opts.fromEmail, name: opts.fromName },
    subject: opts.subject,
    html: opts.html,
  };

  if (opts.unsubscribeGroupId) {
    msg.asm = { groupId: opts.unsubscribeGroupId };
  }

  await sgMail.send(msg);
}
