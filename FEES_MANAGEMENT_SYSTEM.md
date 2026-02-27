# Fees Management System Documentation

## Overview
Complete fees management system with dedicated Accounts Personnel portal for managing student fees, payments, and fee structures.

## System Components

### 1. Database Tables

#### `fee_structure`
Stores fee definitions for each course-semester combination.
- `id`: Primary key
- `course_id`: Foreign key to courses table
- `semester`: Semester number
- `semester_fee`: Semester fee amount
- `exam_fee`: Examination fee amount
- `created_at`, `updated_at`: Timestamps

#### `fee_payments`
Stores all fee payment transactions.
- `id`: Primary key
- `student_id`: Foreign key to students table
- `semester`: Semester for which payment is made
- `fee_type`: 'semester', 'exam', or 'both'
- `amount_paid`: Payment amount
- `payment_date`: Date of payment
- `transaction_id`: Unique transaction identifier
- `accounts_personnel_id`: Who recorded the payment
- `notes`: Optional payment notes
- `created_at`: Timestamp

### 2. Roles & Permissions

#### Super Admin
- Full access to all fee management features
- Can define and update fee structures
- Can view all payment records
- Access via `/admin/fees/structure` and `/admin/fees/payments`

#### Accounts Personnel
- Dedicated portal at `/accounts-personnel/*`
- Can define and update fee structures
- Can record student payments
- Can view payment history
- Cannot delete fee structures

#### Students
- View their own fee details at `/student/fees`
- See fees only up to current semester
- View payment history
- See paid vs remaining amounts

### 3. Fee Structure Management

#### Admin/Accounts Personnel can:
1. Define fees for each Course → Semester
2. Set two fee types:
   - Semester Fees
   - Examination Fees
3. Update existing fee structures
4. View all fee structures by course

#### Example Structure:
```
Course: BCA (8 semesters)
  Semester 1: Semester Fee: ₹45,000, Exam Fee: ₹5,000
  Semester 2: Semester Fee: ₹45,000, Exam Fee: ₹5,000
  ...
```

### 4. Payment Recording

#### Features:
- Search student by enrollment number
- View student's complete fee status
- Record payments semester-wise
- Support partial payments
- Multiple payment types:
  - Semester fee only
  - Exam fee only
  - Both (combined payment)

#### Validations:
- Prevents over-payment
- Requires unique transaction ID
- Calculates remaining balance automatically
- Shows semester-wise breakdown

#### Payment Process:
1. Search student by enrollment number
2. System shows:
   - Student details (name, course, semester)
   - Fee structure for all semesters up to current
   - Payment status for each semester
   - Total fees, paid amount, remaining amount
3. Select semester and fee type
4. Enter amount and transaction details
5. System validates against remaining fees
6. Payment recorded with timestamp and personnel info

### 5. Student Fee View

#### What Students See:
- Total fees up to current semester only
- Total paid amount
- Remaining balance
- Semester-wise breakdown:
  - Semester number
  - Semester fee amount
  - Exam fee amount
  - Payment status (Paid/Partial/Pending)
  - Individual payment records

#### Important Rules:
- Students only see fees up to their current semester
- Future semester fees are hidden
- Past semester payment history is visible
- All calculations are real-time

### 6. Payment History

Each payment record includes:
- Transaction ID (unique)
- Payment date
- Amount paid
- Semester
- Fee type (semester/exam/both)
- Processed by (accounts personnel name)
- Optional notes

### 7. Accounts Personnel Portal

#### Login
- Route: `/accounts-personnel/login`
- Username and password authentication
- Session-based with JWT tokens

#### Dashboard
- Route: `/accounts-personnel/dashboard`
- Shows:
  - Total active students
  - Total fees collected
  - Students with pending payments
  - Recent payments (last 7 days)
- Quick actions:
  - Update Payment
  - Manage Fee Structure

#### Update Payment Page
- Route: `/accounts-personnel/update-payment`
- Search and record payments
- Real-time fee calculation
- Validation against over-payment

#### Fee Structure Page
- Route: `/accounts-personnel/fee-structure`
- Create/edit fee structures
- Filter by course
- View all defined fees

### 8. API Endpoints

#### Admin/Accounts Personnel APIs:
- `GET /api/admin/fees/structure` - Fetch fee structures
- `POST /api/admin/fees/structure` - Create fee structure
- `PUT /api/admin/fees/structure` - Update fee structure
- `GET /api/admin/fees/payments` - Fetch payment records
- `POST /api/admin/fees/payments` - Record payment

#### Accounts Personnel APIs:
- `POST /api/accounts-personnel/login` - Login
- `POST /api/accounts-personnel/logout` - Logout
- `GET /api/accounts-personnel/stats` - Dashboard statistics
- `GET /api/accounts-personnel/student-fees` - Get student fee details
- `POST /api/accounts-personnel/record-payment` - Record payment

#### Student APIs:
- `GET /api/student/fees` - Get own fee details

### 9. Security Features

- JWT-based authentication for accounts personnel
- Cookie-based session management
- Password hashing with bcrypt
- Unique transaction ID validation
- Over-payment prevention
- Role-based access control

### 10. Navigation

#### Admin Dashboard:
- New card: "Fees Management"
- Links to Fee Structure and Payment Records

#### Student Dashboard:
- Quick action: "My Fees"
- Routes to fee details page

## Usage Examples

### Setting Up Fees for a New Course
1. Login as Super Admin or Accounts Personnel
2. Go to Fee Structure page
3. Click "Add Fee Structure"
4. Select course and semester
5. Enter semester fee and exam fee
6. Save

### Recording a Payment
1. Login to Accounts Personnel portal
2. Go to "Update Payment"
3. Enter student enrollment number
4. Review fee status
5. Select semester and fee type
6. Enter payment amount and transaction ID
7. Submit

### Student Viewing Fees
1. Login to student portal
2. Click "My Fees" on dashboard
3. View total fees, paid, and remaining
4. See semester-wise breakdown
5. Check payment history

## Database Migration

Run the migration script:
```sql
scripts/34-create-fees-management-system.sql
```

This creates:
- `fee_structure` table
- `fee_payments` table
- Indexes for performance
- Automatic timestamp updates

## Default Credentials

Accounts Personnel users must be created in the `administrative_personnel` table with:
- Username
- Password (hashed with bcrypt)
- Name and email
- Active status

## Calculations

### Total Fees (Student):
```
Sum of (semester_fee + exam_fee) for all semesters <= current_semester
```

### Total Paid:
```
Sum of all amount_paid from fee_payments for the student
```

### Remaining:
```
Total Fees - Total Paid
```

### Semester-wise Remaining:
```
(semester_fee + exam_fee) - Sum(payments for that semester)
```

## Notes

- All fee amounts are stored in INR (₹)
- Payment dates default to current date if not specified
- Transaction IDs must be unique across all payments
- Future semester fees are never shown to students
- Only current and past semester fees are accessible
- Real-time calculations ensure accuracy
