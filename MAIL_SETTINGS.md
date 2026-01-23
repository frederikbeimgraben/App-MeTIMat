# Mail Server Configuration

To enable email verification, add the following environment variables to your `.env` file:

```env
# SMTP Settings
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_TLS=True
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
EMAILS_FROM_EMAIL=noreply@metimat.de
EMAILS_FROM_NAME=MeTIMat

# Frontend Host (used for verification links in emails)
FRONTEND_HOST=http://localhost:8081
```

If `SMTP_HOST` is not set, the system will log the verification link to the console/logs instead of sending an actual email, which is useful for local development.