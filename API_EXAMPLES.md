# Online Payment System - API Examples

## 1. Initiate Payment

**Endpoint**: `POST /api/student/fees/initiate-payment`

**Authentication**: Required (Bearer token)

### Request

```bash
curl -X POST http://localhost:3000/api/student/fees/initiate-payment \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "semester": 2,
    "feeType": "Semester + Exam",
    "amount": 40600,
    "studentId": "STU001",
    "enrollmentNumber": "2021001",
    "fullName": "John Doe",
    "courseName": "B.Tech Computer Science"
  }'
```

### Request Body

```json
{
  "semester": 2,
  "feeType": "Semester + Exam",
  "amount": 40600,
  "studentId": "STU001",
  "enrollmentNumber": "2021001",
  "fullName": "John Doe",
  "courseName": "B.Tech Computer Science"
}
```

### Success Response (200)

```json
{
  "success": true,
  "encRequest": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "accessCode": "CCAVENUE_ACCESS_CODE_HERE",
  "redirectUrl": "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction",
  "referenceId": "SFP-STU001-S2-S-1707123456789"
}
```

### Error Responses

**400 - Missing Fields**
```json
{
  "error": "Missing required fields"
}
```

**400 - Invalid Amount**
```json
{
  "error": "Invalid amount"
}
```

**401 - Unauthorized**
```json
{
  "error": "Unauthorized"
}
```

**500 - Server Error**
```json
{
  "error": "Failed to initiate payment"
}
```

### Using Response in Frontend

```javascript
// After receiving response
const data = await response.json();

// Create form to submit to CCAvenue
const form = document.createElement('form');
form.method = 'POST';
form.action = data.redirectUrl;

const encRequest = document.createElement('input');
encRequest.type = 'hidden';
encRequest.name = 'encRequest';
encRequest.value = data.encRequest;

const accessCode = document.createElement('input');
accessCode.type = 'hidden';
accessCode.name = 'access_code';
accessCode.value = data.accessCode;

form.appendChild(encRequest);
form.appendChild(accessCode);
document.body.appendChild(form);
form.submit(); // Redirects to bank gateway
```

---

## 2. Payment Callback Handler

**Endpoint**: `POST /api/student/fees/payment-callback`

**Authentication**: Not required (comes from CCAvenue)

### Callback from CCAvenue

The bank gateway sends encrypted data in this format:

```
POST /api/student/fees/payment-callback HTTP/1.1
Content-Type: application/x-www-form-urlencoded

encResp=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6ABCDEFGHIJKLMNOP...
```

### Decrypted Response from CCAvenue

```
order_id=SFP-STU001-S2-S-1707123456789&
tracking_id=12345678901234&
bank_ref_no=BANK123456&
order_status=Success&
amount=40600.00&
auth_desc=Authentication%20Successful&
merchant_param1=STU001&
merchant_param2=2021001&
merchant_param3=2&
merchant_param4=Semester+Exam&
merchant_param5=B.Tech
```

### Successful Redirect

```
GET /student/fees?payment_status=SUCCESS&transaction_id=12345678901234&order_id=SFP-STU001-S2-S-1707123456789
```

### Failed Payment Redirect

```
GET /student/fees?payment_status=FAILED&transaction_id=&order_id=SFP-STU001-S2-S-1707123456789
```

### Pending Payment Redirect

```
GET /student/fees?payment_status=PENDING&transaction_id=12345678901234&order_id=SFP-STU001-S2-S-1707123456789
```

---

## 3. Verify Payment Status

**Endpoint**: `GET /api/student/fees/payment-callback`

**Authentication**: Required (Bearer token)

### Request

```bash
curl -X GET "http://localhost:3000/api/student/fees/payment-callback?order_id=SFP-STU001-S2-S-1707123456789" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Query Parameters

```
order_id=SFP-STU001-S2-S-1707123456789
```

### Success Response (200)

```json
{
  "success": true,
  "payment": {
    "orderId": "SFP-STU001-S2-S-1707123456789",
    "status": "SUCCESS",
    "amount": 40600,
    "transactionId": "12345678901234",
    "bankRefNo": "BANK123456",
    "createdAt": "2024-02-06T10:30:45.000Z"
  }
}
```

### Payment Not Found (404)

```json
{
  "error": "Payment not found"
}
```

---

## 4. Admin: Get Online Payments

**Endpoint**: `GET /api/admin/fees/online-payments`

**Authentication**: Required (Admin token)

### Basic Request

```bash
curl -X GET "http://localhost:3000/api/admin/fees/online-payments" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### With Filters

```bash
# Filter by semester
curl -X GET "http://localhost:3000/api/admin/fees/online-payments?semester=2" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"

# Filter by status
curl -X GET "http://localhost:3000/api/admin/fees/online-payments?status=SUCCESS" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"

# Filter by student ID
curl -X GET "http://localhost:3000/api/admin/fees/online-payments?studentId=STU001" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"

# Pagination
curl -X GET "http://localhost:3000/api/admin/fees/online-payments?page=2&limit=10" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"

# Combined filters
curl -X GET "http://localhost:3000/api/admin/fees/online-payments?semester=2&status=SUCCESS&page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| semester | number | - | Filter by semester number |
| status | string | - | Filter by status (PENDING, SUCCESS, FAILED) |
| studentId | string | - | Filter by student ID |
| page | number | 1 | Page number for pagination |
| limit | number | 20 | Records per page |

### Success Response (200)

```json
{
  "success": true,
  "payments": [
    {
      "id": 1,
      "student_id": "STU001",
      "semester": 2,
      "fee_type": "Semester + Exam",
      "amount": 40600,
      "status": "SUCCESS",
      "reference_id": "SFP-STU001-S2-S-1707123456789",
      "transaction_id": "12345678901234",
      "bank_ref_no": "BANK123456",
      "full_name": "John Doe",
      "enrollment_number": "2021001",
      "course_name": "B.Tech Computer Science",
      "created_at": "2024-02-06T10:30:45.000Z",
      "updated_at": "2024-02-06T10:31:00.000Z"
    },
    {
      "id": 2,
      "student_id": "STU002",
      "semester": 1,
      "fee_type": "Semester + Exam",
      "amount": 40600,
      "status": "FAILED",
      "reference_id": "SFP-STU002-S1-S-1707123456790",
      "transaction_id": null,
      "bank_ref_no": null,
      "full_name": "Jane Smith",
      "enrollment_number": "2021002",
      "course_name": "B.Tech Computer Science",
      "created_at": "2024-02-06T11:00:00.000Z",
      "updated_at": "2024-02-06T11:01:30.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### Error Response (401)

```json
{
  "error": "Unauthorized"
}
```

---

## 5. Database Records

### online_fee_payments Table

**Insert When**: Payment initiated

```sql
INSERT INTO online_fee_payments (
  student_id, semester, fee_type, amount, status, 
  reference_id, created_at
) VALUES (
  'STU001', 2, 'Semester + Exam', 40600, 'PENDING',
  'SFP-STU001-S2-S-1707123456789', NOW()
);
```

**Update When**: Payment callback received

```sql
UPDATE online_fee_payments 
SET status = 'SUCCESS', 
    transaction_id = '12345678901234', 
    bank_ref_no = 'BANK123456',
    updated_at = NOW()
WHERE reference_id = 'SFP-STU001-S2-S-1707123456789';
```

**Select Records**

```sql
-- Get all successful payments for a student
SELECT * FROM online_fee_payments 
WHERE student_id = 'STU001' AND status = 'SUCCESS'
ORDER BY created_at DESC;

-- Get failed payments (for follow-up)
SELECT * FROM online_fee_payments 
WHERE status = 'FAILED'
ORDER BY created_at DESC;

-- Get pending payments (for reconciliation)
SELECT * FROM online_fee_payments 
WHERE status = 'PENDING'
ORDER BY created_at DESC;

-- Get payments by semester
SELECT * FROM online_fee_payments 
WHERE semester = 2
ORDER BY created_at DESC;
```

### fee_payments Table Updates

**Insert When**: Online payment successful

```sql
INSERT INTO fee_payments (
  student_id, semester, fee_type, amount, 
  payment_date, transaction_id, payment_source,
  status, created_at
) VALUES (
  'STU001', 2, 'Semester', 40000,
  NOW(), '12345678901234', 'Online Payment',
  'Paid', NOW()
);
```

**View All Payments for Student**

```sql
SELECT 
  id, semester, fee_type, amount, 
  payment_source, status, payment_date,
  transaction_id
FROM fee_payments 
WHERE student_id = 'STU001'
ORDER BY semester, fee_type;
```

---

## 6. Real-World Scenario Example

### Scenario: Student pays Semester 2 fees online

**Step 1: Student clicks [Pay Now]**
- No API call yet, just opens modal

**Step 2: Student clicks [Proceed to Payment]**

```javascript
const response = await fetch('/api/student/fees/initiate-payment', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    semester: 2,
    feeType: 'Semester + Exam',
    amount: 40600,
    studentId: 'STU001',
    enrollmentNumber: '2021001',
    fullName: 'John Doe',
    courseName: 'B.Tech'
  })
});
```

**Response received:**

```json
{
  "success": true,
  "encRequest": "encrypted_request_string",
  "accessCode": "CCAVENUE_CODE",
  "redirectUrl": "https://secure.ccavenue.com/..."
}
```

**Database state after Step 2:**

```
online_fee_payments:
id=1, student_id=STU001, semester=2, amount=40600, 
status=PENDING, reference_id=SFP-STU001-S2-S-1707123456789
```

**Step 3: Form submitted to CCAvenue**

Browser navigates to bank gateway.

**Step 4: Bank sends response**

CCAvenue POSTs encrypted data to callback.

**Step 5: Callback processes response**

```
Decrypted data:
order_status=Success
tracking_id=12345678901234
bank_ref_no=BANK123456
order_id=SFP-STU001-S2-S-1707123456789
```

**Database updated:**

```
online_fee_payments:
id=1, student_id=STU001, semester=2, amount=40600,
status=SUCCESS, reference_id=SFP-STU001-S2-S-1707123456789,
transaction_id=12345678901234, bank_ref_no=BANK123456

fee_payments:
(new record inserted)
id=999, student_id=STU001, semester=2, fee_type=Semester,
amount=40000, status=Paid, payment_source=Online Payment,
transaction_id=12345678901234
```

**Step 6: Student redirected**

```
Redirect to: /student/fees?payment_status=SUCCESS&transaction_id=12345678901234
```

**Step 7: UI shows success**

- Green banner: "✓ Payment successful! Your fees have been updated."
- Semester 2 status changed to "Paid"
- Remaining balance updated
- Transaction appears in Payment History

---

## 7. Testing with cURL

### Test Payment Initiation (with test token)

```bash
# Generate a test token first (or use existing)
TEST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3000/api/student/fees/initiate-payment \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "semester": 2,
    "feeType": "Semester + Exam",
    "amount": 40600,
    "studentId": "STU001",
    "enrollmentNumber": "2021001",
    "fullName": "John Doe",
    "courseName": "B.Tech"
  }' \
  --verbose
```

### Test Admin API

```bash
ADMIN_TOKEN="admin_token_here"

# Get all payments
curl -X GET http://localhost:3000/api/admin/fees/online-payments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --verbose

# Get payments for semester 2
curl -X GET "http://localhost:3000/api/admin/fees/online-payments?semester=2" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --verbose

# Get successful payments only
curl -X GET "http://localhost:3000/api/admin/fees/online-payments?status=SUCCESS" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  --verbose
```

---

## 8. Error Code Reference

| HTTP Code | Error | Meaning |
|-----------|-------|---------|
| 200 | N/A | Success |
| 400 | Missing required fields | Request incomplete |
| 400 | Invalid amount | Amount ≤ 0 |
| 401 | Unauthorized | Invalid/missing token |
| 404 | Payment not found | Order ID doesn't exist |
| 500 | Failed to initiate payment | Server error |

---

## 9. Response Headers

All API responses include:

```
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

---

**Document Version**: 1.0
**Last Updated**: 2024-02-06
