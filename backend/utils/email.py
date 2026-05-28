"""
utils/email.py — Transactional email sender for ClarIQy.

Uses Resend HTTP API (no SMTP, works on any cloud host including Render free tier).

Required env vars:
    RESEND_API_KEY   Get from resend.com (free: 3,000 emails/month)
    RESEND_FROM      Sender address, e.g. "ClarIQy <hello@aisynchlabs.com>"
                     Until your domain is verified, use: "ClarIQy <onboarding@resend.dev>"
    FRONTEND_URL     e.g. https://clariqy.aisynchlabs.com
"""

import os
import resend

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://clariqy.aisynchlabs.com")
FROM_NAME    = "ClarIQy by Aisynch Labs"


def send_password_reset(to_email: str, user_name: str, reset_token: str) -> None:
    """Send the password-reset email via Resend HTTP API."""
    api_key  = os.getenv("RESEND_API_KEY", "")
    from_addr = os.getenv("RESEND_FROM", f"{FROM_NAME} <onboarding@resend.dev>")

    if not api_key:
        raise RuntimeError("RESEND_API_KEY env var is not set.")

    resend.api_key = api_key
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your ClarIQy password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;background:#ffffff;border-radius:24px;
                      box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#000000;padding:32px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px;">
                <tr>
                  <td style="width:60px;height:60px;">
                    <img src="https://clariqy.aisynchlabs.com/favicon.png"
                         alt="ClarIQy" width="60" height="60"
                         style="display:block;border-radius:14px;" />
                  </td>
                </tr>
              </table>
              <div style="color:#ffffff;font-size:22px;font-weight:800;
                         letter-spacing:-0.5px;line-height:1.2;">ClarIQy</div>
              <div style="color:rgba(255,255,255,0.55);font-size:12px;
                         margin-top:4px;letter-spacing:0.3px;">by Aisynch Labs</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;
                         color:#0a0a0a;letter-spacing:-0.5px;line-height:1.3;">
                Reset your password
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
                Hi {user_name},<br/><br/>
                We received a request to reset the password for your ClarIQy account.
                Click the button below to choose a new password.
              </p>

              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#000000;border-radius:12px;">
                    <a href="{reset_url}"
                       style="display:inline-block;padding:14px 32px;
                              color:#ffffff;font-size:15px;font-weight:700;
                              text-decoration:none;letter-spacing:-0.2px;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background:#f9f9f9;border:1px solid #ebebeb;border-radius:12px;
                          padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0;font-size:13px;color:#888888;line-height:1.5;">
                  ⏱ This link expires in <strong style="color:#555555;">1 hour</strong>.
                  After that you'll need to request a new one.
                </p>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#aaaaaa;line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password will not be changed.
              </p>
              <p style="margin:0;font-size:13px;color:#aaaaaa;line-height:1.5;">
                If the button above doesn't work, copy and paste this link:
              </p>
              <p style="margin:8px 0 0;font-size:12px;word-break:break-all;">
                <a href="{reset_url}" style="color:#000000;">{reset_url}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;border-top:1px solid #f0f0f0;
                       padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#bbbbbb;line-height:1.6;">
                © 2025 Aisynch Labs · ClarIQy AI Meeting Summarizer<br/>
                You're receiving this because a password reset was requested for your account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""

    resend.Emails.send({
        "from": from_addr,
        "to": [to_email],
        "subject": "Reset your ClarIQy password",
        "html": html,
    })
