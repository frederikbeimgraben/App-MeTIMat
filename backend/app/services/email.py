import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional

from app.core.config import settings


def send_email(
    email_to: str,
    subject_template: str = "",
    html_template: str = "",
) -> None:
    if not settings.SMTP_HOST or not settings.EMAILS_FROM_EMAIL:
        print(f"Email configuration incomplete, skipping email to {email_to}")
        print(f"Subject: {subject_template}")
        print(f"Content: {html_template}")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = subject_template
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = email_to

    html_part = MIMEText(html_template, "html")
    message.attach(html_part)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
    except Exception as e:
        # In a real app, use a logger
        print(f"Error sending email: {e}")


def send_verification_email(email_to: str, token: str) -> None:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Email Verification"

    # Point to the frontend verification page
    verification_url = f"{settings.FRONTEND_HOST}/app/verify-email?token={token}"

    html_content = f"""
    <html>
        <body>
            <h1>Verify your email</h1>
            <p>Thank you for registering for {project_name}.</p>
            <p>Please click the link below to verify your email address:</p>
            <p><a href="{verification_url}">Verify Email</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>{verification_url}</p>
            <p>This link will expire in 24 hours.</p>
        </body>
    </html>
    """

    send_email(
        email_to=email_to,
        subject_template=subject,
        html_template=html_content,
    )
