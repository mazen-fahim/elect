# Email Verification – Setup and Usage (Dev)

This guide shows how to send and use email verification links in development.

## 1) Configure SMTP
- Create or update a `.env` file at the repo root (next to `docker-compose.yml`).
- For Gmail:
  - Enable 2FA on the account.
  - Create an App Password and use it instead of your normal password (no spaces).
- In dev, point the verification link directly to the backend endpoint:
  - FRONTEND_VERIFICATION_URL=http://localhost/api/auth/verify-email

Example values (edit to your own):
```
MAIL_USERNAME="your@gmail.com"
MAIL_PASSWORD="YOUR_APP_PASSWORD"
MAIL_FROM="your@gmail.com"
MAIL_PORT=587
MAIL_SERVER="smtp.gmail.com"
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
USE_CREDENTIALS=True

# In development, route verification directly to the backend
FRONTEND_VERIFICATION_URL="http://localhost/api/auth/verify-email"
```

## 2) Restart services
```
docker compose up -d --build backend
# or at least

docker compose restart backend
```

## 3) Trigger a verification link
- Either register a new organization (sends verification to the owner), or
- As an organization owner, add an Organization Admin (sends verification to that email; it stays inactive until verified).

## 4) Verify the email
- Open the email on your phone and tap the verification link.
- You should be redirected to `/email-verified-successfully` and the account becomes active.

## 5) Confirm activation (optional)
```
docker compose exec -T postgres psql -U user -d db -x -c "SELECT id, email, is_active FROM users WHERE email='YOUR_EMAIL';"
```
Expected: `is_active | t`

## Troubleshooting
- Didn’t receive the email?
  - Double-check SMTP and App Password.
  - Check backend logs for send attempts:
    ```
    docker compose logs backend --tail 200 | grep -i "send email|Queuing email"
    ```
- "Invalid verification token":
  - Use the most recent email (new token invalidates older ones).
  - If expired (24h), resend to get a fresh token.
- No frontend route for `/verify-email`:
  - In dev, set `FRONTEND_VERIFICATION_URL` to the backend URL as shown above.

## Notes
- `FRONTEND_RESET_PASS_URL` is for your frontend reset password page; set it when you build that route.
- You can later add SMS (Twilio) in addition to email if needed.
