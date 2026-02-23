# 🚀 Flask Setup Guide: SME POS Business Platform

Welcome to the SME POS Business Platform! This guide will walk you through setting up the Flask backend, installing dependencies, and understanding the architecture.

## 🛠 Prerequisites

Ensure you have the following installed:
- **Python 3.10+**
- **PostgreSQL 16**
- **Redis 7**
- **Node.js & npm** (for the React frontend)

## 📦 Setting Up the Environment

### 1. Create a Virtual Environment
It's highly recommended to use a virtual environment to manage dependencies.

```powershell
python -m venv venv
.\venv\Scripts\activate
```

### 2. Install Dependencies
Install the necessary plugins and libraries specified in the `requirements.txt`.

```powershell
pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file in the root directory and configure your credentials.

```env
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-super-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/crm_db
REDIS_URL=redis://localhost:6379/0
```

## 🏗 Project Architecture

The project follows a **Modular Blueprint Architecture**, inspired by Laravel's clear separation of concerns.

```
/
├── app/
│   ├── __init__.py          # App factory & extension initialization
│   ├── models.py            # Database schemas
│   ├── routes/              # Modular blueprints (auth, crm, tickets, etc.)
│   └── utils/               # Helpers (security, PDF, decorators)
├── migrations/              # Database migration history
├── static/                  # Static assets
├── templates/               # Jinja2 templates for emails/PDFs
├── .env                     # Environment configuration
├── config.py                # App configuration classes
└── requirements.txt         # Dependency manifest
```

## 🔒 Security Implementation

We implement robust security patterns:
- **Password Hashing**: Bcrypt with cost factor 12.
- **CSRF Protection**: Enabled on all state-changing requests.
- **Rate Limiting**: Integrated with Redis to prevent brute-force attacks.
- **JWT Authentication**: Secure RS256-signed tokens for API access.
- **RBAC**: Granular permission-based access control.

## 🚀 Running the App

To start the development server:

```powershell
flask run
```

The API will be available at `http://localhost:5000/api/v1/`.

## 🧪 Testing

Run tests using `pytest`:

```powershell
pytest
```
