# Online Fee Payment System Setup

This document describes the CCAvenue bank payment gateway integration for online fee payments.

## Environment Variables

Add these to your `.env.local` file:

```
# CCAvenue Gateway Configuration
CCAVENUE_MERCHANT_ID=your_merchant_id
CCAVENUE_ACCESS_CODE=your_access_code
CCAVENUE_WORKING_KEY=your_32_bit_working_key

# Redirect URLs (for production, use your domain)
CCAVENUE_REDIRECT_URL=https://yourdomain.com/api/student/fees/payment-callback
CCAVENUE_CANCEL_URL=https://yourdomain.com/student/fees
```

## How to Get CCAvenue Credentials

1. Sign up with CCAvenue at https://www.ccavenue.com/
2. Verify your merchant account
3. Generate API credentials from your merchant dashboard
4. Copy the Merchant ID, Access Code, and Working Key
5. Update the environment variables above

## Database Setup

Run the migration to create online payment tables:

```bash
npm run migrate -- scripts/36-create-online-payment-tables.sql
```

This creates:
- `online_fee_payments` - Tracks all online payment attempts
- Updates `fee_payments` - Adds payment source tracking
- Creates `online_payments_summary` view for analytics

## Features Implemented

### Student Portal
- **Pay Now Button**: Appears beside each semester in the fee breakdown
- Shows only when:
  - Remaining amount > 0
  - Semester is not fully paid
  - User is currently viewing/past that semester

- **Auto-filled Payment Form**: Student details automatically populated:
  - Full Name
  - Enrollment Number
  - Course Name
  - Semester
  - Payable Amount
  - All fields read-only on payment gateway

- **Payment Status**: Real-time updates after payment
  - Success: Green badge, balance updated
  - Failed: Red badge, can retry
  - Pending: Yellow badge, auto-reconciles when confirmed

### Admin Dashboard
- **Online Payments Tracking**: View all online payment attempts
  - Filter by semester, status, student ID
  - See transaction IDs and bank references
  - Verify successful transactions
  - Track failed/pending payments

- **Payment Source Differentiation**:
  - Online payments tagged as "Student Online Payment"
  - Manual payments remain as "Manual"
  - Prevents editing of successful online payments

## Payment Flow

```
1. Student clicks "Pay Now"
2. System generates unique reference ID
3. Student reviews auto-filled payment details
4. Redirects to CCAvenue gateway
5. Student completes bank authentication
6. Bank sends encrypted response
7. System decrypts and validates response
8. Updates fee_payments table on success
9. Redirects student back to fees page with status
10. Dashboard reflects new balance immediately
```

## API Endpoints

### Initiate Payment
```
POST /api/student/fees/initiate-payment
Authorization: Bearer {studentToken}

Request:
{
  "semester": 1,
  "feeType": "Semester + Exam",
  "amount": 40600,
  "studentId": "STU001",
  "enrollmentNumber": "2021001",
  "fullName": "John Doe",
  "courseName": "B.Tech"
}

Response:
{
  "success": true,
  "encRequest": "encrypted_string",
  "accessCode": "access_code",
  "redirectUrl": "https://secure.ccavenue.com/...",
  "referenceId": "SFP-STU001-S1-S-1707123456"
}
```

### Payment Callback
```
POST /api/student/fees/payment-callback
(Receives encrypted response from CCAvenue)

Automatically redirects to /student/fees with status
```

### Admin: View Online Payments
```
GET /api/admin/fees/online-payments
Authorization: Bearer {adminToken}

Query Parameters:
- semester: filter by semester number
- status: filter by payment status (PENDING, SUCCESS, FAILED)
- studentId: filter by student ID
- page: pagination page (default: 1)
- limit: results per page (default: 20)

Response:
{
  "success": true,
  "payments": [...],
  "pagination": { "total": 100, "page": 1, "limit": 20, "pages": 5 }
}
```

### Verify Payment Status
```
GET /api/student/fees/payment-callback?order_id=SFP-STU001-S1-S-1707123456
Authorization: Bearer {studentToken}

Response:
{
  "success": true,
  "payment": {
    "orderId": "SFP-STU001-S1-S-1707123456",
    "status": "SUCCESS",
    "amount": 40600,
    "transactionId": "12345678",
    "bankRefNo": "BANK123",
    "createdAt": "2024-02-06T10:30:00Z"
  }
}
```

## Security Features

1. **Encryption**: AES-128/256-CBC encryption for all gateway communications
2. **Unique References**: Each payment gets unique reference ID with timestamp
3. **Validation**: Amount verified against remaining balance
4. **Immutability**: Successful online payments cannot be manually edited
5. **Token-based Auth**: All APIs require valid auth tokens
6. **HTTPS Only**: All redirects use HTTPS

## Testing

### Test Card Numbers (CCAvenue Sandbox)
- Visa: 4111 1111 1111 1111
- MasterCard: 5555 5555 5555 4444
- Test CVV: Any 3 digits
- Test Date: Any future date

### Test Environment
1. Use sandbox URLs from CCAvenue
2. Set `CCAVENUE_REDIRECT_URL` to localhost for local testing
3. CCAvenue sandbox credentials are different from production

## Troubleshooting

### Payment Not Processing
- Check if amount is valid (> 0)
- Verify semester is not a future semester
- Ensure no pending payment already exists for that semester

### Encryption Errors
- Verify CCAVENUE_WORKING_KEY is correct 32-bit string
- Check for whitespace in environment variables
- Ensure crypto module is properly installed

### Redirect Not Working
- Verify `encRequest` and `access_code` are correctly generated
- Check CCAvenue merchant account is active
- Ensure redirect URLs are whitelisted in CCAvenue dashboard

## Constraints

- ✓ No over-payment allowed (checked in initiate-payment)
- ✓ No future semester payments allowed (verified in UI)
- ✓ Duplicate payments prevented (unique reference + pending check)
- ✓ Manual payment workflow unchanged
- ✓ All dashboards continue to work
- ✓ Payment history visible to both students and admins
- ✓ Audit trail maintained in online_fee_payments table

## Support

For CCAvenue support: https://www.ccavenue.com/
For app-specific issues, check logs in `/app/api/student/fees/` endpoints.
