import base64
import io
import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List

import qrcode
from app.core.config import settings

from .logo import LOGO_SVG_BASE64_DATA


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

    # Generate QR Code
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(pickup_code)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0d9488", back_color="white")

    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_base64 = base64.b64encode(buffered.getvalue()).decode()
    qr_data_uri = f"data:image/png;base64,{qr_base64}"

    content = f"""
        <h2>Ihre Medikamente sind abholbereit!</h2>
        <p>Gute Nachrichten! Ihre Bestellung #{order_id} liegt nun zur Abholung bereit.</p>
        <div class="order-details">
            <p style="margin-top:0;"><strong>Standort:</strong><br>{pickup_location}</p>
            <p><strong>QR-Code & Abholung:</strong></p>
            <p>Bitte scannen Sie den folgenden QR-Code am Terminal des Automaten, um das Fach zu öffnen:</p>

            <div style="text-align: center; margin: 25px 0;">
                <img src="{qr_data_uri}" alt="Abhol QR-Code" style="width: 200px; height: 200px; border: 1px solid #eee; padding: 10px; background: white; border-radius: 8px;">
            </div>

            <p style="font-size: 14px; color: #666;">Alternativ können Sie den QR-Code auch in der <strong>MeTIMat App</strong> unter "Bestelldetails" abrufen.</p>

            <div style="font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 20px; background: #ffffff; border: 2px dashed #0d9488; color: #0d9488; border-radius: 8px;">
                {pickup_code[:8].upper()}
            </div>
            <p style="text-align: center; font-size: 12px; color: #666;">(Manueller Abhol-Code)</p>
        </div>
        <p>Wir freuen uns auf Ihren Besuch!</p>
    """
    send_email(email_to, subject, get_base_template(content))


def send_pickup_confirmation_email(
    email_to: str, order_id: int, items: List[Dict[str, Any]]
) -> None:
    subject = f"{settings.PROJECT_NAME} - Abholung bestätigt #{order_id}"

    items_html = ""
    for item in items:
        items_html += (
            f"<li>{item.get('name', 'Medikament')} x {item.get('quantity', 1)}</li>"
        )

    content = f"""
        <h2>Vielen Dank für Ihren Besuch!</h2>
        <p>Hiermit bestätigen wir die erfolgreiche Abholung Ihrer Bestellung #{order_id}.</p>
        <div class="order-details">
            <h3 style="margin-top:0;">Abgeholte Artikel</h3>
            <ul style="padding-left: 20px; color: #4a5568;">
                {items_html}
            </ul>
        </div>
        <p>Wir hoffen, Sie sind mit unserem Service zufrieden. Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.</p>
        <p>Gute Besserung wünscht Ihr MeTIMat Team!</p>
    """
    send_email(email_to, subject, get_base_template(content))
