# 🏗️ Fees Management System - Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FEES MANAGEMENT SYSTEM                       │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  ADMIN PORTAL    │  │ ACCOUNTS PORTAL  │  │ STUDENT PORTAL   │
│  /admin/fees/    │  │ /accounts-       │  │ /student/fees    │
│                  │  │  personnel/      │  │                  │
│  • Structure     │  │ • Dashboard      │  │ • View Fees      │
│  • Payments      │  │ • Update Payment │  │ • History        │
│  • Reports       │  │ • Fee Structure  │  │ • Balance        │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   MIDDLEWARE        │
                    │   Authentication    │
                    │   Authorization     │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
┌────────▼─────────┐  ┌────────▼─────────┐  ┌──────▼──────────┐
│  ADMIN API       │  │ ACCOUNTS API     │  │  STUDENT API    │
│  /api/admin/     │  │ /api/accounts-   │  │  /api/student/  │
│  fees/           │  │  personnel/      │  │  fees/          │
│                  │  │                  │  │                 │
│  • GET/POST/PUT  │  │ • Login/Logout   │  │ • GET Fees      │
│  • Structure     │  │ • Stats          │  │ • GET History   │
│  • Payments      │  │ • Student Fees   │  │                 │
│  • DELETE        │  │ • Record Payment │  │                 │
└────────┬─────────┘  └────────┬─────────┘  └──────┬──────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   AUTHENTICATION    │
                    │   LIBRARIES         │
                    │                     │
                    │ • admin-auth.ts     │
                    │ • accounts-         │
                    │   personnel-auth.ts │
                    │ • student-auth.ts   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   DATABASE          │
                    │   PostgreSQL/Neon   │
                    │                     │
                    │ Tables:             │
                    │ • fee_structure     │
                    │ • fee_payments      │
                    │ • students          │
                    │ • courses           │
                    │ • administrative_   │
                    │   personnel         │
                    └─────────────────────┘
```

---

## Database Schema

```sql
┌────────────────────────────────────────────┐
│           fee_structure                    │
├────────────────────────────────────────────┤
│ id              SERIAL PRIMARY KEY         │
│ course_id       INTEGER → courses(id)      │
│ semester        INTEGER                    │
│ semester_fee    DECIMAL(10,2)              │
│ exam_fee        DECIMAL(10,2)              │
│ created_at      TIMESTAMP                  │
│ updated_at      TIMESTAMP                  │
│ UNIQUE(course_id, semester)                │
└────────────────────────────────────────────┘
                  │
                  │ Referenced by
                  ▼
┌────────────────────────────────────────────┐
│           fee_payments                     │
├────────────────────────────────────────────┤
│ id                    SERIAL PRIMARY KEY   │
│ student_id            INTEGER → students   │
│ semester              INTEGER              │
│ fee_type              VARCHAR(20)          │
│ amount_paid           DECIMAL(10,2)        │
│ payment_date          DATE                 │
│ transaction_id        VARCHAR(100) UNIQUE  │
│ accounts_personnel_id INTEGER              │
│ notes                 TEXT                 │
│ created_at            TIMESTAMP            │
└────────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. LOGIN REQUEST
   User enters credentials
   ↓
2. VALIDATE CREDENTIALS
   Check username/password in database
   ↓
3. GENERATE JWT TOKEN
   Create token with user info + 7-day expiry
   ↓
4. SET HTTP-ONLY COOKIE
   Store token in secure cookie
   ↓
5. REDIRECT TO DASHBOARD
   User authenticated and redirected
   ↓
6. SUBSEQUENT REQUESTS
   Middleware validates token from cookie
   ↓
7. TOKEN VALID?
   YES → Allow access
   NO  → Redirect to login
```

---

## Payment Recording Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  PAYMENT RECORDING FLOW                      │
└─────────────────────────────────────────────────────────────┘

1. SEARCH STUDENT
   Accounts personnel searches by ID/name
   ↓
2. DISPLAY STUDENT INFO
   Show: Course, Current Semester, Fee Structure
   ↓
3. DISPLAY PAYMENT HISTORY
   Show: Previous payments, balances
   ↓
4. SELECT PAYMENT DETAILS
   - Choose semester
   - Select fee type (Semester/Exam/Both)
   - Enter amount
   - Enter transaction ID
   - Add notes (optional)
   ↓
5. VALIDATE INPUT
   - Check amount > 0
   - Verify transaction ID unique
   - Validate fee structure exists
   ↓
6. RECORD PAYMENT
   Insert into fee_payments table
   Link to accounts_personnel_id
   ↓
7. UPDATE DISPLAY
   Refresh payment history
   Show updated balance
   Display success message
```

---

## Data Flow

```
┌────────────┐
│   ADMIN    │
│            │
│ Creates    │──┐
│ Fee        │  │
│ Structure  │  │
└────────────┘  │
                │
                ▼
         ┌──────────────┐
         │fee_structure │
         │   Table      │
         └──────┬───────┘
                │
                │ Referenced by
                │
         ┌──────▼───────────────────────┐
         │                              │
┌────────▼─────────┐         ┌──────────▼───────┐
│ ACCOUNTS         │         │    STUDENT       │
│ PERSONNEL        │         │                  │
│                  │         │  Views:          │
│ Records Payment  │         │  • Fee Structure │
│ → fee_payments   │         │  • Payment       │
│   table          │         │    History       │
└──────────────────┘         │  • Balance       │
                              └──────────────────┘
```

---

## Component Hierarchy

```
HomePage (/page.tsx)
│
├─ Admin Link → Admin Dashboard
│  └─ Fees Management
│     ├─ Fee Structure (/admin/fees/structure)
│     │  ├─ FeeStructureTable
│     │  ├─ AddFeeDialog
│     │  └─ EditFeeDialog
│     │
│     └─ Payments (/admin/fees/payments)
│        ├─ PaymentFilters
│        ├─ PaymentTable
│        └─ PaymentStats
│
├─ Accounts Link → Accounts Portal
│  ├─ Login (/accounts-personnel/login)
│  │
│  ├─ Dashboard (/accounts-personnel/dashboard)
│  │  ├─ StatsCards
│  │  └─ QuickActions
│  │
│  ├─ Update Payment (/accounts-personnel/update-payment)
│  │  ├─ StudentSearch
│  │  ├─ StudentInfo
│  │  ├─ PaymentHistory
│  │  └─ PaymentForm
│  │
│  └─ Fee Structure (/accounts-personnel/fee-structure)
│     └─ FeeStructureTable (read-only)
│
└─ Student Link → Student Portal
   └─ My Fees (/student/fees)
      ├─ FeeStructureCard
      ├─ PaymentHistoryTable
      ├─ BalanceSummary
      └─ TotalSummaryCard
```

---

## API Endpoints Summary

```
┌─────────────────────────────────────────────────────────────┐
│                      API ENDPOINTS                           │
└─────────────────────────────────────────────────────────────┘

ADMIN ENDPOINTS:
  GET    /api/admin/fees/structure       - List all structures
  POST   /api/admin/fees/structure       - Create structure
  PUT    /api/admin/fees/structure       - Update structure
  DELETE /api/admin/fees/structure       - Delete structure
  
  GET    /api/admin/fees/payments        - List payments (filtered)
  POST   /api/admin/fees/payments        - Record payment
  PUT    /api/admin/fees/payments        - Update payment
  DELETE /api/admin/fees/payments        - Delete payment

ACCOUNTS PERSONNEL ENDPOINTS:
  POST   /api/accounts-personnel/login          - Login
  POST   /api/accounts-personnel/logout         - Logout
  GET    /api/accounts-personnel/stats          - Dashboard stats
  GET    /api/accounts-personnel/student-fees   - Get student fees
  POST   /api/accounts-personnel/record-payment - Record payment

STUDENT ENDPOINTS:
  GET    /api/student/fees                      - Get own fees
```

---

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                         │
└─────────────────────────────────────────────────────────────┘

Layer 1: MIDDLEWARE (/middleware.ts)
  • Checks cookie presence
  • Validates JWT token
  • Redirects unauthorized users

Layer 2: AUTH LIBRARIES
  • verifyAdminAuth()
  • verifyAccountsPersonnelAuth()
  • verifyStudentAuth()
  • Decode and validate JWT

Layer 3: API ROUTE VALIDATION
  • Check authentication result
  • Verify user permissions
  • Return 401/403 for unauthorized

Layer 4: DATABASE CONSTRAINTS
  • Foreign key relationships
  • Unique constraints
  • Check constraints
  • Row-level validation
```

---

## Deployment Checklist

- [x] Database migrations executed
- [x] Default accounts user created
- [x] JWT_SECRET environment variable set
- [x] Database connection configured
- [x] All API routes tested
- [x] Middleware configured correctly
- [x] Frontend pages functional
- [x] Authentication flows working
- [x] Payment recording operational
- [x] Student fee viewing works

---

## Tech Stack

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Lucide React icons

**Backend:**
- Next.js API Routes
- PostgreSQL / Neon Database
- JWT Authentication (jose library)
- bcrypt for password hashing

**Deployment:**
- Vercel (recommended)
- Any Node.js hosting platform

---

## Performance Considerations

1. **Database Indexing**:
   - Indexes on student_id, payment_date, transaction_id
   - Unique constraint on (course_id, semester)

2. **Query Optimization**:
   - JOIN queries for related data
   - Filtering at database level
   - Pagination for large datasets

3. **Caching Strategy**:
   - Client-side caching with SWR (optional)
   - JWT tokens cached in cookies
   - Static fee structures cached

4. **Loading States**:
   - Skeleton loaders during data fetch
   - Suspense boundaries for async components
   - Loading.tsx files for each route

---

**Architecture Documentation Complete** ✅

This architecture supports:
- 🔐 Secure multi-role authentication
- 📊 Real-time payment tracking
- 💰 Comprehensive fee management
- 📱 Responsive design
- 🌙 Dark mode support
- ♿ Accessibility standards
