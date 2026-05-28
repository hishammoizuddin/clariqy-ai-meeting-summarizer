"""
utils/email.py — Transactional email sender for ClarIQy.

Uses Gmail SMTP with an App Password (no third-party service needed).

Required env vars:
    EMAIL_HOST      (default: smtp.gmail.com)
    EMAIL_PORT      (default: 587)
    EMAIL_USER      Your Gmail address, e.g. hello@aisynchlabs.com
    EMAIL_PASSWORD  16-char Gmail App Password (Google → Security → App Passwords)
    FRONTEND_URL    e.g. https://clariqy.aisynchlabs.com
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

EMAIL_HOST     = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT     = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER     = os.getenv("EMAIL_USER", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "https://clariqy.aisynchlabs.com")
FROM_NAME      = "Aisynch Labs Support"


def _send(to_email: str, subject: str, html: str) -> None:
    """Send a single HTML email. Raises on failure."""
    # Read at call time so Render env vars are always picked up
    host     = os.getenv("EMAIL_HOST", "smtp.zoho.com")
    port     = int(os.getenv("EMAIL_PORT", "587"))
    user     = os.getenv("EMAIL_USER", "")
    password = os.getenv("EMAIL_PASSWORD", "")

    if not user or not password:
        raise RuntimeError(
            "Email not configured. Set EMAIL_USER and EMAIL_PASSWORD env vars."
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{FROM_NAME} <{user}>"
    msg["To"]      = to_email

    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(host, port, timeout=15) as server:
        server.ehlo()
        server.starttls()
        server.login(user, password)
        server.sendmail(user, to_email, msg.as_string())


def send_password_reset(to_email: str, user_name: str, reset_token: str) -> None:
    """Send the password-reset email with a styled HTML template."""
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your ClarIQy password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;background:#ffffff;border-radius:24px;
                      box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">

          <!-- Header bar -->
          <tr>
            <td style="background:#000000;padding:32px 40px;text-align:center;">
              <!-- Logo mark — hosted PNG, works in all email clients -->
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

              <!-- CTA button -->
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

              <!-- Expiry note -->
              <div style="background:#f9f9f9;border:1px solid #ebebeb;border-radius:12px;
                          padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0;font-size:13px;color:#888888;line-height:1.5;">
                  ⏱ This link expires in <strong style="color:#555555;">1 hour</strong>.
                  After that you'll need to request a new one.
                </p>
              </div>

              <!-- Safety note -->
              <p style="margin:0 0 8px;font-size:13px;color:#aaaaaa;line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password will not be changed.
              </p>
              <p style="margin:0;font-size:13px;color:#aaaaaa;line-height:1.5;">
                If the button above doesn't work, copy and paste this link into your browser:
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
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>"""

    _send(to_email, "Reset your ClarIQy password", html)
