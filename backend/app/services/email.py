import base64
import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List

from app.core.config import settings

# Base64 encoded favicon.svg as provided by the user (the data part only)
LOGO_SVG_BASE64_DATA = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB3aWR0aD0iNTEyIgogICBoZWlnaHQ9IjUxMiIKICAgdmlld0JveD0iMCAwIDUxMiA1MTIiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzEiCiAgIGlua3NjYXBlOnZlcnNpb249IjEuNC4yIChlYmYwZTk0MGQwLCAyMDI1LTA1LTA4KSIKICAgc29kaXBvZGk6ZG9jbmFtZT0iZmF2aWNvbi5zdmciCiAgIGlua3NjYXBlOmV4cG9ydC1maWxlbmFtZT0iZmF2aWNvbi5wbmciCiAgIGlua3NjYXBlOmV4cG9ydC14ZHBpPSI5NiIKICAgaW5rc2NhcGU6ZXhwb3J0LXlkcGk9Ijk2IgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3MSIKICAgICBwYWdlY29sb3I9IiM1MDUwNTAiCiAgICAgYm9yZGVyY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyb3BhY2l0eT0iMSIKICAgICBpbmtzY2FwZTpzaG93cGFnZXNoYWRvdz0iMCIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMCIKICAgICBpbmtzY2FwZTpwYWdlY2hlY2tlcmJvYXJkPSIxIgogICAgIGlua3NjYXBlOmRlc2tjb2xvcj0iIzUwNTA1MCIKICAgICBpbmtzY2FwZTpkb2N1bWVudC11bml0cz0icHgiCiAgICAgaW5rc2NhcGU6em9vbT0iMS41MDc4MTI0IgogICAgIGlua3NjYXBlOmN4PSI0MDEuOTA2NzUiCiAgICAgaW5rc2NhcGU6Y3k9IjI3Ny4yMjI4MSIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9IjE5MjAiCiAgICAgaW5rc2NhcGU6d2luZG93LWhlaWdodD0iMTA0NyIKICAgICBpbmtzY2FwZTp3aW5kb3cteD0iMCIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iMCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9ImcxIgogICAgIHNob3dndWlkZXM9InRydWUiIC8+CiAgPGRlZnMKICAgICBpZD0iZGVmczEiIC8+CiAgPGcKICAgICBpbmtzY2FwZTpsYWJlbD0iTGF5ZXIgMSIKICAgICBpbmtzY2FwZTpncm91cG1vZGU9ImxheWVyIgogICAgIGlkPSJsYXllcjEiPgogICAgPGcKICAgICAgIGlkPSJnMSIKICAgICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0xNi4zMzMzNDEsMTEuMjAwMDA5KSI+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJ0ZXh0MS05IgogICAgICAgICBzdHlsZT0iZm9udC13ZWlnaHQ6Ym9sZDtmb250LXNpemU6NDY2LjY2N3B4O2xpbmUtaGVpZ2h0OjEuMjtmb250LWZhbWlseTonSGVsdmV0aWNhIFJvdW5kZWQnOy1pbmtzY2FwZS1mb250LXNwZWNpZmljYXRpb246J0hlbHZldGljYSBSb3VuZGVkIEJvbGQnO2xldHRlci1zcGFjaW5nOjAuNXB4O2ZpbGw6IzE0YjhhNjtzdHJva2Utd2lkdGg6NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgZD0ibSAxMTcuMDk1MDYsMzkuNDY2MDA3IGMgLTI0LjIyMTY1NSwwIC00OC45OTQxNDEsOC4yNTczNjcgLTQ4Ljk5NDE0MSw0NC41ODk4NDMgdiAzMjIuMDM5MDYgYyAwLDIyLjU3MDE2IDExLjAwOTQ3NSw0NC4wMzkwNyA0MC4xODU1NTEsNDQuMDM5MDcgMi4xODI4NSwwIDQuMjYzNjEsLTAuMTE5NzUgNi4yNDYwOSwtMC4zNTE1NyAtMi42MzQ4OSwtMC4wNjY0IC01LjI2NTE2LC0wLjIzOTY4IC03Ljg1OTM4LC0wLjU0Mjk3IDAuNTMxNjksMC4wMTQ0IDEuMDY5MDEsMC4wMjM0IDEuNjEzMjksMC4wMjM0IDI5LjE3NjA3LDAgNDAuMTg1NTQsLTIxLjQ2ODkgNDAuMTg1NTQsLTQ0LjAzOTA2IFYgMzI4LjcwNDI5IDE2MC41NzUzOCBoIDEuMTAxNTcgbCAyNi45MDgyLDg0LjA2NDQ1IDAuMTM4NjcsLTAuNDM1NTQgMzQuNzc1MzksMTA4LjY0NjQ4IC0wLjEzNjcyLDAuNDQxNDEgMjIuNTM5MDYsNzAuNDE3OTcgYyA2LjA1NTQyLDE4LjcxNjczIDE5LjgxODQzLDI2LjQyMzgzIDM4LjUzNTE2LDI2LjQyMzgzIDE4LjcxNjcxLDAgMzIuNDc5NzYsLTcuNzA3MDkgMzguNTM1MTYsLTI2LjQyMzgzIGwgMjMuMjI0NjEsLTcyLjU2MDU1IC0wLjEzNDc3LC0wLjQ0NTMxIC0zMi4zNzEwOSwtMTA2LjA2NDQ2IC0yNy42MDE1Nyw5MC40NDE0MSBoIC0xLjEwMTU2IEwgMTk0LjE2MzQyLDgwLjc1MzExNiBDIDE4NC44MDUwNSw1MC40NzYwNjYgMTcxLjU5Mzk3LDM5LjQ2NjAwNyAxNDMuNTE4ODksMzkuNDY2MDA3IFogbSAyODUuMTU0MywwIGMgLTI4LjA3NTA4LDAgLTQxLjI4NjE2LDExLjAxMDA1OCAtNTAuNjQ0NTMsNDEuMjg3MTA5IGwgLTE3LjUwOTc3LDU3LjM3NTAwNCAzMy45NTExNywxMDYuMDc2MTcgMC4xMzg2NywwLjQzNTU0IDI2LjkwODIxLC04NC4wNjQ0NSBoIDEuMTAxNTYgViA4My43MzU1MzggYyAwLC0yMi4xMjE2OTUgMTAuNTc3MTksLTQzLjE4NTM1NyAzOC40Njg3NSwtNDQuMDEzNjcyIC0yLjM1MzA0LC0wLjE3NjA3IC00LjcyNTY2LC0wLjI1NTg1OSAtNy4wOTE4LC0wLjI1NTg1OSB6IgogICAgICAgICBzb2RpcG9kaTpub2RldHlwZXM9InNzc3NjY3NzY2NjY2NjY2NzY2NjY2NjY3Nzc2NjY2NjY3Njc3MiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoNSIKICAgICAgICAgc3R5bGU9ImZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjQ2Ni42NjdweDtsaW5lLWhlaWdodDoxLjI7Zm9udC1mYW1pbHk6J0hlbHZldGljYSBSb3VuZGVkJzstaW5rc2NhcGUtZm9udC1zcGVjaWZpY2F0aW9uOidIZWx2ZXRpY2EgUm91bmRlZCBCb2xkJztsZXR0ZXItc3BhY2luZzowLjVweDtmaWxsOiMxZTNhOGE7c3Ryb2tlLXdpZHRoOjU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3BhaW50LW9yZGVyOm1hcmtlcnMgc3Ryb2tlIGZpbGwiCiAgICAgICAgIGQ9Ik0gMjcyLjMzMzM0IDM5LjQ2NjAwNyBDIDI1My42MTY2MSAzOS40NjYwMDcgMjM5Ljg1MzYgNDcuMTczMTA3IDIzMy43OTgxOCA2NS44ODk4MzUgTCAyMTEuMzk1ODQgMTM1Ljg3ODEyIEwgMjQ1LjAyNDc1IDI0NC41MjQ2IEwgMjcyLjg4NDEyIDE1NC41MTg3NCBMIDI3My45ODU2OCAxNTQuNTE4NzQgTCAzMDEuNDU0NDMgMjQ0LjUyNDYgTCAzMzMuOTU4MzQgMzUxLjAyNDYgTCAzNTEuNjA0ODMgNDA4Ljg0Njg3IEMgMzYwLjk2MzE5IDQzOS4xMjM5MiAzNzQuMTc0MjcgNDUwLjEzMzk4IDQwMi4yNDkzNiA0NTAuMTMzOTggTCA0MTUuOTIxMjMgNDUwLjEzMzk4IEwgNDI3LjU3MTYyIDQ1MC42ODQ3NiBDIDQ1MS43NjYyNSA0NTEuODI4NTMgNDc2LjU2NTc2IDQ0Mi40MjczOSA0NzYuNTY1NzYgNDA2LjA5NDkxIEwgNDc2LjU2NTc2IDg0LjA1NTg1IEMgNDc2LjU2NTc2IDYxLjQ4NTcgNDY1LjU1NjMgNDAuMDE2Nzg4IDQzNi4zODAyMiA0MC4wMTY3ODggQyA0MDcuMjA0MTUgNDAuMDE2Nzg4IDM5Ni4xOTQ2NyA2MS40ODU3IDM5Ni4xOTQ2NyA4NC4wNTU4NSBMIDM5Ni4xOTQ2NyAzMjkuMDI0NiBMIDM5NS4wOTMxMSAzMjkuMDI0NiBMIDM2OC4wNDYyMyAyNDQuNTI0NiBMIDMzMy45NTgzNCAxMzguMDI0NiBMIDMxMC44Njg1IDY1Ljg4OTgzNSBDIDMwNC44MTMwOSA0Ny4xNzMxMDcgMjkxLjA1MDA3IDM5LjQ2NjAwNyAyNzIuMzMzMzQgMzkuNDY2MDA3IHogTSAxNzYuNjIwNDUgMjQ0LjUyNDYgTCAxNDkuNTczNTggMzI5LjAyNDYgTCAxNDguNDcyMDEgMzI5LjAyNDYgTCAxNDguNDcyMDEgNDA1LjU0NDEzIEMgMTQ4LjQ3MjAxIDQyOC4xMTQyOSAxMzcuNDYyNTQgNDQ5LjU4MzE5IDEwOC4yODY0NyA0NDkuNTgzMTkgQyAxMDcuNzQyMTkgNDQ5LjU4MzE5IDEwNy4yMDQ4NyA0NDkuNTc0MTYgMTA2LjY3MzE4IDQ0OS41NTk3NiBDIDExMC4xMDgxMyA0NDkuOTYxMzMgMTEzLjYwNzM0IDQ1MC4xMzM5OCAxMTcuMDk1MDYgNDUwLjEzMzk4IEwgMTQzLjUxODg5IDQ1MC4xMzM5OCBDIDE3MS41OTM5OCA0NTAuMTMzOTggMTg0LjgwNTA2IDQzOS4xMjM5MiAxOTQuMTYzNDIgNDA4Ljg0Njg3IEwgMjExLjM5NTg0IDM1My4xNzEwOCBMIDE3Ni42MjA0NSAyNDQuNTI0NiB6ICIgLz4KICAgICAgPHBhdGgKICAgICAgICAgc3R5bGU9ImZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjQ2Ni42NjdweDtsaW5lLWhlaWdodDoxLjI7Zm9udC1mYW1pbHk6J0hlbHZldGljYSBSb3VuZGVkJzstaW5rc2NhcGUtZm9udC1zcGVjaWZpY2F0aW9uOidIZWx2ZXRpY2EgUm91bmRlZCBCb2xkJztsZXR0ZXItc3BhY2luZzowLjVweDtmaWxsOiMxZTNhOGE7c3Ryb2tlLXdpZHRoOjU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3BhaW50LW9yZGVyOm1hcmtlcnMgc3Ryb2tlIGZpbGwiCiAgICAgICAgIGQ9Im0gNjguNDMwOTk3LDQxMi4xNTM1MSBjIDAuNjYzNjYxLDcuMDg5NzMgMi4zNzU4ODYsMTIuOTY0OCA0Ljk0NTMxMywxNy43NTE5NSAtMi43MTY2NTQsLTUuMzQ3MiAtNC4zMDY3MjcsLTExLjQyMzUxIC00Ljk0NTMxMywtMTcuNzUxOTUgeiIKICAgICAgICAgaWQ9InBhdGg0IiAvPgogICAgICA8cGF0aAogICAgICAgICBzdHlsZT0iZm9udC13ZWlnaHQ6Ym9sZDtmb250LXNpemU6NDY2LjY2N3B4O2xpbmUtaGVpZ2h0OjEuMjtmb250LWZhbWlseTonSGVsdmV0aWNhIFJvdW5kZWQnOy1pbmtzY2FwZS1mb250LXNwZWNpZmljYXRpb246J0hlbHZldGljYSBSb3VuZGVkIEJvbGQnO2xldHRlci1zcGFjaW5nOjAuNXB4O2ZpbGw6IzFlM2E4YTtzdHJva2Utd2lkdGg6NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgZD0ibSA0NzYuMjQ1NDUsNDEyLjA2MTcxIGMgLTAuNjMyNDgsNi4zNjEyNyAtMi4yMjUzMiwxMi40NzA4OSAtNC45NTUwOCwxNy44NDM3NSAyLjU4MDYsLTQuODA3ODEgNC4yOTc4OSwtMTAuNzEyNTEgNC45NTUwOCwtMTcuODQzNzUgeiIKICAgICAgICAgaWQ9InBhdGgzIiAvPgogICAgPC9nPgogIDwvZz4KPC9zdmc+Cg=="


def get_base_template(content: str) -> str:
    """
    Returns a consistent HTML wrapper for all emails including the MeTIMat logo as CID.
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7f6; }}
            .container {{ max-width: 600px; margin: 20px auto; padding: 0; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
            .header {{ text-align: center; padding: 30px 20px; background-color: #ffffff; border-bottom: 1px solid #eee; }}
            .logo-img {{ width: 80px; height: 80px; margin-bottom: 10px; }}
            .brand-name {{ font-size: 24px; font-weight: bold; color: #0d9488; margin: 0; }}
            .content {{ padding: 40px 30px; }}
            .button {{ display: inline-block; padding: 14px 28px; background-color: #0d9488; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 25px 0; }}
            .footer {{ text-align: center; font-size: 12px; color: #999; padding: 30px 20px; background-color: #fafafa; border-top: 1px solid #eee; }}
            .order-details {{ background-color: #f9fafb; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #edf2f7; }}
            .item-row {{ display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }}
            .item-row:last-child {{ border-bottom: none; }}
            .total {{ border-top: 2px solid #0d9488; padding-top: 15px; font-weight: bold; margin-top: 15px; font-size: 18px; color: #0d9488; }}
            h2 {{ color: #1a202c; margin-top: 0; }}
            p {{ color: #4a5568; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="{LOGO_SVG_BASE64_DATA}" alt="MeTIMat Logo" class="logo-img">
                <div class="brand-name">MeTIMat</div>
            </div>
            <div class="content">
                {content}
            </div>
            <div class="footer">
                <p>&copy; {settings.PROJECT_NAME}. Alle Rechte vorbehalten.</p>
                <p>Dies ist eine automatisch generierte Nachricht. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
            </div>
        </div>
    </body>
    </html>
    """


def send_email(
    email_to: str,
    subject: str = "",
    html_content: str = "",
) -> None:
    if not settings.SMTP_HOST or not settings.EMAILS_FROM_EMAIL:
        print(
            f"DEBUG: Email configuration incomplete, skipping actual send to {email_to}"
        )
        print(f"DEBUG: Subject: {subject}")
        print(f"DEBUG: Content starts with: {html_content[:200]}...")
        return

    # Use MIMEMultipart for better compatibility across mail clients
    message = MIMEMultipart("related")
    message["Subject"] = subject
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = email_to

    # Create the HTML part
    msg_alternative = MIMEMultipart("alternative")
    message.attach(msg_alternative)

    html_part = MIMEText(html_content, "html", "utf-8")
    msg_alternative.attach(html_part)

    # Attach the logo as CID
    try:
        logo_data = base64.b64decode(LOGO_SVG_BASE64_DATA)
        image = MIMEImage(logo_data, _subtype="svg+xml")
        image.add_header("Content-ID", "<logo>")
        image.add_header("Content-Disposition", "inline", filename="logo.svg")
        message.attach(image)
    except Exception as e:
        print(f"ERROR: Could not attach logo to email: {e}")

    try:
        if settings.SMTP_PORT is None:
            raise ValueError("SMTP_PORT is not set!")
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
    except Exception as e:
        print(f"ERROR: Failed to send email to {email_to}: {e}")


def send_verification_email(email_to: str, token: str) -> None:
    subject = f"{settings.PROJECT_NAME} - E-Mail Verifizierung"
    verification_url = f"{settings.FRONTEND_HOST}/app/verify-email?token={token}"

    content = f"""
        <h2>Willkommen bei {settings.PROJECT_NAME}!</h2>
        <p>Vielen Dank für Ihre Registrierung. Um Ihr Konto zu aktivieren und fortzufahren, bestätigen Sie bitte Ihre E-Mail-Adresse.</p>
        <div style="text-align: center;">
            <a href="{verification_url}" class="button">E-Mail verifizieren</a>
        </div>
        <p>Sollte der Button nicht funktionieren, kopieren Sie bitte diesen Link in Ihren Browser:</p>
        <p style="font-size: 11px; color: #718096; word-break: break-all;">{verification_url}</p>
        <p>Dieser Link ist für 24 Stunden gültig.</p>
    """
    send_email(email_to, subject, get_base_template(content))


def send_order_confirmation_email(
    email_to: str, order_id: int, items: List[Dict[str, Any]], total_price: float
) -> None:
    subject = f"{settings.PROJECT_NAME} - Bestelleingang #{order_id}"

    items_html = ""
    for item in items:
        # Fixed price display: ensure it shows the item's price if available
        item_price = item.get("price", 0.0)
        items_html += f"""
            <div class="item-row">
                <span style="flex: 1;">{item.get("name", "Medikament")} x {item.get("quantity", 1)}</span>
                <span style="white-space: nowrap;">{float(item_price):.2f} €</span>
            </div>
        """

    content = f"""
        <h2>Vielen Dank für Ihre Bestellung!</h2>
        <p>Wir haben Ihre Bestellung #{order_id} erhalten und bearbeiten diese umgehend.</p>
        <div class="order-details">
            <h3 style="margin-top:0;">Bestelldetails</h3>
            {items_html}
            <div class="total">
                <div style="display: flex; justify-content: space-between;">
                    <span style="flex: 1;">Gesamtbetrag</span>
                    <span style="white-space: nowrap;">{float(total_price):.2f} €</span>
                </div>
            </div>
        </div>
        <p>Sobald Ihre Medikamente zur Abholung bereitstehen, erhalten Sie eine weitere Benachrichtigung.</p>
    """
    send_email(email_to, subject, get_base_template(content))


def send_pickup_ready_email(
    email_to: str, order_id: int, pickup_location: str, pickup_code: str
) -> None:
    subject = f"{settings.PROJECT_NAME} - Bereit zur Abholung #{order_id}"

    content = f"""
        <h2>Ihre Medikamente sind abholbereit!</h2>
        <p>Gute Nachrichten! Ihre Bestellung #{order_id} liegt nun zur Abholung bereit.</p>
        <div class="order-details">
            <p style="margin-top:0;"><strong>Standort:</strong><br>{pickup_location}</p>
            <p><strong>Ihr Abhol-Code:</strong></p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 20px; background: #ffffff; border: 2px dashed #0d9488; color: #0d9488; border-radius: 8px;">
                {pickup_code}
            </div>
        </div>
        <p>Bitte geben Sie diesen Code am Automaten ein oder zeigen Sie ihn dem Personal in der Apotheke.</p>
    """
    send_email(email_to, subject, get_base_template(content))
