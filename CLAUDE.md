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
│   │   │   │   └── AuditLog.java
│   │   │   ├── repository/
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── OrderRepository.java
│   │   │   │   ├── ItemRepository.java
│   │   │   │   ├── NotificationRepository.java
│   │   │   │   └── AuditLogRepository.java
│   │   │   ├── service/
│   │   │   │   ├── AuthService.java
│   │   │   │   ├── OrderService.java
│   │   │   │   ├── ItemService.java
│   │   │   │   ├── UserService.java
│   │   │   │   ├── NotificationService.java
│   │   │   │   ├── AuditService.java
│   │   │   │   ├── ImportService.java
│   │   │   │   └── StatusCalculator.java
│   │   │   ├── controller/
│   │   │   │   ├── AuthController.java
│   │   │   │   ├── OrderController.java
│   │   │   │   ├── ItemController.java
│   │   │   │   ├── UserController.java
│   │   │   │   ├── NotificationController.java
│   │   │   │   ├── AuditController.java
│   │   │   │   ├── ReportController.java
│   │   │   │   └── ImportController.java
│   │   │   ├── dto/
│   │   │   │   ├── LoginRequest.java / LoginResponse.java
│   │   │   │   ├── UserDto.java / UserRequest.java
│   │   │   │   ├── OrderDto.java / OrderRequest.java
│   │   │   │   ├── ItemDto.java / ItemRequest.java
│   │   │   │   ├── AuditLogDto.java
│   │   │   │   └── ChangePasswordRequest.java
│   │   │   └── scheduler/
│   │   │       └── DeliveryScheduler.java
│   │   └── resources/
│   │       └── application.yml
│   └── target/
│       └── tracker-1.0.0.jar       ← built JAR
├── server/                         ← OLD Node.js backend (do not use)
├── client/                         ← Frontend (unchanged)
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
│   │   │   └── AuditLog.tsx
│   │   └── components/
│   │       ├── layout/ (Sidebar, Navbar, NotificationBell)
│   │       ├── tracker/ (OrderTable, ItemLifecycleRow, StatusBadge, FilterBar)
│   │       ├── dashboard/ (KPICard, StatusChart, DelayAlert)
│   │       ├── forms/ (POForm, DPForm, LineItemForm)
│   │       └── shared/ (DatePicker, ExportButton, ConfirmDialog)
│   └── vite.config.ts              ← proxies /api → localhost:3001
└── prisma/                         ← OLD Prisma schema (reference only)
```

---

## Database Schema (JPA / PostgreSQL)

Tables are auto-created by Hibernate (`ddl-auto: update`).

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
| notes | TEXT | nullable |
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
| expected_delivery_date | DATE | nullable |
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  isActive: boolean;
}

export interface Item {
  id: string;
  orderId: string;
  itemCategory?: string;
  description: string;
  quantity: number;
  quantityReceived?: number;   // partial delivery tracking
  unitPrice?: number;
  totalPrice?: number;
  purchaseLink?: string;
  lineNumber?: string;         // from Oracle PO import
  goodType: GoodType;          // GOODS | SERVICES
  requisitionNumber?: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  storedDate?: string;
  assetTaggingDate?: string;
  itConfigDate?: string;
  handoverDate?: string;
  customClearanceDate?: string;
  requiresAssetTagging: boolean;
  requiresITConfig: boolean;
  status: ItemStatus;
  financeRemarks?: string;
  finalRemarks?: string;
}

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
  status: string;
  notes?: string;
  items: Item[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
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
POST   /api/orders              — create PO or DP
GET    /api/orders/:id          — returns OrderDto with items[]
PUT    /api/orders/:id          — update order header
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
- Also set as httpOnly cookie for server-side use
- Redirect to Dashboard on success

### 2. Dashboard (`/dashboard`)
**KPI Cards:** Total Orders | Pending Delivery | Overdue Items (red) | Partially Delivered | Pending Asset Tagging | Pending IT Config | Handed Over

**Charts:** Orders by Status (bar) | PO vs DP split (donut) | Upcoming deliveries next 7 days

**Delay Alerts Panel:** List of overdue items with link to order

### 3. Tracker Page (`/tracker`)
**Filter Bar:** Search | Purchase Type | Status (multi-select) | Vendor | Date range

**Import bar (top right):** Import PO | Import DP | ↓ PO Template | ↓ DP Template | Check Email (manual IMAP trigger)

**Color coding:**
- Green = HANDED_OVER / COMPLETED
- Amber = Any mid-stage (PARTIALLY_DELIVERED, STORED, PENDING_ASSET_TAGGING, etc.)
- Red = DELAYED
- Grey = PENDING_DELIVERY or SERVICES_ONLY

**Expandable rows:** Item-level lifecycle grid. SERVICES items show grey badge only — no timeline. Privileged roles (ADMIN, PROCUREMENT, VENDOR_MANAGEMENT) see date cells with inline edit + clear (×) button. IT/ASSET roles see only their specific action button.

### 4. Order Detail Page (`/orders/:id`)
- Full order header + items table with lifecycle columns
- Audit trail section (loads `/api/audit?entityId=:id`)
- Action buttons per RBAC

### 5. Create Order (`/orders/new`)
- Toggle: PO / DP
- Each line item has: Category, Description, Qty, Unit Price, Purchase Link, Expected Delivery Date, Good Type (GOODS/SERVICES), Asset Tagging toggle, IT Config toggle

### 6. Reports Page (`/reports`)
- Export Excel (filtered tracker report)

### 7. User Management (`/admin/users`) — Admin only
- All 7 roles: ADMIN, VENDOR_MANAGEMENT, PROCUREMENT, STORE, FINANCE, IT, ASSET

### 8. Audit Log (`/admin/audit`)
- Table: Timestamp | User | Entity | Field | Old Value | New Value | Action

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
# Windows:
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

---

## Key Implementation Notes

1. **Status always calculated server-side** — `StatusCalculator.java` is called on every item PUT/action. Never trust client-submitted status.

2. **Stored Date = Received Date** — auto-populated when `receivedDate` is set. Clearing `receivedDate` also clears `storedDate` and `quantityReceived`.

3. **SERVICES items** — `goodType = SERVICES` immediately sets status to `SERVICES_ONLY`. These items are excluded from lifecycle tracking, overdue checks, and KPI counts (counted as "complete" for order status).

4. **Partial delivery** — `PUT /api/items/:id/receive` accepts optional `quantityReceived`. If less than total `quantity`, status becomes `PARTIALLY_DELIVERED`. Subsequent receive calls accumulate.

5. **DP line items** each carry their own `expectedDeliveryDate` — critical for the multi-date problem.

6. **Audit every field change** — `AuditService.log()` is called in every service method that modifies data.

7. **Notifications are dual-channel** — every event writes to DB (in-app) AND sends email via `NotificationService`. Recipients are determined by role, not individual user.

8. **Excel import** — rows in the same file grouped by Column A (PO/DP reference). Duplicate references are skipped (counted in `duplicatesSkipped`). Numbers with commas (e.g. `"4,800.00"`) are handled.

9. **JSON boolean serialization** — all `is`-prefixed boolean fields use `@JsonProperty` to preserve the prefix in JSON output (Jackson strips `is` by default). Affected fields: `isActive`, `isRead`, `isDeleted`, `requiresAssetTagging`, `requiresITConfig`.

10. **Lazy loading** — `spring.jpa.open-in-view=false` is set. All service methods that map entities to DTOs use `@Transactional(readOnly = true)`. Controllers that query and serialize directly also use `@Transactional(readOnly = true)`.

11. **RBAC is enforced in service layer** — `ItemService` checks `userRole` before each action. `UserController`, `AuditController`, `ReportController` check role directly. No separate middleware — each method guards itself.

12. **Color coding** in UI uses Tailwind: `bg-green-100 text-green-800` (done), `bg-yellow-100 text-yellow-800` (in-progress), `bg-red-100 text-red-800` (delayed), `bg-gray-100 text-gray-600` (pending/services).

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
- [x] PARTIALLY_DELIVERED status shown when partial qty received
- [x] Admin can create/deactivate users and assign roles (7 roles including FINANCE)
- [x] Tracker report exports to Excel
- [x] Audit trail records all field changes with user + timestamp
- [x] In-app notification bell shows unread count
- [x] Daily cron sends overdue alerts (07:00 + 08:00 Asia/Dubai)
- [x] Excel import (PO + DP) with downloadable templates
- [ ] PDF export (PDFBox dependency included, endpoint stubbed)
- [ ] Oracle email IMAP ingestion (service scaffolded, requires IMAP credentials)
