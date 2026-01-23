import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

from app.core.config import settings


def get_base_template(content: str) -> str:
    """
    Returns a consistent HTML wrapper for all emails.
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px 0; border-bottom: 2px solid #0d9488; }}
            .logo {{ font-size: 24px; font-weight: bold; color: #0d9488; text-decoration: none; }}
            .content {{ padding: 30px 0; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #0d9488; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }}
            .order-details {{ background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }}
            .item-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; }}
            .total {{ border-top: 1px solid #ddd; padding-top: 10px; font-weight: bold; margin-top: 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">MeTIMat</div>
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
        # Only print a snippet of content to logs
        print(f"DEBUG: Content starts with: {html_content[:200]}...")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = email_to

    html_part = MIMEText(html_content, "html")
    message.attach(html_part)

    try:
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
        <p style="font-size: 11px; color: #666;">{verification_url}</p>
        <p>Dieser Link ist für 24 Stunden gültig.</p>
    """
    send_email(email_to, subject, get_base_template(content))


def send_order_confirmation_email(
    email_to: str, order_id: int, items: List[Dict[str, Any]], total_price: float
) -> None:
    subject = f"{settings.PROJECT_NAME} - Bestelleingang #{order_id}"

    items_html = ""
    for item in items:
        items_html += f"""
            <div class="item-row">
                <span>{item.get("name", "Medikament")} x {item.get("quantity", 1)}</span>
                <span>{item.get("price", 0.0):.2f} €</span>
            </div>
        """

    content = f"""
        <h2>Vielen Dank für Ihre Bestellung!</h2>
        <p>Wir haben Ihre Bestellung #{order_id} erhalten und bearbeiten diese umgehend.</p>
        <div class="order-details">
            <h3>Bestelldetails</h3>
            {items_html}
            <div class="total">
                <div class="item-row">
                    <span>Gesamtbetrag</span>
                    <span>{total_price:.2f} €</span>
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
            <p><strong>Standort:</strong><br>{pickup_location}</p>
            <p><strong>Ihr Abhol-Code:</strong></p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 20px; background: #fff; border: 2px dashed #0d9488; color: #0d9488;">
                {pickup_code}
            </div>
        </div>
        <p>Bitte geben Sie diesen Code am Automaten ein oder zeigen Sie ihn dem Personal in der Apotheke.</p>
    """
    send_email(email_to, subject, get_base_template(content))
