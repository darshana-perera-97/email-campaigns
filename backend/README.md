# Email Campaigns API

A Node.js API for sending emails using SMTP.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - The `.env` file has been created with your SMTP credentials
   - If needed, you can copy `.env.example` and update it with your credentials

3. Start the server:
```bash
npm start
```

The server will run on `http://localhost:3050` (or the port specified in `.env`)

## API Endpoints

### Health Check
- **GET** `/health`
  - Returns server status

### Send Email
- **POST** `/api/email/send`
  - Send a single email
  
  **Request Body:**
  ```json
  {
    "to": "recipient@example.com",
    "subject": "Email Subject",
    "text": "Plain text content",
    "html": "<h1>HTML content</h1>",
    "cc": "cc@example.com",  // optional
    "bcc": "bcc@example.com" // optional
  }
  ```
  
  **Response:**
  ```json
  {
    "success": true,
    "message": "Email sent successfully",
    "messageId": "..."
  }
  ```

### Send Bulk Emails
- **POST** `/api/email/send-bulk`
  - Send emails to multiple recipients
  
  **Request Body:**
  ```json
  {
    "recipients": ["email1@example.com", "email2@example.com"],
    "subject": "Email Subject",
    "text": "Plain text content",
    "html": "<h1>HTML content</h1>"
  }
  ```
  
  **Response:**
  ```json
  {
    "success": true,
    "message": "Sent 2 emails successfully, 0 failed",
    "results": [...],
    "errors": []
  }
  ```

## Example Usage

### Using cURL

**Send single email:**
```bash
curl -X POST http://localhost:3050/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email",
    "text": "This is a test email",
    "html": "<p>This is a test email</p>"
  }'
```

**Send bulk emails:**
```bash
curl -X POST http://localhost:3050/api/email/send-bulk \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": ["email1@example.com", "email2@example.com"],
    "subject": "Bulk Email",
    "text": "This is a bulk email",
    "html": "<p>This is a bulk email</p>"
  }'
```

## Environment Variables

- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port (465 for SSL)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASS` - SMTP password
- `PORT` - Server port (default: 3050)

