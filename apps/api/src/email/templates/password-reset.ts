export function passwordResetEmailHtml(name: string | null, url: string): string {
  const greeting = name ? `Hi ${name},` : 'Hi,';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:8px;padding:40px">
        <tr><td>
          <h1 style="margin:0 0 24px;font-size:24px;color:#18181b">Reset your password</h1>
          <p style="margin:0 0 24px;font-size:16px;color:#3f3f46;line-height:1.5">${greeting}</p>
          <p style="margin:0 0 32px;font-size:16px;color:#3f3f46;line-height:1.5">
            We received a request to reset your password. Click the button below to choose a new one.
            This link expires in 1 hour.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px">
            <tr><td style="background:#18181b;border-radius:6px;padding:12px 32px">
              <a href="${url}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600">Reset Password</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#71717a;line-height:1.5">
            If you didn't request a password reset, you can safely ignore this email. Your password won't change.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
