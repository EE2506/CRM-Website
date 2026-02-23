# SME POS Business Platform

A robust, full-stack SME Business Platform specializing in POS Analytics, CRM, and Issue Ticketing. This platform is designed with a modular Flask backend and a premium React frontend using Tailwind CSS v4 and shadcn/ui.

## 🚀 Key Features

- **Multi-tenant Architecture**: Isolated data for different companies.
- **POS Analytics**: Real-time sales tracking, revenue heatmaps, and top-selling product reports.
- **CRM Module**: Contact management, lead tracking, and activity logging.
- **Ticketing System**: SLA-aware customer support and internal issue tracking.
- **Authentication**: JWT-based security with Role-Based Access Control (RBAC).
- **Premium UI**: Modern SPA with Dark/Light mode, built on Tailwind CSS v4.
- **Automation**: PDF generation for invoices/reports and SMTP mailer integrated.

## 🛠 Tech Stack

- **Backend**: Flask (Python), PostgreSQL, Redis, WeasyPrint.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Query.
- **Security**: JWT (RS256), Bcrypt, HTTPS-ready.

## 📦 Project Structure

```text
/
├── app/                  # Flask Backend Application
│   ├── models.py         # DB Schemas
│   ├── routes/           # API Blueprints (Auth, Admin, CRM, etc.)
│   └── templates/        # Email & PDF Templates
├── frontend/             # React SPA
│   ├── src/
│   │   ├── components/   # UI & Theme Components
│   │   ├── pages/        # Dashboard, Login, Register
│   │   └── services/     # Axios & API Logic
│   └── tailwind.config.ts
├── migrations/           # Database Migrations
└── requirements.txt      # Python Dependencies
```

## 🚀 Getting Started

### 1. Backend Setup
1. Create a virtual environment: `python -m venv venv`
2. Activate it: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Linux)
3. Install dependencies: `pip install -r requirements.txt`
4. Set up your `.env` file (refer to `.env.example`).
5. Run the app: `flask run`

### 2. Frontend Setup
1. Go to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`

## 🚶 Detailed Walkthrough

For a deep dive into the implementation details and verification results, see [walkthrough.md](./walkthrough.md).

---
*Created with ❤️ by Antigravity*
