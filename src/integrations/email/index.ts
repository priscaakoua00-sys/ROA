/**
 * Email sending via Resend. Reads RESEND_API_KEY at call time.
 * If no key is set, it is a safe no-op (the app keeps working, nothing is sent).
 * Never throws: email is best-effort and must not break the main flow.
 */
interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Roavaa <onboarding@resend.dev>';
  if (!key) return { sent: false, skipped: true };
  if (!input.to || !input.to.includes('@')) return { sent: false, skipped: true };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      }),
    });
    if (!res.ok) return { sent: false, error: `status ${res.status}` };
    return { sent: true };
  } catch {
    return { sent: false, error: 'network' };
  }
}
