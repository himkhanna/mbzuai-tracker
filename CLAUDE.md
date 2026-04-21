# CLAUDE.md — MBZUAI Delivery & Store Tracking System

## Project Overview

**Project Name:** MBZUAI Delivery & Store Tracking System  
**Client:** Mohamed Bin Zayed University of Artificial Intelligence (MBZUAI)  
**Build Target:** Claude Code (full-stack web application)  
**Purpose:** Replace Excel/email-based tracking with a centralized digital system for Purchase Orders (PO) and Direct Payments (DP), covering end-to-end delivery lifecycle visibility.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | **Java Spring Boot 3.4.5** (REST API) |
| Database | **PostgreSQL 18** (via Spring Data JPA + Hibernate) |
| Auth | JWT (JJWT 0.12.6) + BCrypt (role-based) |
| Email/Notifications | JavaMailSender (SMTP) + in-app notifications |
| File Export | Apache POI 5.3.0 (Excel) + Apache PDFBox 3.0.3 (PDF) |
| State Management | Zustand |
| Data Tables | TanStack Table v8 |
| Charts/Dashboard | Recharts |
| File Upload | Spring Multipart + Apache POI parser |
| Scheduling | Spring `@Scheduled` (replaces node-cron) |
| Email Templates | Thymeleaf (replaces Handlebars) |
| Build Tool | Maven 3.9.6 |
| Java Version | Java 21 (Eclipse Adoptium Temurin) |

> **Note:** The original Node.js/Express backend (`server/`) has been fully replaced by the Java Spring Boot backend (`server-java/`). Do not modify `server/`.

---

## Project File Structure

```
mbzuai-tracker/
├── CLAUDE.md
├── start-java-backend.bat          ← double-click to start backend
├── db/
│   └── migrations.sql              ← manual DB migration scripts
├── server-java/                    ← ACTIVE backend (Spring Boot)
│   ├── pom.xml
│   ├── src/main/
│   │   ├── java/ae/mbzuai/tracker/
│   │   │   ├── MbzuaiTrackerApplication.java
│   │   │   ├── config/
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   └── DataSeeder.java
│   │   │   ├── security/
│   │   │   │   ├── JwtUtil.java
│   │   │   │   └── JwtAuthFilter.java
│   │   │   ├── entity/
│   │   │   │   ├── User.java
│   │   │   │   ├── Order.java
│   │   │   │   ├── Item.java
│   │   │   │   ├── Notification.java
│   │   │   │   ├── AuditLog.java
│   │   │   │   └── AppSetting.java          ← runtime config key-value store
│   │   │   ├── repository/
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── OrderRepository.java
│   │   │   │   ├── ItemRepository.java
│   │   │   │   ├── NotificationRepository.java
│   │   │   │   ├── AuditLogRepository.java
│   │   │   │   └── AppSettingRepository.java
│   │   │   ├── service/
│   │   │   │   ├── AuthService.java
│   │   │   │   ├── OrderService.java
│   │   │   │   ├── ItemService.java
│   │   │   │   ├── UserService.java
│   │   │   │   ├── NotificationService.java
│   │   │   │   ├── AuditService.java
│   │   │   │   ├── ImportService.java
│   │   │   │   ├── StatusCalculator.java
│   │   │   │   ├── SettingsService.java     ← runtime settings read/write
│   │   │   │   ├── EmailIngestionService.java
│   │   │   │   ├── AmazonScreenshotService.java
│   │   │   │   └── PdfPoParser.java
│   │   │   ├── controller/
│   │   │   │   ├── AuthController.java
│   │   │   │   ├── OrderController.java
│   │   │   │   ├── ItemController.java
│   │   │   │   ├── UserController.java
│   │   │   │   ├── NotificationController.java
│   │   │   │   ├── AuditController.java
│   │   │   │   ├── ReportController.java
│   │   │   │   ├── ImportController.java
│   │   │   │   └── SettingsController.java  ← GET/PUT /api/settings
│   │   │   ├── dto/
│   │   │   │   ├── LoginRequest.java / LoginResponse.java
│   │   │   │   ├── UserDto.java / UserRequest.java
│   │   │   │   ├── OrderDto.java / OrderRequest.java
│   │   │   │   ├── ItemDto.java / ItemRequest.java
│   │   │   │   ├── AuditLogDto.java
│   │   │   │   ├── ChangePasswordRequest.java
│   │   │   │   └── EmailImportResult.java
│   │   │   ├── util/
│   │   │   │   └── SamplePdfGenerator.java
│   │   │   └── scheduler/
│   │   │       └── DeliveryScheduler.java
│   │   └── resources/
│   │       └── application.yml
│   └── target/
│       └── tracker-1.0.0.jar       ← built JAR
├── server/                         ← OLD Node.js backend (do not use)
├── client/                         ← Frontend
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── types/index.ts
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   └── notificationStore.ts
│   │   ├── api/client.ts
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Tracker.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   ├── CreateOrder.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   ├── AuditLog.tsx
│   │   │   ├── TestTools.tsx        ← Admin test tool (PDF download, Amazon screenshot, email check)
│   │   │   └── Settings.tsx         ← Admin settings (email ingestion config)
│   │   └── components/
│   │       ├── layout/ (Sidebar, Navbar, NotificationBell)
│   │       ├── tracker/ (OrderTable, ItemLifecycleRow, StatusBadge, FilterBar)
│   │       ├── dashboard/ (KPICard, StatusChart, DelayAlert)
│   │       ├── forms/ (POForm, DPForm, LineItemForm)
│   │       └── shared/ (DatePicker, ExportButton, ConfirmDialog, EditOrderModal)
│   └── vite.config.ts              ← proxies /api → localhost:3001
└── prisma/                         ← OLD Prisma schema (reference only)
```

---

## Database Schema (JPA / PostgreSQL)

Tables are auto-created by Hibernate (`ddl-auto: update`).  
**New columns added after initial schema must be applied manually — see [DB Migration Scripts](#db-migration-scripts) below.**

### Users table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR | |
| email | VARCHAR | UNIQUE |
| password | VARCHAR | BCrypt hashed |
| role | VARCHAR | ADMIN \| VENDOR_MANAGEMENT \| PROCUREMENT \| STORE \| FINANCE \| IT \| ASSET |
| department | VARCHAR | nullable |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Orders table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| type | VARCHAR | PO \| DP |
| reference | VARCHAR | UNIQUE |
| vendor | VARCHAR | |
| supplier | VARCHAR | nullable |
| delivery_address | VARCHAR | nullable |
| end_user | VARCHAR | |
| department | VARCHAR | nullable |
| order_date | DATE | |
| total_value | DOUBLE | nullable |
| currency | VARCHAR | default AED |
| status | VARCHAR | PENDING \| PARTIALLY_DELIVERED \| FULLY_DELIVERED \| COMPLETED \| DELAYED |
| order_category | VARCHAR | **GOODS \| SERVICES** — default GOODS; SERVICES orders skipped by email ingestion |
| notes | TEXT | nullable |
| vendor_platform | VARCHAR | nullable — e.g. AMAZON |
| vendor_order_id | VARCHAR | nullable — e.g. Amazon order number for screenshot matching |
| vendor_sync_data | TEXT | nullable |
| vendor_last_synced | TIMESTAMP | nullable |
| is_deleted | BOOLEAN | soft delete |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Items table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| order_id | UUID | FK → orders |
| item_category | VARCHAR | nullable |
| description | VARCHAR | |
| quantity | INT | ordered quantity |
| quantity_received | INT | nullable — supports partial delivery |
| unit_price | DOUBLE | nullable |
| total_price | DOUBLE | nullable |
| purchase_link | VARCHAR | nullable |
| line_number | VARCHAR | nullable — from Oracle PO |
| good_type | VARCHAR | GOODS \| SERVICES (default GOODS) |
| requisition_number | VARCHAR | nullable |
| expected_delivery_date | DATE | nullable — updated by Amazon screenshot OCR |
| received_date | DATE | nullable |
| stored_date | DATE | auto = received_date |
| asset_tagging_date | DATE | nullable |
| it_config_date | DATE | nullable |
| handover_date | DATE | nullable |
| custom_clearance_date | DATE | nullable |
| requires_asset_tagging | BOOLEAN | default false |
| requires_it_config | BOOLEAN | default false |
| status | VARCHAR | see Item Statuses below |
| finance_remarks | TEXT | nullable |
| final_remarks | TEXT | nullable |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Notifications table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| title | VARCHAR | |
| message | TEXT | |
| type | VARCHAR | DELIVERY_DUE \| DELIVERY_OVERDUE \| ITEM_RECEIVED \| etc. |
| is_read | BOOLEAN | default false |
| related_id | VARCHAR | orderId or itemId |
| created_at | TIMESTAMP | |

### Audit_logs table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| entity_type | VARCHAR | order \| item \| user |
| entity_id | VARCHAR | |
| user_id | UUID | FK → users |
| action | String | CREATE \| UPDATE \| DELETE \| RECEIVE \| etc. |
| field_name | VARCHAR | nullable |
| old_value | VARCHAR | nullable |
| new_value | VARCHAR | nullable |
| timestamp | TIMESTAMP | |
| order_id | UUID | nullable |
| item_id | UUID | nullable |

### App_settings table

| Column | Type | Notes |
|--------|------|-------|
| key | VARCHAR | PK — e.g. `email.mailbox` |
| value | TEXT | current value |
| description | TEXT | human-readable hint shown in Settings UI |

**Default keys seeded on first use:**

| Key | Default | Description |
|-----|---------|-------------|
| `email.enabled` | `false` | Enable/disable email polling |
| `email.mailbox` | *(from app config)* | Mailbox address to monitor |
| `email.poll.interval.minutes` | `10` | How often to check inbox |
| `email.po.subjects` | `PO Order,Purchase Order,MBZUAI PO` | Subject keywords for PO emails |
| `email.dp.subjects` | `DP Order,Direct Payment,MBZUAI DP` | Subject keywords for DP emails |
| `email.amazon.subjects` | `Amazon Delivery,Amazon Order,Delivery Confirmation` | Subject keywords for Amazon emails |

---

## DB Migration Scripts

Run these manually against PostgreSQL when the listed columns don't exist (Hibernate `ddl-auto: update` only adds columns on fresh tables, not existing ones).

```sql
-- File: db/migrations.sql
-- Run with: psql -U postgres -p 5433 -d mbzuai_tracker -f db/migrations.sql

-- 2026-04-20: vendor tracking fields on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_platform    VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_order_id    VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_sync_data   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_last_synced TIMESTAMP;

-- 2026-04-20: order category (GOODS = physical delivery tracked, SERVICES = skip)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_category VARCHAR(20) NOT NULL DEFAULT 'GOODS';

-- 2026-04-20: runtime-configurable settings
CREATE TABLE IF NOT EXISTS app_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT,
    description TEXT
);
```

---

## Core Data Types (TypeScript — client/src/types/index.ts)

```typescript
export type Role = 'ADMIN' | 'VENDOR_MANAGEMENT' | 'PROCUREMENT' | 'STORE' | 'FINANCE' | 'IT' | 'ASSET';
export type OrderType = 'PO' | 'DP';
export type GoodType = 'GOODS' | 'SERVICES';

export type ItemStatus =
  | 'PENDING_DELIVERY'
  | 'PARTIALLY_DELIVERED'     // quantityReceived > 0 but < quantity
  | 'DELIVERED'
  | 'STORED'
  | 'PENDING_ASSET_TAGGING'
  | 'ASSET_TAGGED'
  | 'PENDING_IT_CONFIG'
  | 'IT_CONFIGURED'
  | 'HANDED_OVER'
  | 'DELAYED'
  | 'SERVICES_ONLY';           // goodType = SERVICES — excluded from lifecycle

export interface Order {
  id: string;
  type: OrderType;
  reference: string;
  vendor: string;
  supplier?: string;
  deliveryAddress?: string;
  endUser: string;
  department?: string;
  orderDate: string;
  totalValue?: number;
  currency: string;
  status: OrderStatus;
  notes?: string;
  orderCategory?: string;    // GOODS | SERVICES
  vendorPlatform?: string;   // e.g. AMAZON
  vendorOrderId?: string;    // e.g. 114-3751791-7314618 — links Amazon screenshots
  items: Item[];
}
```

---

## Role-Based Access Control (RBAC)

| Permission | Admin | Vendor Mgmt | Procurement | Store | Finance | IT | Asset |
|---|---|---|---|---|---|---|---|
| Create PO/DP | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit Order Details | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mark Item Received | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mark Item Stored | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mark Asset Tagged | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Mark IT Configured | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Mark Handover | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit/Clear Any Date | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export Reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Upload Excel Import | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Finance Remarks | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Admin Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Test Tools | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> **IT and ASSET roles** have stage-limited access: they only see their specific action button (Mark IT Configured / Mark Asset Tagged) in the tracker. Sidebar shows a contextual message about their access scope.

---

## Item Lifecycle State Machine

```
goodType = SERVICES → SERVICES_ONLY (excluded from all lifecycle tracking, shown as grey badge)

goodType = GOODS:

PENDING_DELIVERY
     ↓  (quantityReceived > 0 but < quantity)
PARTIALLY_DELIVERED   ← amber, shows "X of Y received"
     ↓  (quantityReceived >= quantity)
     ↓  OR direct from PENDING_DELIVERY (full quantity received at once)
DELIVERED
     ↓  (storedDate auto-set = receivedDate)
STORED
     ↓  (if requiresAssetTagging = true)
PENDING_ASSET_TAGGING
     ↓  (assetTaggingDate set)
ASSET_TAGGED
     ↓  (if requiresITConfig = true)
PENDING_IT_CONFIG
     ↓  (itConfigDate set)
IT_CONFIGURED
     ↓  (handoverDate set)
HANDED_OVER ✅

DELAYED: today > expectedDeliveryDate AND item not yet received (overrides PENDING_DELIVERY)
```

**Status auto-calculation rules (StatusCalculator.java):**
- Always calculated server-side — client-submitted status is never trusted
- `goodType = SERVICES` → immediately `SERVICES_ONLY`
- `quantityReceived > 0 && < quantity` → `PARTIALLY_DELIVERED`
- `quantityReceived >= quantity` → full delivery flow begins
- `storedDate` is auto-set equal to `receivedDate` when item is marked received
- Re-calculated on every item PUT/action endpoint
- Order status recalculated after every item status change
- `SERVICES_ONLY` items count as "complete" for order status purposes

**Date clearing rules (privileged roles: ADMIN, PROCUREMENT, VENDOR_MANAGEMENT):**
- Clearing `receivedDate` also clears `storedDate` and `quantityReceived`
- Clearing any date causes status to recalculate backward automatically

---

## Order Category (GOODS vs SERVICES)

Orders have an `orderCategory` field (GOODS | SERVICES, default GOODS):

- **GOODS** — physical items, tracked through the full delivery lifecycle
- **SERVICES** — software licenses, consulting, subscriptions — **skipped by email ingestion**

This prevents pure-services PDFs (Microsoft licensing, consulting contracts, etc.) from cluttering the physical delivery tracker.

**How it works:**
- `SamplePdfGenerator` writes `Order Category: GOODS|SERVICES` into the PDF header
- `PdfPoParser` reads `Order Category:` from the parsed text
- `EmailIngestionService.createOrderFromParsed()` checks: if `orderCategory = SERVICES` → increment `servicesSkipped`, return without creating
- `EmailImportResult` includes `servicesSkipped` count, shown in TestTools email result panel

**UI:** CreateOrder and EditOrderModal both have a GOODS / SERVICES toggle button pair.

---

## Email Ingestion (Microsoft Graph / Office 365)

Email ingestion polls an Office 365 mailbox via Microsoft Graph API for unread emails.

### Azure credentials (application.yml / environment — not in DB)
```yaml
app:
  email-ingestion:
    azure-tenant-id:     ${AZURE_TENANT_ID:}
    azure-client-id:     ${AZURE_CLIENT_ID:}
    azure-client-secret: ${AZURE_CLIENT_SECRET:}
```

### Runtime settings (DB — configurable from Settings UI without restart)

| Setting key | What it controls |
|---|---|
| `email.enabled` | Master on/off switch |
| `email.mailbox` | Which O365 mailbox to read |
| `email.poll.interval.minutes` | Check frequency (min 1 min) |
| `email.po.subjects` | CSV keywords for PO emails |
| `email.dp.subjects` | CSV keywords for DP emails |
| `email.amazon.subjects` | CSV keywords for Amazon emails |

### Processing flow per email
1. Subject checked against all configured keywords — non-matching emails are marked read and skipped
2. Body text scanned for Amazon order IDs and delivery dates
3. Attachments processed:
   - **PDF** → `PdfPoParser` → order auto-created (if `orderCategory = GOODS`)
   - **Excel** → `ImportService` (existing PO/DP import logic)
   - **Images** → `AmazonScreenshotService` (OCR for delivery dates)

### Amazon screenshot delivery date matching
`AmazonScreenshotService` parses OCR text into `ShipmentBlock` records:
- Each `ShipmentBlock` = one "Arriving by DATE" line + its item descriptions
- Each order item is matched to a block by substring/word-overlap of its description
- Matched item gets `expectedDeliveryDate` updated to that block's date
- Example: "Dell Latitude 5540 Laptop" in order matches "Dell Latitude 5540 Laptop 16GB 512GB" in OCR → gets May 20 date
- Field updated: `Item.expectedDeliveryDate`

### Dynamic poll interval
`DeliveryScheduler.pollEmail()` runs every 60s but checks `lastEmailPoll` against DB-configured interval. Changing the interval in Settings UI takes effect within 1 minute — no restart needed.

---

## Excel Import Column Mapping

The import template (`/api/import/template/po` and `/api/import/template/dp`) uses these columns:

| Col | Field | Notes |
|-----|-------|-------|
| A | PO/DP Reference | Groups rows into one order |
| B | Vendor | |
| C | Supplier | optional |
| D | End User | |
| E | Department | optional |
| F | Order Date | YYYY-MM-DD |
| G | Item Description | required per row |
| H | Line Number | from Oracle PO |
| I | Quantity | |
| J | Unit Price | commas in numbers handled |
| K | Total Price | commas in numbers handled |
| L | Good Type | GOODS or SERVICES |
| M | Expected Delivery Date | YYYY-MM-DD |
| N | Requisition Number | optional |
| O | Purchase Link | optional |
| P | Requires Asset Tagging | YES/NO |
| Q | Requires IT Config | YES/NO |
| R | Finance Remarks | optional |

Import response shape: `{ ordersCreated, itemsCreated, duplicatesSkipped, errors, errorMessages[] }`

---

## Notification & Email Triggers

### Email Events (JavaMailSender)

| Trigger | Recipients |
|---|---|
| Order Created (PO/DP) | VENDOR_MANAGEMENT + PROCUREMENT |
| Item Expected Delivery Date = Today | STORE + VENDOR_MANAGEMENT |
| Item Overdue (past expected date, not received) | VENDOR_MANAGEMENT + ADMIN |
| Item Marked Received | VENDOR_MANAGEMENT + PROCUREMENT + STORE |
| Asset Tagging Required | ASSET + PROCUREMENT |
| IT Config Required | IT + PROCUREMENT |
| Item Handed Over | VENDOR_MANAGEMENT + PROCUREMENT |

### In-App Notification Events
Same triggers — stored in `notifications` table, surfaced via NotificationBell in navbar. Bell shows unread count badge. Response shape: `{ notifications: [], unreadCount: N }`.

### Scheduled Jobs (`@Scheduled` — Asia/Dubai timezone)
- **Daily at 07:00 AM**: `findDueToday(today)` → send delivery-due notifications
- **Daily at 08:00 AM**: `findOverdue(today)` → mark status `DELAYED` + send overdue notifications
- **Every 60s**: `pollEmail()` → checks DB-configured interval before actually polling inbox

---

## API Routes

### Auth
```
POST   /api/auth/login              — returns { token, user }; also sets httpOnly cookie
POST   /api/auth/logout             — clears cookie
GET    /api/auth/me                 — returns current user from JWT
POST   /api/auth/change-password
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Orders
```
GET    /api/orders              — returns { data: OrderDto[], meta: { total, page, size, totalPages } }
                                  query params: type, status, vendor, search, dateFrom, dateTo, page, size
POST   /api/orders              — create PO or DP; body includes orderCategory (GOODS|SERVICES)
GET    /api/orders/:id          — returns OrderDto with items[]
PUT    /api/orders/:id          — update order header (incl. orderCategory, vendorOrderId, vendorPlatform)
DELETE /api/orders/:id          — soft delete (Admin only)
```

### Items
```
GET    /api/items/:id               — get single item
PUT    /api/items/:id               — update item fields (date fields, flags, remarks)
PUT    /api/items/:id/receive       — mark received; body: { quantityReceived? } (omit = full qty)
PUT    /api/items/:id/asset-tag     — mark asset tagged
PUT    /api/items/:id/it-config     — mark IT configured
PUT    /api/items/:id/handover      — mark handed over
PUT    /api/items/:id/clear-date    — clear a date field; body: { fieldName }
```

### Import
```
GET    /api/import/template/po      — download PO Excel template
GET    /api/import/template/dp      — download DP Excel template
POST   /api/import/po               — upload & import PO Excel file (multipart: file)
POST   /api/import/dp               — upload & import DP Excel file (multipart: file)
```

### Users
```
GET    /api/users                   — list users (Admin only)
POST   /api/users                   — create user (Admin only)
PUT    /api/users/:id               — update user (Admin only)
PUT    /api/users/:id/deactivate    — deactivate user
PUT    /api/users/:id/reset-password — returns { tempPassword }
```

### Reports
```
GET    /api/reports/summary         — dashboard KPIs + upcoming deliveries + overdue details
GET    /api/reports/export/excel    — download tracker report as .xlsx
```

### Notifications
```
GET    /api/notifications           — returns { notifications: [], unreadCount: N }
PUT    /api/notifications/:id/read  — mark one as read
PUT    /api/notifications/read-all  — mark all as read
```

### Audit
```
GET    /api/audit                   — returns { data: AuditLogDto[], total: N }
                                      query params: userId, entityType, entityId, page, size
                                      (Admin + VENDOR_MANAGEMENT only)
```

### Settings (Admin only)
```
GET    /api/settings                — returns Map<key, { value, description }>
PUT    /api/settings                — body: Map<key, value>; updates multiple keys at once
```

### Admin / Test Tools (Admin only)
```
GET    /api/admin/samples/po-pdf/{n}        — download sample PO PDF (n=1,2,3)
GET    /api/admin/samples/dp-pdf/{n}        — download sample DP PDF (n=1,2,3)
POST   /api/admin/samples/amazon-image      — generate Amazon screenshot PNG
                                              body: { orderId, shipments: [{deliveryDate, items:[{description,quantity}]}] }
POST   /api/admin/samples/check-email       — manually trigger email ingestion
                                              returns EmailImportResult
```

---

## EmailImportResult shape

```json
{
  "emailsProcessed": 2,
  "ordersCreated": 1,
  "itemsCreated": 5,
  "duplicatesSkipped": 0,
  "servicesSkipped": 1,
  "amazonUpdates": 1,
  "errors": 0,
  "errorMessages": [],
  "amazonUpdateDetails": ["Amazon order 114-3751791-7314618 → delivery 2026-05-20 — updated 1 item(s)"]
}
```

`servicesSkipped` — count of PDFs whose `Order Category = SERVICES` — not created.

---

## API Response Format Notes

- `GET /api/orders` returns `{ data: [], meta: { total, page, size, totalPages } }` — frontend uses `res.data.data`
- `GET /api/audit` returns `{ data: AuditLogDto[], total: N }` — frontend uses `res.data.data`
- `GET /api/notifications` returns `{ notifications: [], unreadCount: N }` — frontend uses `res.data.notifications`
- All boolean fields use `@JsonProperty` to preserve `is` prefix: `isActive`, `isRead`, `isDeleted`, `requiresAssetTagging`, `requiresITConfig`
- All date fields are serialized as `LocalDate` → `"YYYY-MM-DD"` strings
- Entity back-references use `@JsonIgnore` to prevent circular serialization

---

## Frontend Pages & Key Behaviors

### 1. Login Page (`/login`)
- Email + password form
- JWT stored in localStorage + sent via `Authorization: Bearer` header
- Redirect to Dashboard on success

### 2. Dashboard (`/dashboard`)
**KPI Cards:** Total Orders | Pending Delivery | Overdue Items (red) | Partially Delivered | Pending Asset Tagging | Pending IT Config | Handed Over

**Charts:** Orders by Status (bar) | PO vs DP split (donut) | Upcoming deliveries next 7 days

**Delay Alerts Panel:** List of overdue items with link to order

### 3. Tracker Page (`/tracker`)
**Filter Bar:** Search | Purchase Type | Status (multi-select) | Vendor | Date range

**Import bar (top right):** Import PO | Import DP | ↓ PO Template | ↓ DP Template | Check Email (manual trigger)

**Columns:** Expand | Reference | Type | Order Date | Vendor / End User | Items | Expected | Status | Delete (Admin only)

**Color coding:**
- Green = HANDED_OVER / COMPLETED
- Amber = Any mid-stage (PARTIALLY_DELIVERED, STORED, PENDING_ASSET_TAGGING, etc.)
- Red = DELAYED
- Grey = PENDING_DELIVERY or SERVICES_ONLY

**Expandable rows:** Item-level lifecycle grid. SERVICES items show grey badge only — no timeline. Privileged roles see date cells with inline edit + clear (×) button. IT/ASSET roles see only their specific action button.

**PO bulk receive:** When a PO row is expanded, a blue bar appears at the top showing "X items pending delivery" with a **Mark All Received** button — marks all GOODS items as received in one click. Per-item Mark Received buttons are hidden for PO orders (use the bulk button instead). DP orders retain per-item Mark Received buttons.

**Admin delete:** A trash icon appears at the end of each row for ADMIN users. Clicking it hard-deletes the order (and all its items + audit logs) after a confirmation prompt. This is a permanent delete — use for test data cleanup.

### 4. Order Detail Page (`/orders/:id`)
- Full order header + items table with lifecycle columns
- Audit trail section
- Action buttons per RBAC

### 5. Create Order (`/orders/new`)
- Toggle: PO / DP
- **Order Category toggle: GOODS / SERVICES** — SERVICES orders are not tracked for delivery
- Amazon Order ID + Vendor Platform fields (for screenshot matching)
- **PO orders:** Single "Expected Delivery Date" field in the Order Details header — applied to all items on submit. No per-item delivery date.
- **DP orders:** Per-item "Expected Delivery" field — each line item can have a different date.
- Each line item: Category, Description, Qty, Unit Price, Purchase Link, Asset Tagging toggle, IT Config toggle

### 6. Reports Page (`/reports`)
- Export Excel (filtered tracker report)

### 7. User Management (`/admin/users`) — Admin only
- All 7 roles: ADMIN, VENDOR_MANAGEMENT, PROCUREMENT, STORE, FINANCE, IT, ASSET

### 8. Audit Log (`/admin/audit`)
- Table: Timestamp | User | Entity | Field | Old Value | New Value | Action

### 9. Test Tools (`/admin/test-tools`) — Admin only
- **Sample PDFs:** Download PO/DP variants 1–3. DP-2 is a SERVICES order (email ingestion skips it — shown in purple)
- **Amazon Screenshot Generator:** Multi-shipment editor — each shipment has its own delivery date and item list. Download PNG to send as email attachment
- **Create Test Order:** Quick form to create a GOODS order with Amazon Order ID for end-to-end screenshot testing
- **Check Mailbox:** Manual email ingestion trigger; shows per-run stats including `servicesSkipped`

### 10. Settings (`/admin/settings`) — Admin only
- Enable/disable email polling toggle
- Mailbox address
- Poll interval (quick buttons: 5/10/15/30/60 min)
- Subject keywords per type (PO / DP / Amazon) with live tag preview
- Changes take effect immediately — no backend restart needed

---

## Sample PDF Variants

| File | Category | Vendor | Items | Notes |
|------|----------|--------|-------|-------|
| PO-1 | GOODS | Amazon | 4 goods + 2 services | MacBook Pro, Keyboard, Mouse, USB-C Hub + AppleCare |
| PO-2 | GOODS | Dell Technologies | 5 goods + 2 services | Server, Storage, Switch, UPS, Cables + Support |
| PO-3 | GOODS | B&H Photo | 5 goods + 1 services | Cinema Camera, Lenses, Tripod, Cards + Training |
| DP-1 | GOODS | Amazon | 5 goods + 1 services | Laptop, Mouse, Monitor, Keyboard, Webcam + Support · Amazon Order ID `114-3751791-7314618` · 3 shipment dates |
| DP-2 | **SERVICES** | Microsoft | 6 services | M365, Azure, GitHub, DevOps · **Email ingestion SKIPS this order** |
| DP-3 | GOODS | Cisco Systems | 3 goods + 4 services | Switches, Firewall, WiFi APs + SmartNet contracts |

---

## Environment / Application Config

### application.yml (server-java/src/main/resources/application.yml)

```yaml
server:
  port: 3001

spring:
  datasource:
    url: jdbc:postgresql://localhost:5433/mbzuai_tracker   # port 5433 on this machine
    username: postgres
    password: postgres
  jpa:
    hibernate:
      ddl-auto: update
  thymeleaf:
    check-template-location: false

app:
  jwt:
    secret: mbzuai-tracker-secret-key-minimum-256-bits-long-for-hs256
    expiration-ms: 28800000   # 8 hours
  email-ingestion:
    azure-tenant-id:     ${AZURE_TENANT_ID:}
    azure-client-id:     ${AZURE_CLIENT_ID:}
    azure-client-secret: ${AZURE_CLIENT_SECRET:}
    # mailbox is now configurable at runtime via Settings UI (app_settings table)
    # these @Value defaults are used only if the DB setting is blank
    mailbox: ${EMAIL_MAILBOX:}
    enabled: ${EMAIL_ENABLED:false}
    poll-interval-minutes: ${EMAIL_POLL_MINUTES:10}
```

### JVM startup flags (used in start-java-backend.bat)

```
-Dspring.datasource.url=jdbc:postgresql://localhost:5433/mbzuai_tracker
-Dspring.datasource.username=postgres
-Dspring.datasource.password=postgres
-Dspring.thymeleaf.check-template-location=false
-Dspring.jpa.open-in-view=false
```

---

## Seed Data

Auto-seeded on first startup by `DataSeeder.java` (skips if users already exist).

**Users:**
| Email | Password | Role |
|-------|----------|------|
| admin@mbzuai.ac.ae | Admin123! | ADMIN |
| vendor.mgmt@mbzuai.ac.ae | Pass123! | VENDOR_MANAGEMENT |
| procurement@mbzuai.ac.ae | Pass123! | PROCUREMENT |
| store@mbzuai.ac.ae | Pass123! | STORE |
| finance@mbzuai.ac.ae | Pass123! | FINANCE |
| it@mbzuai.ac.ae | Pass123! | IT |
| asset@mbzuai.ac.ae | Pass123! | ASSET |

**Sample Orders:**
- PO-2242 — Prof. Chaoyang — Amazon — 2 items
- DP-2225 — Prof. Chaoyang — Amazon — 5 items (overdue)
- PO-2204 — Jason Xue — Boston Dynamics — Robot Dog (requires Asset + IT)
- PO-2116 — Dr. Salman Khan — Apple — Mac Studio (asset tagged, pending IT)
- DP-2195 — Vaishnav Kamesvaran — B&H Photo — Camera gear, 5 items

---

## How to Run

### Backend (Spring Boot)
```bash
# Option 1: double-click
start-java-backend.bat

# Option 2: manual
cd server-java
java \
  -Dspring.datasource.url=jdbc:postgresql://localhost:5433/mbzuai_tracker \
  -Dspring.datasource.username=postgres \
  -Dspring.datasource.password=postgres \
  -Dspring.thymeleaf.check-template-location=false \
  -Dspring.jpa.open-in-view=false \
  -jar target/tracker-1.0.0.jar
```

### Rebuild after code changes
```bash
cd server-java
# Windows — close MBZUAI-Backend window first (JAR is locked while running)
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot
set PATH=%JAVA_HOME%\bin;C:\Users\%USERNAME%\maven\apache-maven-3.9.6\bin;%PATH%
mvn package -DskipTests
```

### Frontend
```bash
cd client
npm run dev    # runs on http://localhost:5173, proxies /api → localhost:3001
```

### PostgreSQL
- Service name: `postgresql-x64-18`
- Port: **5433** (non-default)
- Database: `mbzuai_tracker`
- Start: `net start postgresql-x64-18` or Services panel

### Apply DB migrations (after adding new columns)
```bash
PGPASSWORD=postgres psql -U postgres -p 5433 -d mbzuai_tracker -f db/migrations.sql
```

---

## Key Implementation Notes

1. **Status always calculated server-side** — `StatusCalculator.java` is called on every item PUT/action. Never trust client-submitted status.

2. **Stored Date = Received Date** — auto-populated when `receivedDate` is set. Clearing `receivedDate` also clears `storedDate` and `quantityReceived`.

3. **SERVICES items** — `goodType = SERVICES` immediately sets status to `SERVICES_ONLY`. These items are excluded from lifecycle tracking, overdue checks, and KPI counts (counted as "complete" for order status).

4. **SERVICES orders** — `orderCategory = SERVICES` means the entire order is a services contract (no physical delivery). Email ingestion skips these — they are not created in the tracker.

5. **Partial delivery** — `PUT /api/items/:id/receive` accepts optional `quantityReceived`. If less than total `quantity`, status becomes `PARTIALLY_DELIVERED`. Subsequent receive calls accumulate.

6. **PO vs DP delivery dates** — PO orders have a single `expectedDeliveryDate` set at the order level and applied to all items on creation. DP line items each carry their own `expectedDeliveryDate` — critical for the multi-date/multi-shipment problem.

7. **Amazon screenshot → per-item delivery date** — `AmazonScreenshotService` parses OCR text into shipment blocks. Each block contains "Arriving by DATE" + item descriptions. Order items are matched by substring/word-overlap. The matched item's `expectedDeliveryDate` is updated. The `vendorOrderId` on the order must match the Amazon Order ID in the screenshot/email.

8. **Amazon Order ID in PDF** — `SamplePdfGenerator` writes `Amazon Order ID:` in the PDF header. `PdfPoParser` reads it and sets `vendorOrderId` + `vendorPlatform = AMAZON` on the parsed order.

9. **Runtime settings without restart** — `SettingsService` reads from `app_settings` table on every call. `DeliveryScheduler` checks DB-configured poll interval each minute tick. Changing settings in the UI takes effect within 60 seconds.

10. **Subject keyword filtering** — `EmailIngestionService.isRelevantSubject()` reads all configured keywords at call time from `SettingsService`. Emails not matching any keyword are marked read and skipped without processing.

11. **Audit every field change** — `AuditService.log()` is called in every service method that modifies data.

12. **Notifications are dual-channel** — every event writes to DB (in-app) AND sends email via `NotificationService`. Recipients are determined by role, not individual user.

13. **Excel import** — rows in the same file grouped by Column A (PO/DP reference). Duplicate references are skipped (counted in `duplicatesSkipped`). Numbers with commas (e.g. `"4,800.00"`) are handled.

14. **JSON boolean serialization** — all `is`-prefixed boolean fields use `@JsonProperty` to preserve the prefix in JSON output (Jackson strips `is` by default). Affected fields: `isActive`, `isRead`, `isDeleted`, `requiresAssetTagging`, `requiresITConfig`.

15. **Lazy loading** — `spring.jpa.open-in-view=false` is set. All service methods that map entities to DTOs use `@Transactional(readOnly = true)`.

16. **RBAC is enforced in service layer** — `ItemService` checks `userRole` before each action. `UserController`, `AuditController`, `ReportController`, `SettingsController` check role directly.

17. **Hibernate ddl-auto: update limitation** — Hibernate adds columns to new tables but will NOT add columns to existing tables in some cases. Always run `db/migrations.sql` after adding new entity fields to an existing table.

18. **Order hard delete** — `DELETE /api/orders/:id` (Admin only) is a hard delete. `OrderService.deleteOrder` explicitly calls `auditLogRepository.deleteByOrderId()` before `orderRepository.delete()` to satisfy the FK constraint on `audit_logs`. Items are cascade-deleted via `CascadeType.ALL` on the `Order.items` collection.

19. **Email ingestion duplicate check** — `EmailIngestionService.createOrderFromParsed()` uses `orderRepository.existsByReference()` which checks ALL orders regardless of deletion status. This prevents the unique constraint violation when a previously-deleted order's reference is re-sent via email.

20. **Processed emails deduplication** — `processed_emails` table records every Graph message ID after first processing. Even if `Mail.ReadWrite` is missing (email can't be marked read), re-polling won't reprocess the same email. To re-trigger a specific email, delete its row from `processed_emails`.

---

## POC Success Checklist

- [x] Can create a DP with 5+ line items each having different delivery dates
- [x] Dashboard shows correct counts per status
- [x] Overdue items highlighted in red automatically
- [x] Store team can mark item received (full or partial qty) → triggers email to Asset/IT/Procurement
- [x] Asset team marks tagged → status updates
- [x] IT team marks configured → status updates
- [x] Admin/Procurement/Vendor Mgmt can edit or clear any lifecycle date → status recalculates
- [x] SERVICES items excluded from lifecycle tracking
- [x] SERVICES orders skipped during email ingestion (orderCategory = SERVICES)
- [x] PARTIALLY_DELIVERED status shown when partial qty received
- [x] Admin can create/deactivate users and assign roles (7 roles including FINANCE)
- [x] Tracker report exports to Excel
- [x] Audit trail records all field changes with user + timestamp
- [x] In-app notification bell shows unread count
- [x] Daily cron sends overdue alerts (07:00 + 08:00 Asia/Dubai)
- [x] Excel import (PO + DP) with downloadable templates
- [x] Email ingestion via Microsoft Graph API (O365 mailbox)
- [x] Subject keyword filtering — only relevant emails processed
- [x] Email settings configurable from UI without restart (mailbox, interval, keywords)
- [x] Amazon screenshot OCR → per-item delivery date update by description matching
- [x] Amazon Order ID on order (set at creation or via Edit Order modal)
- [x] Sample PDFs with Order Category field (GOODS/SERVICES)
- [x] Test Tools page: PDF download, Amazon screenshot generator, create test order, check email
- [x] PO single delivery date at order level; DP per-item delivery dates
- [x] PO bulk "Mark All Received" button in tracker expandable row
- [x] Order Date column visible in tracker list
- [x] Admin hard-delete orders from tracker list (removes order + items + audit logs)
- [x] Email ingestion deduplication via processed_emails table (works without Mail.ReadWrite)
- [ ] PDF export (PDFBox dependency included, endpoint stubbed)
