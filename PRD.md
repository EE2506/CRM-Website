# 📋 Product Requirements Document (PRD)
## SME POS Business Platform — Internal CRM & Issue Ticketing System
**Version:** 1.1.0  
**Date:** February 2026  
**Stack:** Flask (Backend API) · React (Frontend) · PostgreSQL (Primary DB) · Redis (Cache/Sessions)  
**UI Library:** shadcn/ui (New York style) · Tailwind CSS v4 · Dark Mode First  
**Inspiration:** Odoo · Shopify Ecosystem · Laravel Security Patterns · Linear · Vercel Dashboard

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Authentication & Security](#3-authentication--security)
4. [Role & Permission System](#4-role--permission-system)
5. [Company Side — Admin Portal](#5-company-side--admin-portal)
6. [POS Analytics Dashboard](#6-pos-analytics-dashboard)
7. [CRM Module](#7-crm-module)
8. [Issue Ticketing System](#8-issue-ticketing-system)
9. [Invoice & PDF Generation](#9-invoice--pdf-generation)
10. [Customer Side — Public Portal](#10-customer-side--public-portal)
11. [API Design](#11-api-design)
12. [Encryption & Audit Logs](#12-encryption--audit-logs)
13. [UI Design System — shadcn/ui · Dark Mode First](#13-ui-design-system--shadcnui--dark-mode-first)
14. [Tech Stack & Dependencies](#14-tech-stack--dependencies)
15. [Database Schema](#15-database-schema)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Deployment & DevOps](#17-deployment--devops)
18. [Future Roadmap](#18-future-roadmap)

---

## 1. Executive Summary

This platform is a **multi-tenant, full-stack SaaS solution** tailored for **Small and Medium Enterprises (SMEs)** operating retail, food service, or service-based POS businesses. It combines:

- An **internal CRM** for managing customer relationships, sales pipelines, and contacts
- An **issue ticketing system** for internal operations and customer support
- **POS analytics** surfaced in an admin dashboard with shareable public preview links
- **PDF invoice generation** with secure public-key-based sharing
- A **company-side portal** (B2B, role-gated, accounts deactivated by default)
- A **customer-side portal** (B2C, separate registration link, Shopify-like UX)
- **Laravel-inspired security architecture** implemented in Flask (CSRF, rate limiting, signed tokens, policy gates)
- A **dark-mode-first UI** built entirely on **shadcn/ui** (New York style) with Tailwind CSS v4, with a carefully tuned light mode fallback

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌─────────────────────────┐   ┌──────────────────────────┐    │
│  │   Company Admin Portal  │   │   Customer Public Portal  │    │
│  │   React SPA (internal)  │   │   React SPA (public)      │    │
│  │   /app/* routes         │   │   /portal/* routes        │    │
│  └────────────┬────────────┘   └──────────────┬───────────┘    │
└───────────────┼──────────────────────────────── ┼───────────────┘
                │ HTTPS / JWT                      │ HTTPS / JWT
┌───────────────▼──────────────────────────────── ▼───────────────┐
│                     FLASK REST API (v1)                          │
│  Blueprints: auth · admin · crm · tickets · pos · invoices ·    │
│              customer · webhooks · reports                       │
│  Middleware: CSRF · Rate Limiter · Audit Logger · Role Gate      │
└──────────┬───────────────────────────┬───────────────────────────┘
           │                           │
   ┌───────▼──────┐           ┌────────▼──────┐
   │  PostgreSQL  │           │  Redis Cache   │
   │  Primary DB  │           │  Sessions/OTP  │
   └──────────────┘           └───────────────┘
           │
   ┌───────▼──────┐
   │  File Store  │
   │  (S3/MinIO)  │
   │  PDF/Receipts│
   └──────────────┘
```

### Deployment Topology

- **Frontend:** React (Vite), served via Nginx, split into two separate entry points: `admin.domain.com` and `store.domain.com`
- **Backend:** Flask with Gunicorn (4 workers), behind Nginx reverse proxy
- **Database:** PostgreSQL 16 with connection pooling via PgBouncer
- **Cache:** Redis 7 (sessions, OTP codes, rate limit counters)
- **Queue:** Celery + Redis (PDF generation, email notifications, report jobs)
- **Storage:** MinIO (self-hosted S3-compatible) or AWS S3

---

## 3. Authentication & Security

### 3.1 Password Security

Inspired by Laravel's Bcrypt implementation:

```python
# Flask implementation
from flask_bcrypt import Bcrypt
bcrypt = Bcrypt(app)

# Hashing — cost factor 12 (bcrypt, NOT sha2 or md5)
password_hash = bcrypt.generate_password_hash(password, rounds=12).decode('utf-8')

# Verification
bcrypt.check_password_hash(stored_hash, provided_password)
```

**Rules:**
- All passwords hashed with **bcrypt (cost factor 12)**
- Passwords in logs: **NEVER stored in plaintext or SHA2**
- Log entries use a truncated HMAC-SHA256 of the session token (not the password) for correlation — admin-only readable (see Section 12)
- Minimum password length: 12 characters
- Must contain uppercase, lowercase, number, special character

### 3.2 JWT Token Strategy

```
Access Token:  15-minute expiry, RS256-signed (asymmetric key pair)
Refresh Token: 7-day expiry, stored in HttpOnly cookie
Public Share Token: Ed25519 signed, single-use or time-limited (for invoice/report previews)
```

### 3.3 Laravel-Inspired Security Patterns in Flask

| Laravel Feature | Flask Implementation |
|---|---|
| CSRF Protection | `flask-wtf` CSRFProtect on all state-changing endpoints |
| Rate Limiting | `flask-limiter` with Redis backend (e.g., 5 login attempts / 15 min) |
| Policy Gates | Custom `@require_permission('crm.edit')` decorators |
| Signed URLs | `itsdangerous.URLSafeTimedSerializer` for public share links |
| Sanctum-style API tokens | Personal Access Tokens stored hashed in DB |
| Middleware Pipeline | Flask `before_request` / `after_request` hooks |
| SQL Injection Protection | SQLAlchemy ORM only — raw queries forbidden |
| XSS Prevention | React escaping + Content-Security-Policy headers |
| CORS | `flask-cors` with strict origin whitelist |

### 3.4 Two-Factor Authentication (2FA)

- TOTP (Google Authenticator compatible) via `pyotp`
- Required for: Super Admin, Admin roles
- Optional for: All other roles
- Backup codes: 8 single-use codes, bcrypt-hashed in DB

### 3.5 Session Security

```
- Session ID: 128-bit random (secrets.token_hex(64))
- Stored in Redis with TTL
- Invalidated on password change
- Concurrent session limit: configurable per role (default: 3)
- IP pinning: optional per company setting
```

---

## 4. Role & Permission System

### 4.1 Default Role Hierarchy

```
Super Admin (Platform Level)
  └── Company Owner (per-tenant)
        ├── Admin
        │     ├── Manager
        │     │     ├── Sales Rep
        │     │     ├── Support Agent
        │     │     └── Cashier (POS only)
        │     └── Accountant (read-only financials)
        └── Viewer (read-only)
```

### 4.2 Account Activation Flow (Company Side)

**New accounts are DEACTIVATED by default.** This is enforced at the database and API level.

```
1. Admin creates user account → status = 'pending'
2. System sends activation email with signed link (24hr TTL)
3. User sets password via link
4. Account status → 'active' (only after admin approval if company requires it)
5. Admin can toggle: auto-activate after email verify OR require manual approval
```

```python
# User model default
class User(db.Model):
    status = db.Column(db.Enum('pending', 'active', 'suspended', 'deactivated'),
                       default='pending', nullable=False)
    activated_at = db.Column(db.DateTime, nullable=True)
    activated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
```

### 4.3 Dynamic Role Creation by Admin

Admins can define custom roles with granular permissions:

```json
{
  "role_name": "Inventory Manager",
  "permissions": [
    "inventory.view",
    "inventory.edit",
    "inventory.create",
    "reports.inventory.view",
    "crm.customers.view"
  ]
}
```

**Permission Namespaces:**

| Namespace | Permissions |
|---|---|
| `crm.*` | view, create, edit, delete, export |
| `tickets.*` | view, create, assign, close, escalate |
| `pos.*` | view, process, void, refund |
| `reports.*` | view, export, share |
| `invoices.*` | view, create, send, void |
| `inventory.*` | view, create, edit, delete |
| `users.*` | view, create, edit, activate, deactivate |
| `roles.*` | view, create, edit, delete |
| `logs.*` | view (admin only) |
| `analytics.*` | view, export, share |

### 4.4 Permission Enforcement

```python
# Decorator-based gate (Laravel Policy equivalent)
from functools import wraps
from flask import g, abort

def require_permission(*permissions):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = g.current_user
            if not user.has_any_permission(permissions):
                abort(403)
            return f(*args, **kwargs)
        return decorated
    return decorator

# Usage
@bp.route('/invoices', methods=['POST'])
@jwt_required
@require_permission('invoices.create')
def create_invoice():
    ...
```

---

## 5. Company Side — Admin Portal

### 5.1 Portal Entry Points

- **URL:** `https://admin.yourplatform.com` OR `https://yourplatform.com/app`
- **Invitation-only:** No public registration. Admin sends invite link.
- **Invite link:** Signed, time-limited (48 hours), single-use

### 5.2 Dashboard Modules

| Module | Description |
|---|---|
| **Overview** | KPI cards: revenue, tickets open, customers added, invoices pending |
| **POS Analytics** | Sales by hour/day/product, revenue trends, top items (see Section 6) |
| **CRM** | Contact management, pipeline, deals, activity log |
| **Ticketing** | Internal issue tracker + customer support queue |
| **Invoicing** | Create, send, track invoices; PDF export |
| **Inventory** | Product catalog, stock levels, low-stock alerts |
| **Users & Roles** | User management, role assignment, activation control |
| **Audit Logs** | Encrypted, admin-only access (see Section 12) |
| **Settings** | Company profile, integrations, security policy |

### 5.3 Company Onboarding Flow

```
1. Platform Super Admin creates company tenant
2. Company Owner account created (status: pending)
3. Owner activates account via email
4. Owner completes company profile wizard:
   - Business name, logo, address, tax ID
   - POS configuration (currency, tax rates, receipt template)
   - Security policy (2FA requirement, session limits)
   - Email templates
5. Owner invites Admin users
6. System ready
```

### 5.4 Multi-Tenancy

- Each company is a **tenant** identified by `company_id`
- All database queries are scoped by `company_id` at the ORM level
- Row-Level Security (RLS) policies enforced in PostgreSQL as a second layer
- Company data is logically isolated (shared DB, separate schemas optional)

---

## 6. POS Analytics Dashboard

### 6.1 Analytics Panels

**Sales Overview**
- Total Revenue (daily / weekly / monthly / custom range)
- Revenue by payment method (cash, card, GCash, Maya, etc.)
- Average Order Value (AOV)
- Transaction count

**Product Performance**
- Top 10 selling products by quantity and revenue
- Slow-moving inventory alerts
- Category breakdown (pie / donut chart)
- Product return rate

**Operational Metrics**
- Sales by hour heatmap (busiest hours)
- Sales by cashier/staff
- Void/refund rate
- Discount usage

**Customer Metrics**
- New vs returning customers
- Customer lifetime value (CLV)
- Purchase frequency

### 6.2 Chart Library

Frontend: **Recharts** (React) or **ApexCharts** for interactive charts  
Backend: Aggregated queries via SQLAlchemy + Pandas for complex reports

### 6.3 Public Share Link (Preview Mode)

Admins can generate a **public, read-only preview link** for analytics reports:

```
Feature: Public Key Preview
- Admin clicks "Share Report" on any dashboard panel
- System generates a signed public token (Ed25519 or URLSafeTimedSerializer)
- Token encodes: company_id, report_type, date_range, expiry
- Shareable URL: https://yourplatform.com/preview/{signed_token}
- Recipient sees read-only dashboard, no login required
- No PII visible in preview — aggregated data only
- Admin can set expiry: 1 hour / 24 hours / 7 days / one-time view
- Admin can revoke token at any time
```

```python
# Token generation
from itsdangerous import URLSafeTimedSerializer

def generate_report_share_token(company_id, report_config, expiry_seconds=86400):
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    payload = {
        'company_id': company_id,
        'report': report_config,
        'exp': expiry_seconds
    }
    return s.dumps(payload, salt='report-share')

def verify_report_share_token(token, max_age=86400):
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        return s.loads(token, salt='report-share', max_age=max_age)
    except Exception:
        return None
```

---

## 7. CRM Module

### 7.1 Features

**Contacts**
- Individual and company contacts
- Contact type: Lead / Prospect / Customer / Vendor
- Tags and custom fields
- Activity timeline (calls, emails, notes, meetings)
- Linked tickets and invoices

**Pipeline / Deals**
- Kanban board view (drag-and-drop stages)
- Deal value, probability, expected close date
- Assignee, team, source tracking
- Win/loss reason logging

**Activities**
- Log calls, emails, meetings, tasks
- Reminders and follow-up scheduling
- Integration hook for email (SMTP) — send emails from CRM

**Segmentation**
- Filter contacts by tags, purchase history, location, status
- Export filtered segments to CSV
- Link segments to marketing campaigns (future)

### 7.2 CRM Data Model (Summary)

```
Contact → Activities (1:N)
Contact → Deals (1:N)
Contact → Tickets (1:N)
Contact → Invoices (1:N)
Deal → Pipeline Stage (N:1)
Deal → Contact (N:1)
```

---

## 8. Issue Ticketing System

### 8.1 Ticket Types

| Type | Description |
|---|---|
| **Internal** | Bug reports, IT issues, HR requests — staff only |
| **Customer Support** | Submitted by customers via portal or email |
| **POS Issue** | Hardware/software problems at POS terminal |
| **Escalated** | Elevated priority tickets requiring management attention |

### 8.2 Ticket Fields

```
- Ticket ID (auto-generated: TKT-YYYYMMDD-XXXX)
- Type (Internal / Customer / POS / Escalated)
- Subject
- Description (rich text)
- Priority: Low / Medium / High / Critical
- Status: Open / In Progress / Awaiting Reply / Resolved / Closed
- Category (configurable by admin)
- Assignee (user)
- Reporter (user or customer)
- Related Contact (CRM link)
- Related Invoice (optional)
- Attachments (max 10MB per file, image/pdf/doc)
- Internal Notes (hidden from customer view)
- SLA Due Date (auto-set by priority)
- Tags
- Created At / Updated At / Resolved At
```

### 8.3 Ticket Workflow

```
Customer/Staff submits → Auto-assign by category rule OR manual assignment
      ↓
Agent picks up → Status: In Progress
      ↓
Agent replies (public) or adds internal note (private)
      ↓
Awaiting customer reply → auto-reminder after 48hrs
      ↓
Resolved → Customer confirms → Closed
      ↓
CSAT survey sent (optional)
```

### 8.4 SLA Configuration

| Priority | First Response | Resolution |
|---|---|---|
| Critical | 1 hour | 4 hours |
| High | 4 hours | 24 hours |
| Medium | 8 hours | 72 hours |
| Low | 24 hours | 7 days |

SLA breach triggers: email alert to manager + ticket flagged in dashboard.

### 8.5 Ticket Notifications

- Email notifications via SMTP (Flask-Mail or SendGrid)
- In-app notifications (websocket or polling)
- Configurable per event type per user

---

## 9. Invoice & PDF Generation

### 9.1 Invoice Features

**Creation**
- Manual invoice creation from CRM contact or POS sale
- Line items: product/service, quantity, unit price, discount, tax
- Multiple tax rate support (VAT, GST, etc.)
- Currency support (multi-currency with exchange rate)
- Payment terms: Due on receipt / Net 15 / Net 30 / Net 60 / Custom
- Notes / Terms & Conditions field

**Invoice Statuses**
```
Draft → Sent → Partially Paid → Paid → Overdue → Void
```

**Actions**
- Preview (in-browser PDF viewer)
- Download PDF
- Send via email (with customizable template)
- Generate public share link (customer-accessible, no login)
- Record payment (manual or auto via payment gateway)
- Void invoice
- Clone invoice
- Convert to receipt

### 9.2 PDF Generation

```python
# Backend PDF generation using WeasyPrint (HTML-to-PDF)
# Alternatively: ReportLab for programmatic generation

from weasyprint import HTML, CSS
from jinja2 import Environment, FileSystemLoader

def generate_invoice_pdf(invoice_data):
    env = Environment(loader=FileSystemLoader('templates/invoices'))
    template = env.get_template('invoice.html')
    html_content = template.render(invoice=invoice_data)
    
    pdf = HTML(string=html_content).write_pdf(
        stylesheets=[CSS(filename='static/invoice.css')]
    )
    return pdf

# PDF stored in S3/MinIO with access-controlled URL
# Filename: invoice_{company_id}_{invoice_number}_{uuid}.pdf
```

**Invoice PDF Contents:**
- Company logo, name, address, tax ID
- Invoice number, date, due date
- Bill To: customer name, address, email
- Line items table with subtotal, discount, tax, total
- Payment instructions / bank details
- QR code linking to online payment (future)
- Footer: terms, generated-by notice

### 9.3 Public Invoice Share Link

```
- Admin/Sales clicks "Share Invoice"
- Signed URL generated: /invoice/view/{public_token}
- Customer can view and download PDF without login
- Payment button visible if payment gateway integrated
- Token expiry: 30 days (configurable)
- Admin can revoke at any time
```

---

## 10. Customer Side — Public Portal

### 10.1 Separate Registration Flow

The customer portal is **entirely separate** from the company admin portal.

```
Registration URL: https://store.yourplatform.com/register
                  OR: https://yourplatform.com/portal/register
                  OR: Custom domain per company (e.g., shop.clientbusiness.com)
```

**Customer Registration Steps:**
1. Customer fills registration form (name, email, phone, password)
2. Email verification sent (required before access)
3. Account created, status: **active** (customers auto-activate after email verify)
4. Customer sets up profile (shipping address, preferences)

**Note:** Customer accounts are separate from company staff accounts. Different user table, different JWT issuer salt.

### 10.2 Customer Portal Features (Shopify-like UX)

**My Account**
- Profile management (name, email, phone, addresses)
- Password change
- Notification preferences

**Order History**
- View all past POS and online orders
- Order status tracking
- Reorder functionality

**Invoices**
- View and download invoices linked to their account
- Invoice status (paid / pending)
- Online payment (if gateway configured)

**Support Tickets**
- Submit new support ticket
- View ticket status and history
- Reply to agent messages
- Attach files

**Loyalty / Points (Optional Module)**
- Points balance
- Redemption history
- Available rewards

### 10.3 Customer Portal Security

- Same bcrypt password policy as company side
- Rate limiting on registration (5 per IP per hour)
- CAPTCHA on registration and login (reCAPTCHA v3)
- Email verification mandatory
- No access to any company admin data
- API endpoints prefixed `/api/v1/customer/` — separate blueprint with separate auth middleware

---

## 11. API Design

### 11.1 API Structure

```
Base URL: https://api.yourplatform.com/v1/

Company Side:
  POST   /auth/login
  POST   /auth/refresh
  POST   /auth/logout
  POST   /auth/2fa/verify

  GET    /admin/dashboard/summary
  GET    /admin/pos/analytics
  POST   /admin/pos/analytics/share-link

  GET    /crm/contacts
  POST   /crm/contacts
  GET    /crm/contacts/{id}
  PUT    /crm/contacts/{id}
  DELETE /crm/contacts/{id}

  GET    /crm/deals
  POST   /crm/deals
  PUT    /crm/deals/{id}

  GET    /tickets
  POST   /tickets
  GET    /tickets/{id}
  PUT    /tickets/{id}
  POST   /tickets/{id}/replies
  POST   /tickets/{id}/assign

  GET    /invoices
  POST   /invoices
  GET    /invoices/{id}
  PUT    /invoices/{id}
  GET    /invoices/{id}/pdf
  POST   /invoices/{id}/send
  POST   /invoices/{id}/share-link
  POST   /invoices/{id}/void

  GET    /users
  POST   /users/invite
  PUT    /users/{id}/activate
  PUT    /users/{id}/deactivate
  PUT    /users/{id}/role

  GET    /roles
  POST   /roles
  PUT    /roles/{id}
  DELETE /roles/{id}

  GET    /logs (admin only)

Customer Side:
  POST   /customer/auth/register
  POST   /customer/auth/login
  GET    /customer/profile
  PUT    /customer/profile
  GET    /customer/orders
  GET    /customer/invoices
  GET    /customer/invoices/{id}/pdf
  GET    /customer/tickets
  POST   /customer/tickets
  GET    /customer/tickets/{id}
  POST   /customer/tickets/{id}/replies

Public (No Auth):
  GET    /preview/report/{token}
  GET    /invoice/view/{token}
  GET    /invoice/view/{token}/pdf
```

### 11.2 API Response Format

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150
  },
  "message": "Invoice created successfully"
}
```

Error format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "email": ["Email already exists."],
      "amount": ["Amount must be greater than zero."]
    }
  }
}
```

---

## 12. Encryption & Audit Logs

### 12.1 Encryption Strategy

| Data Type | Encryption Method |
|---|---|
| User Passwords | bcrypt (rounds=12) — **never SHA2 or less** |
| PII in DB (SSN, Tax ID) | AES-256-GCM (SQLAlchemy encrypted column) |
| API Tokens (stored) | SHA-256 hash of token (one-way) |
| PDF files at rest | Server-side encryption (S3 SSE-S3) |
| Transport | TLS 1.3 only |
| Refresh Tokens | Stored as bcrypt hash, value sent to client only once |
| Audit Log Entries | AES-256-GCM encrypted, key held by platform |
| Session tokens in Redis | HMAC-SHA256 fingerprint stored, raw token in HttpOnly cookie |

**Explicit Non-Use:** MD5, SHA1, SHA2 (SHA-256/512) are **never used for password storage** or any user credential. They may only appear in non-security contexts (e.g., file integrity checksums).

### 12.2 Audit Log System

**What is logged:**
- All authentication events (login, logout, failed attempts, 2FA)
- All data mutations (create, update, delete) on sensitive models
- Permission changes (role assignment, activation/deactivation)
- Invoice actions (create, send, void)
- File access (PDF downloads, report shares)
- Admin actions (user management, log access)

**Log Entry Structure:**

```python
class AuditLog(db.Model):
    id = db.Column(db.UUID, primary_key=True, default=uuid4)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'))
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    actor_ip = db.Column(db.String(45))  # IPv6 compatible
    action = db.Column(db.String(100))   # e.g., 'invoice.created'
    resource_type = db.Column(db.String(50))
    resource_id = db.Column(db.String(100))
    payload_encrypted = db.Column(db.Text)  # AES-256-GCM encrypted JSON
    session_fingerprint = db.Column(db.String(64))  # HMAC of session, NOT password
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

**Access Control:**
- Audit logs viewable **only by users with `logs.view` permission** (Admin and Super Admin by default)
- Log decryption key stored separately from application config (HSM or Vault)
- Logs are append-only — no update or delete endpoints
- Log export available in encrypted format only (admin must authenticate with 2FA to export)

**Retention:** 90 days hot (PostgreSQL), 2 years cold (S3 Glacier or equivalent).

---

## 13. UI Design System — shadcn/ui · Dark Mode First

### 13.1 Philosophy & Approach

The entire UI — both the **company admin portal** and the **customer public portal** — is built exclusively with **shadcn/ui** components. shadcn/ui is not a traditional component library; it is a collection of copy-paste, fully owned, accessible components built on top of **Radix UI primitives** and styled with **Tailwind CSS v4**. This means all UI code lives in the project codebase (`/components/ui/`) and can be customized freely without fighting a library's opinionated internals.

**Design direction:** Linear.app meets Vercel Dashboard — clean, spacious, high contrast, data-dense without feeling cluttered. The dark theme is the primary experience; light mode is a first-class citizen but styled to match the same level of polish.

**Style preset:** `new-york` (shadcn's more refined style — sharper borders, tighter spacing, better suited for dense admin UIs).

### 13.2 Dark Mode — Default Behavior

Dark mode is the **default and primary** theme for both portals. The `dark` class is applied to the `<html>` element on first load and persisted in `localStorage`. Users may toggle to light mode; preference is remembered.

```typescript
// src/lib/theme.ts — Theme bootstrap (runs before React mounts)
const STORAGE_KEY = 'ui-theme';

export function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // Default to dark unless user has explicitly chosen light
  const theme = stored ?? 'dark';
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Applied in index.html <head> as inline script to prevent flash of light mode
```

```tsx
// src/components/ThemeToggle.tsx
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle}>
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
```

### 13.3 CSS Variable Token System

shadcn/ui uses a semantic CSS variable system. Tokens are defined in `globals.css` under `:root` (light) and `.dark` (dark). All Tailwind classes like `bg-background`, `text-foreground`, `bg-card` reference these variables automatically via `@theme inline`.

```css
/* src/styles/globals.css */
@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background:          var(--background);
  --color-foreground:          var(--foreground);
  --color-card:                var(--card);
  --color-card-foreground:     var(--card-foreground);
  --color-popover:             var(--popover);
  --color-popover-foreground:  var(--popover-foreground);
  --color-primary:             var(--primary);
  --color-primary-foreground:  var(--primary-foreground);
  --color-secondary:           var(--secondary);
  --color-secondary-foreground:var(--secondary-foreground);
  --color-muted:               var(--muted);
  --color-muted-foreground:    var(--muted-foreground);
  --color-accent:              var(--accent);
  --color-accent-foreground:   var(--accent-foreground);
  --color-destructive:         var(--destructive);
  --color-border:              var(--border);
  --color-input:               var(--input);
  --color-ring:                var(--ring);
  --color-sidebar:             var(--sidebar);
  --color-sidebar-foreground:  var(--sidebar-foreground);
  /* Chart colors for POS analytics */
  --color-chart-1:             var(--chart-1);
  --color-chart-2:             var(--chart-2);
  --color-chart-3:             var(--chart-3);
  --color-chart-4:             var(--chart-4);
  --color-chart-5:             var(--chart-5);
}

/* ─── DARK THEME (Default / Primary) ─────────────────────────────────── */
:root {
  --radius: 0.5rem;
  --background:              oklch(0.10 0.01 240);   /* near-black, blue-tinted */
  --foreground:              oklch(0.97 0.00 0);      /* off-white */
  --card:                    oklch(0.14 0.01 240);    /* slightly lighter than bg */
  --card-foreground:         oklch(0.97 0.00 0);
  --popover:                 oklch(0.13 0.01 240);
  --popover-foreground:      oklch(0.97 0.00 0);
  --primary:                 oklch(0.65 0.19 264);    /* indigo/violet accent */
  --primary-foreground:      oklch(0.99 0.00 0);
  --secondary:               oklch(0.18 0.01 240);
  --secondary-foreground:    oklch(0.90 0.00 0);
  --muted:                   oklch(0.18 0.01 240);
  --muted-foreground:        oklch(0.55 0.01 240);
  --accent:                  oklch(0.20 0.02 264);
  --accent-foreground:       oklch(0.97 0.00 0);
  --destructive:             oklch(0.58 0.24 27);     /* red */
  --border:                  oklch(0.22 0.01 240);
  --input:                   oklch(0.18 0.01 240);
  --ring:                    oklch(0.65 0.19 264);
  --sidebar:                 oklch(0.12 0.01 240);
  --sidebar-foreground:      oklch(0.97 0.00 0);
  --sidebar-primary:         oklch(0.65 0.19 264);
  --sidebar-primary-foreground: oklch(0.99 0.00 0);
  --sidebar-accent:          oklch(0.18 0.01 240);
  --sidebar-accent-foreground: oklch(0.90 0.00 0);
  --sidebar-border:          oklch(0.20 0.01 240);
  /* Chart palette — vibrant enough for dark bg */
  --chart-1:                 oklch(0.65 0.19 264);    /* indigo */
  --chart-2:                 oklch(0.70 0.18 180);    /* teal */
  --chart-3:                 oklch(0.75 0.18 84);     /* amber */
  --chart-4:                 oklch(0.68 0.22 320);    /* pink */
  --chart-5:                 oklch(0.72 0.20 145);    /* green */
}

/* ─── LIGHT THEME ─────────────────────────────────────────────────────── */
/* NOTE: Light mode uses shadcn's "Zinc" base — closest to dark mode's */
/* sophistication. Avoids the stark white glare of the default light theme. */
.light {
  --background:              oklch(0.97 0.00 240);    /* warm light grey, not pure white */
  --foreground:              oklch(0.12 0.01 240);
  --card:                    oklch(1.00 0.00 0);
  --card-foreground:         oklch(0.12 0.01 240);
  --popover:                 oklch(1.00 0.00 0);
  --popover-foreground:      oklch(0.12 0.01 240);
  --primary:                 oklch(0.50 0.19 264);    /* deeper indigo for light bg */
  --primary-foreground:      oklch(0.99 0.00 0);
  --secondary:               oklch(0.92 0.01 240);
  --secondary-foreground:    oklch(0.20 0.01 240);
  --muted:                   oklch(0.93 0.01 240);
  --muted-foreground:        oklch(0.48 0.01 240);
  --accent:                  oklch(0.91 0.02 264);
  --accent-foreground:       oklch(0.20 0.01 240);
  --destructive:             oklch(0.58 0.24 27);
  --border:                  oklch(0.88 0.01 240);
  --input:                   oklch(0.88 0.01 240);
  --ring:                    oklch(0.50 0.19 264);
  --sidebar:                 oklch(0.94 0.01 240);
  --sidebar-foreground:      oklch(0.12 0.01 240);
  --sidebar-primary:         oklch(0.50 0.19 264);
  --sidebar-primary-foreground: oklch(0.99 0.00 0);
  --sidebar-accent:          oklch(0.90 0.01 240);
  --sidebar-accent-foreground: oklch(0.20 0.01 240);
  --sidebar-border:          oklch(0.86 0.01 240);
  --chart-1:                 oklch(0.50 0.19 264);
  --chart-2:                 oklch(0.55 0.18 180);
  --chart-3:                 oklch(0.60 0.18 84);
  --chart-4:                 oklch(0.53 0.22 320);
  --chart-5:                 oklch(0.57 0.20 145);
}
```

> **Light Mode Note:** shadcn/ui's light theme is genuinely excellent — the "Zinc" base color palette in particular produces a sophisticated, non-blinding light interface that rivals the dark experience. The platform uses a **warm light grey** (`oklch(0.97)`) as the background instead of pure white, which dramatically reduces eye strain and gives the UI a premium feel. The same component set, the same spacing, the same shadcn primitives — it just *feels* slightly less dramatic than dark, which is expected. Users who prefer light won't be sacrificing quality.

### 13.4 shadcn/ui Component Inventory

Every UI element across both portals is sourced from shadcn/ui. No other component library is used for core UI.

**Setup:**
```bash
# Initialize shadcn/ui in the project
npx shadcn@latest init
# Choose: New York style, Zinc base color, CSS variables: yes

# Add all components used
npx shadcn@latest add button card input label select textarea
npx shadcn@latest add dialog sheet drawer popover dropdown-menu
npx shadcn@latest add table data-table pagination
npx shadcn@latest add form checkbox radio-group switch
npx shadcn@latest add badge avatar tooltip separator
npx shadcn@latest add sidebar navigation-menu breadcrumb
npx shadcn@latest add tabs accordion collapsible
npx shadcn@latest add alert alert-dialog toast sonner
npx shadcn@latest add command combobox calendar date-picker
npx shadcn@latest add progress skeleton
npx shadcn@latest add chart  # shadcn's Recharts wrapper
```

**Component → Use-case mapping:**

| shadcn/ui Component | Used For |
|---|---|
| `Sidebar` + `SidebarMenu` | Main navigation — admin and customer portals |
| `Card` + `CardHeader` + `CardContent` | KPI widgets, data panels, form containers |
| `DataTable` (`@tanstack/react-table`) | Contacts, tickets, invoices, users, products |
| `Chart` (Recharts wrapper) | POS analytics — bar, line, area, pie |
| `Dialog` / `Sheet` | Create/edit forms (modals for desktop, sheets for mobile) |
| `Drawer` | Mobile-first action menus |
| `Command` (⌘K palette) | Global search across CRM, tickets, invoices |
| `Form` + `react-hook-form` + `zod` | All forms (login, create contact, create invoice, etc.) |
| `Sonner` (toast) | Success / error / info notifications |
| `Alert` / `AlertDialog` | Destructive action confirmations (void invoice, deactivate user) |
| `Badge` | Ticket status, invoice status, user role indicators |
| `Avatar` | User profiles in sidebar, CRM activity feed |
| `Calendar` / `DatePicker` | Invoice due dates, deal close dates, report date ranges |
| `Tabs` | CRM contact detail view, settings pages |
| `Combobox` | Assignee selector, contact search, product selector in invoices |
| `Progress` | SLA countdown bars in ticket list |
| `Skeleton` | Loading states for all data-fetching components |
| `Breadcrumb` | Navigation trail in nested admin pages |
| `NavigationMenu` | Customer portal top nav |
| `Switch` | Toggle settings (2FA required, auto-activate users, etc.) |
| `Separator` | Section dividers in detail views |

### 13.5 Project File Structure (Frontend)

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components (owned, editable)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── sidebar.tsx
│   │   ├── chart.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── AdminSidebar.tsx   # App sidebar using shadcn Sidebar primitives
│   │   ├── AdminHeader.tsx    # Top bar with search (Command), ThemeToggle, Avatar
│   │   ├── CustomerNav.tsx    # Customer portal navigation
│   │   └── ThemeToggle.tsx
│   ├── crm/
│   ├── tickets/
│   ├── invoices/
│   ├── analytics/
│   └── shared/
├── styles/
│   └── globals.css            # CSS variable tokens (dark + light themes)
├── lib/
│   ├── theme.ts               # Theme init script
│   └── utils.ts               # shadcn cn() helper
└── hooks/
    └── useTheme.ts            # Theme state and toggle
```

### 13.6 Admin Portal Layout (shadcn Sidebar Pattern)

The admin portal uses shadcn/ui's `Sidebar` component with the **inset** variant — a collapsible left sidebar that is aware of dark mode natively.

```tsx
// Layout structure
<SidebarProvider defaultOpen>
  <AppSidebar />          {/* Left: shadcn Sidebar with SidebarMenu */}
  <SidebarInset>
    <header>              {/* Top bar: Breadcrumb + Command search + ThemeToggle + Avatar */}
    </header>
    <main>
      <Outlet />          {/* React Router page content */}
    </main>
  </SidebarInset>
</SidebarProvider>
```

**Sidebar sections:**
```
● Dashboard (overview KPIs)
─────────────────────────
● POS Analytics
  ↳ Sales Overview
  ↳ Product Performance
  ↳ Staff Reports
─────────────────────────
● CRM
  ↳ Contacts
  ↳ Deals / Pipeline
  ↳ Activities
─────────────────────────
● Tickets
  ↳ All Tickets
  ↳ My Queue
  ↳ Escalated
─────────────────────────
● Invoices
  ↳ All Invoices
  ↳ Create Invoice
─────────────────────────
● Inventory
─────────────────────────
● Settings
  ↳ Company
  ↳ Users & Roles
  ↳ Security
  ↳ Audit Logs (admin only)
```

### 13.7 Customer Portal Layout (Shopify-style)

The customer portal uses a **top navigation bar** (`NavigationMenu`) with a sticky header — closer to Shopify's customer account UX. Dark mode default, same token system.

```tsx
// Customer portal structure
<div className="min-h-screen bg-background text-foreground">
  <CustomerNav />          {/* Sticky top bar: logo, nav links, ThemeToggle, Avatar */}
  <main className="container mx-auto px-4 py-8">
    <Outlet />
  </main>
  <CustomerFooter />
</div>
```

### 13.8 Component Usage Guidelines

**Consistency rules:**

- All form fields use shadcn `Input`, `Label`, `Select`, `Textarea` — never raw HTML inputs
- All buttons use shadcn `Button` with appropriate variants: `default` (primary action), `secondary`, `outline`, `ghost`, `destructive`
- Destructive actions (void, delete, deactivate) always show a shadcn `AlertDialog` before executing — never an inline confirm
- All data tables use shadcn `DataTable` with `@tanstack/react-table` — sortable, filterable, paginated
- Status indicators use shadcn `Badge` with semantic color variants mapped to CSS variables
- All modals for creating/editing records open as `Sheet` on mobile (full-height slide-in) and `Dialog` on desktop
- Loading states always render `Skeleton` components shaped like the real content — never spinners alone
- The `Command` palette (⌘K / Ctrl+K) is globally available in the admin portal for cross-module search

**Badge color mapping:**

```tsx
// Ticket status → Badge variant
const ticketStatusVariant = {
  open:            'default',       // primary color
  in_progress:     'secondary',
  awaiting_reply:  'outline',
  resolved:        'secondary',
  closed:          'ghost',
} as const;

// Invoice status → Badge variant
const invoiceStatusVariant = {
  draft:           'outline',
  sent:            'default',
  paid:            'success',       // custom green token
  overdue:         'destructive',
  void:            'ghost',
} as const;
```

### 13.9 Typography

shadcn/ui pairs with the following type scale (Tailwind CSS):

| Element | Class |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight` |
| Section heading | `text-lg font-medium` |
| Card title | `text-base font-semibold` |
| Body text | `text-sm text-foreground` |
| Muted / helper text | `text-sm text-muted-foreground` |
| Table cell | `text-sm` |
| Badge / chip | `text-xs font-medium` |

Font: **Inter** (Google Fonts) — the standard pairing for shadcn/ui. Applied via CSS variable `--font-sans`.

### 13.10 Dark vs Light — Honest Assessment

| Aspect | Dark Mode | Light Mode |
|---|---|---|
| **Default** | ✅ Yes | No (opt-in) |
| **shadcn quality** | Exceptional — deep blacks, crisp borders | Very good — Zinc base avoids stark glare |
| **Chart readability** | High contrast chart colors shine | Slightly desaturated chart palette needed |
| **Eye strain (long sessions)** | Lower for most users | Fine with warm-grey background (not pure white) |
| **PDF invoice preview** | Card with white PDF on dark bg — intentional contrast | Native — invoice background is white anyway |
| **Recommendation** | Primary target — design starts here | Fully supported, styled to match dark's quality |

> shadcn/ui's light mode *is* genuinely great — particularly the New York style with Zinc colors. The decision to default to dark is a UX/brand choice, not a reflection of light mode's quality. Both themes receive equal design attention.

---

## 14. Tech Stack & Dependencies

### 14.1 Backend (Flask)

```
Flask==3.1.x
Flask-SQLAlchemy==3.1.x     # ORM
Flask-Migrate==4.x          # DB migrations (Alembic)
Flask-JWT-Extended==4.6.x   # JWT auth
Flask-Bcrypt==1.0.x         # Password hashing
Flask-Limiter==3.x          # Rate limiting (Redis backend)
Flask-WTF==1.2.x            # CSRF protection
Flask-CORS==4.x             # CORS handling
Flask-Mail==0.9.x           # Email sending
Celery==5.3.x               # Async task queue
Redis==5.x                  # Cache, session store, Celery broker
psycopg2-binary==2.9.x      # PostgreSQL driver
SQLAlchemy==2.x
itsdangerous==2.1.x         # Signed tokens / share links
WeasyPrint==61.x            # HTML to PDF
Jinja2==3.1.x               # PDF/email templates
Pillow==10.x                # Image processing
pyotp==2.9.x                # TOTP 2FA
cryptography==42.x          # AES-256-GCM encryption
marshmallow==3.21.x         # Serialization / validation
pandas==2.x                 # Analytics aggregation
gunicorn==21.x              # WSGI server
```

### 14.2 Frontend (React)

```
# Core
react==19.x
react-router-dom==7.x
vite==6.x                         # Build tool

# State & Data
@tanstack/react-query==5.x        # Server state, caching, loading states
zustand==4.x                      # Client state (theme, sidebar, user prefs)
axios==1.x                        # HTTP client

# UI — shadcn/ui ecosystem (PRIMARY — all UI from here)
shadcn/ui                         # Component collection (New York style)
@radix-ui/react-*                 # Radix UI primitives (shadcn dependency)
tailwindcss==4.x                  # CSS framework (v4 with @theme inline)
tw-animate-css                    # shadcn animation utilities
lucide-react                      # Icon library (shadcn default)
class-variance-authority (cva)    # Component variant management
clsx + tailwind-merge             # cn() utility for conditional classes
cmdk                              # Command palette (⌘K) — used by shadcn Command

# Charts (via shadcn Chart wrapper)
recharts==2.x                     # shadcn/ui Chart component uses Recharts

# Forms & Validation
react-hook-form==7.x              # Form state management (shadcn Form uses this)
zod==3.x                          # Schema validation

# Other
@tanstack/react-table==8.x        # Headless table (shadcn DataTable uses this)
react-pdf==7.x                    # In-browser PDF viewer (invoice preview)
sonner                            # Toast notifications (shadcn-recommended)
date-fns==3.x                     # Date utilities (shadcn Calendar dependency)
next-themes                       # Theme persistence + system preference detection
```

### 14.3 Database

```
PostgreSQL 16          # Primary database
Redis 7                # Cache, sessions, Celery broker
```

### 14.4 Infrastructure

```
Nginx                  # Reverse proxy, static file serving
Docker + Docker Compose # Containerization
GitHub Actions         # CI/CD
MinIO (or AWS S3)      # File storage
Let's Encrypt          # SSL/TLS
```

---

## 15. Database Schema

### 15.1 Core Tables (Summary)

```sql
-- Multi-tenancy
companies (id, name, slug, plan, logo_url, settings_json, created_at)

-- Users (Company Staff)
users (id, company_id, email, password_hash, first_name, last_name,
       status [pending/active/suspended/deactivated], role_id,
       totp_secret_encrypted, last_login_at, activated_at, activated_by,
       created_at, updated_at)

-- Customer Portal Users (Separate Table)
customers (id, company_id, email, password_hash, first_name, last_name,
           phone, status [pending/active/suspended], email_verified_at,
           created_at, updated_at)

-- Roles & Permissions
roles (id, company_id, name, is_system_default, created_by, created_at)
permissions (id, namespace, action, description)
role_permissions (role_id, permission_id)

-- CRM
contacts (id, company_id, type [lead/prospect/customer/vendor],
          first_name, last_name, company_name, email, phone,
          address_json, tags_json, assigned_to, created_at, updated_at)

deals (id, company_id, contact_id, title, value, currency,
       stage_id, probability, expected_close, assigned_to,
       won_at, lost_at, loss_reason, created_at, updated_at)

pipeline_stages (id, company_id, name, order_index, color)

activities (id, company_id, contact_id, deal_id, user_id,
            type [call/email/note/meeting/task], subject, body,
            due_at, completed_at, created_at)

-- Ticketing
tickets (id, company_id, ticket_number, type, subject, description,
         priority [low/medium/high/critical], status, category_id,
         assignee_id, reporter_id, reporter_type [user/customer],
         contact_id, invoice_id, sla_due_at, resolved_at, closed_at,
         created_at, updated_at)

ticket_replies (id, ticket_id, author_id, author_type, body,
                is_internal, attachments_json, created_at)

-- POS / Sales
pos_transactions (id, company_id, transaction_number, cashier_id,
                  customer_id, items_json, subtotal, discount, tax,
                  total, payment_method, status, voided_at, created_at)

-- Invoices
invoices (id, company_id, invoice_number, contact_id, customer_id,
          status [draft/sent/partial/paid/overdue/void],
          issue_date, due_date, currency, subtotal, discount_total,
          tax_total, total, paid_amount, notes, terms,
          pdf_url, share_token, share_token_expires_at,
          sent_at, paid_at, void_at, created_by, created_at, updated_at)

invoice_items (id, invoice_id, description, quantity, unit_price,
               discount_pct, tax_rate, line_total)

-- Audit Logs
audit_logs (id, company_id, actor_id, actor_ip, action,
            resource_type, resource_id, payload_encrypted,
            session_fingerprint, created_at)

-- Share Tokens
share_tokens (id, company_id, token_hash, type [report/invoice],
              resource_id, config_json, expires_at, revoked_at,
              view_count, max_views, created_by, created_at)
```

---

## 16. Non-Functional Requirements

### 16.1 Performance

| Metric | Target |
|---|---|
| API p95 response time | < 300ms |
| Dashboard load time | < 2 seconds |
| PDF generation time | < 5 seconds |
| Concurrent users per tenant | 100 (starter), 1000 (enterprise) |
| Database query time (p99) | < 100ms |
| Report aggregation (daily) | < 10 seconds |

### 16.2 Availability

- Uptime SLA: 99.9% (8.7 hours downtime/year)
- Maintenance windows: Sundays 2 AM – 4 AM local time
- Database backups: Every 6 hours, retained 30 days
- Disaster recovery RPO: 6 hours, RTO: 4 hours

### 16.3 Security Compliance

- OWASP Top 10 mitigation (required)
- GDPR-ready data handling (data export, right to deletion)
- PCI-DSS awareness (no raw card data stored — payment gateway tokenization)
- Philippine Data Privacy Act (Republic Act 10173) compliance for PH market

### 16.4 Browser Support

- Chrome / Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile: iOS Safari, Android Chrome

### 16.5 Accessibility

- WCAG 2.1 AA compliance for customer portal
- Keyboard navigation support
- Screen reader compatible
- shadcn/ui components are built on **Radix UI primitives**, which provide WAI-ARIA compliant behavior out of the box — dialogs trap focus correctly, dropdowns have proper roles, comboboxes follow ARIA patterns. This gives us accessibility largely for free without custom ARIA implementation.

---

## 17. Deployment & DevOps

### 17.1 Docker Compose (Development)

```yaml
version: '3.9'
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]

  flask_api:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
      - JWT_PRIVATE_KEY=${JWT_PRIVATE_KEY}
    depends_on: [postgres, redis]

  celery_worker:
    build: ./backend
    command: celery -A app.celery worker --loglevel=info
    depends_on: [flask_api, redis]

  react_admin:
    build: ./frontend/admin
    
  react_customer:
    build: ./frontend/customer

  postgres:
    image: postgres:16
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
```

### 17.2 Environment Variables (Required)

```bash
# App
SECRET_KEY=                    # Flask secret (64+ chars)
JWT_PRIVATE_KEY=               # RS256 private key (PEM)
JWT_PUBLIC_KEY=                # RS256 public key (PEM)
REPORT_SHARE_SALT=             # Salt for URLSafeTimedSerializer

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379/0

# Encryption
LOG_ENCRYPTION_KEY=            # AES-256 key for audit log encryption
PII_ENCRYPTION_KEY=            # AES-256 key for PII fields

# Email
MAIL_SERVER=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_DEFAULT_SENDER=

# Storage
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=

# Security
BCRYPT_ROUNDS=12
SESSION_LIFETIME_MINUTES=1440
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
```

### 17.3 CI/CD Pipeline (GitHub Actions)

```
Push to main →
  Lint (flake8, eslint) →
  Unit Tests (pytest, jest) →
  Security Scan (bandit, npm audit) →
  Build Docker Images →
  Push to Registry →
  Deploy to Staging →
  Smoke Tests →
  Manual Approval →
  Deploy to Production
```

---

## 18. Future Roadmap

### Phase 2 (Months 4–6)
- **Payment Gateway Integration** — Stripe, PayMongo (PH), Maya Business
- **Email Marketing Module** — Campaign builder, segment-based sends
- **Mobile App** — React Native for POS and customer portal
- **Webhook System** — Outbound webhooks for third-party integrations
- **Inventory Management** — Stock tracking, purchase orders, supplier management

### Phase 3 (Months 7–12)
- **Multi-Branch Support** — POS terminals per branch, consolidated reporting
- **Loyalty & Rewards Program** — Points, tiers, referral codes
- **AI-Powered Insights** — Sales forecasting, churn prediction, anomaly detection
- **Custom Report Builder** — Drag-and-drop analytics report creation
- **Third-Party Integrations** — QuickBooks, Xero, Google Workspace, Slack

### Phase 4 (Year 2)
- **Marketplace App Store** — Third-party plugins (Odoo/Shopify-style ecosystem)
- **White-label Offering** — Rebrandable platform for agencies
- **Enterprise SSO** — SAML 2.0, Azure AD, Okta integration
- **Advanced Fraud Detection** — ML-based transaction anomaly scoring

---

## Appendix A: Security Checklist

- [x] bcrypt (rounds=12) for all passwords — no SHA2 or below for credentials
- [x] JWT with RS256 asymmetric keys
- [x] CSRF protection on all state-changing endpoints
- [x] Rate limiting on auth endpoints (Redis-backed)
- [x] SQL injection prevention (ORM only, no raw queries)
- [x] XSS prevention (React escaping + CSP headers)
- [x] Company staff accounts deactivated by default
- [x] Customer accounts separate from staff accounts
- [x] Audit logs encrypted with AES-256-GCM
- [x] Audit logs accessible by admin-role only
- [x] Passwords never appear in logs
- [x] HTTPS/TLS 1.3 enforced
- [x] Signed, revocable public share tokens
- [x] 2FA required for admin roles
- [x] Session invalidation on password change
- [x] PII fields encrypted at rest

## Appendix B: UI / Design System Checklist

- [x] Dark mode applied by default via `dark` class on `<html>` — no flash of light mode
- [x] Theme preference persisted in `localStorage` via `next-themes`
- [x] System preference (`prefers-color-scheme`) respected on first visit if no stored preference
- [x] All UI components sourced exclusively from **shadcn/ui** (New York style)
- [x] CSS variable tokens defined for all semantic colors (`--background`, `--primary`, `--card`, etc.)
- [x] OKLCH color space used throughout (Tailwind v4 default — perceptually uniform, better dark/light contrast)
- [x] Light mode uses warm grey base (`oklch(0.97)`) — not pure white — for reduced eye strain
- [x] Chart colors are distinct and readable in both dark and light themes
- [x] `Skeleton` loaders used for all async content (no raw spinners)
- [x] `AlertDialog` required before all destructive actions
- [x] `Command` palette (⌘K) available globally in admin portal
- [x] `Sheet` used for forms on mobile, `Dialog` on desktop (responsive modal pattern)
- [x] `Sonner` for all toast notifications (replaces react-hot-toast)
- [x] `Inter` font loaded via CSS — matches shadcn/ui visual identity
- [x] Lucide icons used consistently throughout (shadcn default icon library)
- [x] Radix UI primitives ensure ARIA compliance without custom implementation

---

## Appendix C: Glossary

| Term | Definition |
|---|---|
| **shadcn/ui** | Open-source, copy-paste React component collection built on Radix UI + Tailwind — all components are owned in the codebase, not imported from a package |
| **New York style** | shadcn/ui's more refined preset — sharper borders, slightly denser spacing, better for admin/data UIs |
| **OKLCH** | Perceptually uniform color space used by Tailwind v4 — colors stay visually consistent across light/dark |
| **Radix UI** | Headless, accessible UI primitives that underpin shadcn/ui components |
| **Tenant** | A company using the platform (multi-tenancy) |
| **Company Side** | Admin portal used by business staff |
| **Customer Side** | Public portal used by end customers |
| **Share Token** | Signed URL token for public preview of reports or invoices |
| **Public Key Preview** | Shareable, read-only dashboard/invoice link requiring no login |
| **POS** | Point of Sale — the transaction system at retail/service locations |
| **SLA** | Service Level Agreement — response/resolution time commitments |
| **CSAT** | Customer Satisfaction score (post-ticket survey) |
| **CLV** | Customer Lifetime Value |
| **bcrypt** | Password hashing algorithm — the only approved hash for credentials |
| **AES-256-GCM** | Symmetric encryption used for audit logs and PII fields |

---

*Document Owner: Platform Architecture Team*  
*Version 1.1.0 — Added: Section 13 UI Design System (shadcn/ui, dark mode first, theme tokens)*  
*Review Cycle: Quarterly*  
*Next Review: May 2026*
