"""Render transactional emails from the vendored react-email HTML templates.

The HTML in ``templates/email/`` is exported from the ``resend/`` react-email
project (``bun run export:api``) with ``{{token}}`` placeholders. We fill the
placeholders here and hand the result to ``deliver_email``. User-supplied values
are HTML-escaped so they cannot inject markup into the message.
"""

import html as html_lib
import re
from functools import lru_cache
from pathlib import Path

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"
_TOKEN_RE = re.compile(r"\{\{[a-zA-Z_]+\}\}")
_PROJECT_ROW_RE = re.compile(
    r"<p\b[^>]*>(?:(?!</p>).)*?\{\{projectName\}\}(?:(?!</p>).)*?</p>\s*",
    re.DOTALL,
)


@lru_cache(maxsize=8)
def _load(name: str) -> str:
    return (_TEMPLATES_DIR / name).read_text(encoding="utf-8")


def render_invitation_email(
    *,
    inviter_name: str,
    org_name: str,
    role: str,
    accept_url: str,
    expires_in: str,
    app_url: str,
    project_name: str | None = None,
) -> tuple[str, str]:
    """Return ``(subject, html)`` for an organization invitation email."""
    html = _load("invitation.html")

    if project_name:
        html = html.replace("{{projectName}}", html_lib.escape(project_name))
    else:
        html = _PROJECT_ROW_RE.sub("", html)

    html = (
        html.replace("{{inviterName}}", html_lib.escape(inviter_name))
        .replace("{{orgName}}", html_lib.escape(org_name))
        .replace("{{role}}", html_lib.escape(role))
        .replace("{{acceptUrl}}", accept_url)
        .replace("{{expiresIn}}", html_lib.escape(expires_in))
        .replace("{{appUrl}}", app_url)
    )
    html = _TOKEN_RE.sub("", html)

    subject = f"{inviter_name} invited you to {org_name} on CompanyOS"
    return subject, html


def render_verification_email(*, code: str, expires_in: str) -> tuple[str, str]:
    """Return ``(subject, html)`` for an email-verification code message.

    Self-contained dark inline-HTML matching the invitation palette. ``code`` is
    always a digit string and ``expires_in`` is a fixed phrase we build, so no
    dynamic value needs HTML-escaping here.
    """
    subject = "Your CompanyOS verification code"
    html = f"""\
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#08080A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" \
style="background-color:#08080A;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" \
style="max-width:600px;width:100%;background-color:#151518;border-radius:12px;">
            <tr>
              <td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',\
Roboto,Helvetica,Arial,sans-serif;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#F7F7F7;">\
Confirm your email</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#909091;">\
Enter this code to verify your email address and finish setting up your CompanyOS account.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" \
style="background-color:#1D1D20;border-radius:12px;padding:24px;font-family:\
'SF Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:32px;\
letter-spacing:0.3em;color:#F7F7F7;">{code}</td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#909091;">\
This code expires in {expires_in}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
    return subject, html
