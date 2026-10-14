# WhatsApp Web Campaign Management System

A complete Node.js application for bulk WhatsApp messaging using **whatsapp-web.js**.  
Upload a CSV of contacts, choose (or create) a message template with placeholders like `{name}` and `{class}`, and the system sends messages sequentially with human-like delays to reduce the risk of account restrictions.

---

## Features

- **Template system** – Save reusable message templates with `{token}` placeholders
- **CSV import** – Upload contacts; any extra columns become variables for the template
- **Sequential sending** – 4–8 second random delay between messages
- **Live dashboard** – Campaign status badges and Sent / Failed / Pending counters
- **Persistent WhatsApp session** – Scan QR once; session is stored under `wa_sessions/`
- **Extensible adapter** – Swap the WhatsApp engine by implementing `WhatsAppAdapter`

---

## Technology Stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| Backend          | Node.js + Express.js                |
| Database         | MySQL + Prisma ORM                  |
| Views            | EJS + Tailwind CSS (CDN)            |
| CSV              | Multer + csv-parser                 |
| WhatsApp engine  | whatsapp-web.js + qrcode-terminal   |

---

## Prerequisites

1. **Node.js** 18+ (recommended 20 LTS)
2. **MySQL** 8.x (or MariaDB) running and accessible
3. A phone with **WhatsApp** installed (for QR linking)
4. Chrome/Chromium dependencies for Puppeteer (usually installed automatically; on Linux you may need extra packages – see Troubleshooting)

---

## Setup Guide

### 1. Unzip and enter the project

```bash
unzip whatsapp-campaign-system.zip
cd whatsapp-campaign-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the database

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Open `.env` and set your MySQL connection string:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
```

Example:

```env
DATABASE_URL="mysql://root:mypassword@localhost:3306/whatsapp_campaigns"
```

Create the database if it does not exist:

```sql
CREATE DATABASE whatsapp_campaigns CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Generate Prisma client and push schema

```bash
npx prisma generate
npx prisma db push
```

Or use the combined setup script:

```bash
npm run setup
```

### 5. Start the server

```bash
npm start
```

You should see:

```
Campaign platform running on http://localhost:3000
Waiting for WhatsApp QR scan (if first run)...
```

### 6. Link WhatsApp (first run only)

1. Look at the **terminal** – a QR code will be printed.
2. On your phone open **WhatsApp → Linked Devices → Link a Device**.
3. Scan the QR code.
4. When authentication succeeds you will see:
   ```
   WhatsApp Web Automation Instance is Ready and Authenticated!
   ```
5. Session is saved in `wa_sessions/`. Next starts will reuse it (no new QR unless the session expires).

### 7. Open the dashboard

Go to: **http://localhost:3000**

---

## Usage Guide

### Create a template

1. In the **Template Manager** panel enter a name and message body.
2. Use placeholders that match your CSV headers, e.g.:
   ```
   Hello {name}, this is a reminder for class {class}. Please confirm attendance.
   ```
3. Click **Save Template**.

### Prepare your CSV

- Required column (any of these names works): `phone`, `phoneNumber`, or `mobile`
- Include **country code** without `+` or spaces (e.g. `923001234567` for Pakistan)
- Any other columns become template variables

Example (`sample-contacts.csv` is included):

```csv
phone,name,class
923001234567,Alex,10
923009876543,Sam,9
923001112233,Jordan,11
```

### Launch a campaign

1. Enter a **Campaign Name**
2. Optionally select a **Template**
3. (Optional) Provide fallback plain text if you skip the template
4. Choose your **CSV file**
5. Click **Upload CSV & Start Campaign**

The campaign moves from `DRAFT` → `PROCESSING` → `COMPLETED`.  
Messages are sent one-by-one with a 4–8 second delay. Refresh the page to see updated Sent / Failed / Pending counts.

### Monitor progress

The **Campaigns** table shows:

| Column   | Meaning                                      |
|----------|----------------------------------------------|
| Status   | DRAFT / PROCESSING / COMPLETED / FAILED      |
| Sent     | Successfully delivered                       |
| Failed   | Error during send (see DB for errorMessage)  |
| Pending  | Still waiting to be processed                |

---

## Project Structure

```
whatsapp-campaign-system/
├── prisma/
│   └── schema.prisma          # Database models & enums
├── src/
│   ├── server.js              # Express app & routes
│   ├── runner.js              # Sequential campaign processor
│   ├── compiler.js            # {token} template compiler
│   ├── whatsapp.interface.js  # Adapter base class
│   └── whatsapp-webjs.adapter.js  # whatsapp-web.js implementation
├── views/
│   └── dashboard.ejs          # UI
├── uploads/                   # Temporary CSV storage (auto-cleaned)
├── wa_sessions/               # WhatsApp session data (created at runtime)
├── sample-contacts.csv        # Example CSV
├── .env.example
├── package.json
└── README.md
```

---

## Important Notes & Best Practices

1. **Phone numbers** – Always include country code. Digits only are preferred. The adapter strips non-digits and appends `@c.us`.
2. **Rate limiting** – Built-in 4–8 s delay helps, but avoid very large blasts on a personal number. Prefer a business/official account for high volume.
3. **Session folder** – Do not delete `wa_sessions/` while the process is running. Back it up if you move servers.
4. **Errors** – Failed messages store the error in the `Message.errorMessage` column. Inspect with Prisma Studio: `npx prisma studio`.
5. **Legal & ToS** – Use only for legitimate communication. Respect WhatsApp Terms of Service and local regulations (consent, opt-out, etc.).

---

## Troubleshooting

| Problem | Possible fix |
|---------|--------------|
| QR code never appears | Check terminal output; ensure Puppeteer can launch Chromium. On Ubuntu: `sudo apt install -y chromium-browser` or install required libs. |
| `WhatsApp client is not ready` | Wait until you see the “Ready and Authenticated” log. Restart and re-scan if needed. |
| Database connection error | Verify `DATABASE_URL` in `.env` and that MySQL is running and the database exists. |
| Messages stay PENDING | Engine may not be ready, or the campaign was not in DRAFT when processing started. Check server logs. |
| CSV parse fails | Ensure UTF-8 encoding and a header row. Column for phone must be named `phone`, `phoneNumber`, or `mobile`. |

---

## Development Scripts

```bash
npm start          # Run the server
npm run db:generate # prisma generate
npm run db:push    # Push schema to DB
npm run db:studio  # Open Prisma Studio GUI
npm run setup      # install + generate + push
```

---

## License

MIT – use freely for your own projects.
