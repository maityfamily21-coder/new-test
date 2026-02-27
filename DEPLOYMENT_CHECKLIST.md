# Online Payment System - Deployment Checklist

## Pre-Deployment ✓

### 1. CCAvenue Account Setup
- [ ] Create merchant account at https://www.ccavenue.com/
- [ ] Complete KYC verification
- [ ] Receive Merchant ID
- [ ] Receive Access Code
- [ ] Receive 32-bit Working Key
- [ ] Note sandbox credentials (for testing)

### 2. Environment Configuration
- [ ] Copy `.env.example` to `.env.local`
- [ ] Add `CCAVENUE_MERCHANT_ID`
- [ ] Add `CCAVENUE_ACCESS_CODE`
- [ ] Add `CCAVENUE_WORKING_KEY` (keep secure!)
- [ ] Set `CCAVENUE_REDIRECT_URL` to localhost for testing
- [ ] Set `CCAVENUE_CANCEL_URL` to localhost for testing

### 3. Database Preparation
- [ ] Backup existing database
- [ ] Run migration: `scripts/36-create-online-payment-tables.sql`
- [ ] Verify tables created:
  - [ ] `online_fee_payments` table exists
  - [ ] `fee_payments` has `payment_source` column
  - [ ] `fee_payments` has `online_payment_id` column
  - [ ] `online_payments_summary` view exists

### 4. Code Review
- [ ] Review `/lib/ccavenue-util.ts` for encryption logic
- [ ] Review `/app/api/student/fees/initiate-payment/route.ts`
- [ ] Review `/app/api/student/fees/payment-callback/route.ts`
- [ ] Review `/components/semester-pay-button.tsx` UI
- [ ] Check `/app/student/fees/page.tsx` integration

### 5. Local Testing (Sandbox)
- [ ] Install dependencies: `npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Login as student account
- [ ] Navigate to `/student/fees`
- [ ] Verify [Pay Now] buttons appear for pending semesters
- [ ] Click [Pay Now] on a semester
- [ ] Verify modal shows auto-filled details (read-only)
- [ ] Click [Proceed to Payment]
- [ ] Verify redirected to CCAvenue gateway
- [ ] Use test card: 4111 1111 1111 1111
- [ ] Use any future expiry date
- [ ] Use any 3-digit CVV
- [ ] Complete authentication
- [ ] Verify redirected back to `/student/fees?payment_status=SUCCESS`
- [ ] Verify success banner appears
- [ ] Verify status changed to "Paid"
- [ ] Verify payment appears in Payment History
- [ ] Check database records in `online_fee_payments` table

### 6. Negative Test Cases (Sandbox)
- [ ] Test failed payment scenario
  - [ ] Use declined test card in CCAvenue
  - [ ] Verify error banner shows "Payment failed"
  - [ ] Verify semester status remains "Partial"
  - [ ] Verify [Pay Now] still available for retry
  - [ ] Check database shows FAILED status

- [ ] Test duplicate payment prevention
  - [ ] Attempt same payment twice quickly
  - [ ] Verify database prevents duplicate reference IDs
  - [ ] Verify amount not doubled

- [ ] Test no over-payment
  - [ ] Try to pay more than remaining amount
  - [ ] Verify system rejects with error

- [ ] Test future semester protection
  - [ ] UI should not show [Pay Now] for future semesters
  - [ ] Verify in code that current semester is enforced

### 7. Admin Dashboard Testing
- [ ] Login as admin
- [ ] Navigate to online payments dashboard
- [ ] Verify can see all online payment attempts
- [ ] Test filter by semester
- [ ] Test filter by payment status
- [ ] Test filter by student ID
- [ ] Verify pagination works
- [ ] Verify transaction IDs visible
- [ ] Verify cannot edit successful online payments

---

## Production Deployment ✓

### 1. CCAvenue Production Setup
- [ ] Switch from sandbox to production credentials
- [ ] Update `CCAVENUE_MERCHANT_ID` (production)
- [ ] Update `CCAVENUE_ACCESS_CODE` (production)
- [ ] Update `CCAVENUE_WORKING_KEY` (production)
- [ ] Whitelist redirect URLs in CCAvenue dashboard
  - [ ] `https://yourdomain.com/api/student/fees/payment-callback`
  - [ ] `https://yourdomain.com/student/fees`

### 2. Environment Variables (Production)
- [ ] Set in Vercel/Deployment platform:
  - [ ] `CCAVENUE_MERCHANT_ID`
  - [ ] `CCAVENUE_ACCESS_CODE`
  - [ ] `CCAVENUE_WORKING_KEY` (use Vercel secrets!)
  - [ ] `CCAVENUE_REDIRECT_URL=https://yourdomain.com/api/student/fees/payment-callback`
  - [ ] `CCAVENUE_CANCEL_URL=https://yourdomain.com/student/fees`

### 3. Database in Production
- [ ] Run migration on production database
- [ ] Verify all tables/columns created
- [ ] Backup production database before running

### 4. SSL/TLS Verification
- [ ] Verify HTTPS enabled on domain
- [ ] Verify CCAvenue URLs are HTTPS
- [ ] Test redirect URLs work from browser
- [ ] Check certificate is valid

### 5. Production Testing (1st Wave)
- [ ] Deploy to staging environment first
- [ ] Test with small group of users
- [ ] Monitor logs for errors
- [ ] Verify payments process correctly
- [ ] Check database records creation
- [ ] Verify emails/notifications work

### 6. Production Rollout
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Check transaction logs
- [ ] Verify balance updates correctly
- [ ] Monitor CCAvenue account for activity
- [ ] Have support team ready

### 7. Post-Deployment Monitoring
- [ ] Set up payment failure alerts
- [ ] Monitor `/api/student/fees/initiate-payment` response times
- [ ] Monitor `/api/student/fees/payment-callback` processing
- [ ] Track success rate of payments
- [ ] Monitor database query performance
- [ ] Set up daily reconciliation check

---

## Documentation & Communication ✓

### 1. Student Communication
- [ ] Create student guide: "How to Pay Fees Online"
- [ ] Publish FAQ about online payments
- [ ] Add help section in fees portal
- [ ] Send email notification about new payment option
- [ ] Include in student handbook

### 2. Staff Communication
- [ ] Train accounts team on new system
- [ ] Provide admin dashboard walkthrough
- [ ] Create staff guide for payment verification
- [ ] Document approval/rejection workflow
- [ ] Create escalation procedures

### 3. Technical Documentation
- [ ] Document API endpoints
- [ ] Document error codes
- [ ] Create troubleshooting guide
- [ ] Document backup/recovery procedures
- [ ] Create audit logging procedures

---

## Security Checklist ✓

### 1. Access Control
- [ ] Verify student token validation in all APIs
- [ ] Verify admin token validation in admin APIs
- [ ] Ensure no unauthorized access to payment data
- [ ] Test API with invalid tokens

### 2. Data Protection
- [ ] Verify encryption working correctly
- [ ] Check no plain-text sensitive data in logs
- [ ] Verify HTTPS on all endpoints
- [ ] Check database backups encrypted
- [ ] Verify API keys not exposed in code

### 3. Fraud Prevention
- [ ] Verify no over-payment allowed
- [ ] Verify no duplicate payments possible
- [ ] Verify amount validation working
- [ ] Verify semester validation working
- [ ] Check for SQL injection vulnerabilities

### 4. Audit Trail
- [ ] Verify all transactions logged
- [ ] Verify timestamps recorded
- [ ] Verify transaction IDs stored
- [ ] Verify bank references stored
- [ ] Check logs accessible to admins only

### 5. Compliance
- [ ] Verify PCI-DSS compliance (no card data stored)
- [ ] Verify data retention policies met
- [ ] Verify GDPR compliance (if applicable)
- [ ] Document terms & conditions for online payments
- [ ] Create privacy policy addendum

---

## Maintenance & Support ✓

### 1. Daily Checks
- [ ] Review payment failure logs
- [ ] Check CCAvenue account notifications
- [ ] Verify database backups completed
- [ ] Monitor error rates

### 2. Weekly Checks
- [ ] Reconcile online payments with bank
- [ ] Check for pending payments to follow up
- [ ] Review admin dashboard for anomalies
- [ ] Check student complaints/issues

### 3. Monthly Checks
- [ ] Generate payment reports
- [ ] Audit transaction records
- [ ] Review system performance
- [ ] Update documentation as needed
- [ ] Analyze payment success rates

### 4. Support Procedures
- [ ] Document how to handle payment failures
- [ ] Document how to process refunds
- [ ] Document how to manually fix payment records (if needed)
- [ ] Create escalation matrix for CCAvenue issues
- [ ] Create emergency contact list

---

## Rollback Plan ✓

If something goes wrong:

### Immediate Actions
- [ ] Stop directing students to online payment
- [ ] Temporarily hide [Pay Now] buttons
- [ ] Notify affected students
- [ ] Contact CCAvenue support

### Investigation
- [ ] Check error logs
- [ ] Verify CCAvenue account status
- [ ] Review recent database changes
- [ ] Check environment variables

### Recovery Steps
1. [ ] Stop payment processing
2. [ ] Restore database from last good backup
3. [ ] Verify no data loss
4. [ ] Re-enable manual payment workflow
5. [ ] Update students about issue
6. [ ] Fix underlying problem
7. [ ] Re-test thoroughly before re-enabling

---

## Sign-Off ✓

- [ ] Development Lead Sign-Off: _________________ Date: _____
- [ ] QA Sign-Off: _________________ Date: _____
- [ ] Security Review Sign-Off: _________________ Date: _____
- [ ] Project Manager Sign-Off: _________________ Date: _____
- [ ] Finance/Accounts Sign-Off: _________________ Date: _____

---

## Launch Status

**Ready for Production**: [ ] YES [ ] NO

**Date Deployed**: _____________________________

**Notes**: ___________________________________________________
_________________________________________________________
_________________________________________________________

---

## Contact Information

**Deployment Issues**: [Support Email/Phone]
**CCAvenue Support**: support@ccavenue.com / +1-800-xxx-xxxx
**Database Issues**: [DBA Contact]
**Security Issues**: [Security Team Contact]

---

**Checklist Version**: 1.0
**Last Updated**: 2024-02-06
**Next Review**: [Date]
