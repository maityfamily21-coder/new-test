# 🚀 Fees Management System - Quick Start Guide

## 📋 Quick Reference

### Default Login Credentials
**Accounts Personnel Portal**
- URL: `/accounts-personnel/login`
- Username: `accounts`
- Password: `accounts123`

---

## 🎯 Quick Access Links

### For Accounts Personnel:
1. **Login**: `/accounts-personnel/login`
2. **Dashboard**: `/accounts-personnel/dashboard`
3. **Record Payment**: `/accounts-personnel/update-payment`
4. **View Fee Structure**: `/accounts-personnel/fee-structure`

### For Admins:
1. **Fee Structure**: `/admin/fees/structure`
2. **Payment Records**: `/admin/fees/payments`

### For Students:
1. **My Fees**: `/student/fees`

---

## 💡 Common Tasks

### Record a Student Payment

1. Login to Accounts Portal
2. Click **"Update Payment"** or go to `/accounts-personnel/update-payment`
3. Search student by ID or name
4. Review fee structure and payment history
5. Fill payment form:
   - Select **Semester**
   - Choose **Payment Type** (Semester/Exam/Both)
   - Enter **Amount**
   - Enter **Transaction ID** (auto-generated or custom)
   - Add **Notes** (optional)
6. Click **"Record Payment"**
7. View confirmation and updated balance

### Add Fee Structure (Admin)

1. Go to `/admin/fees/structure`
2. Click **"Add Fee Structure"**
3. Fill form:
   - Select **Course**
   - Enter **Semester** number
   - Enter **Semester Fee** amount
   - Enter **Exam Fee** amount
4. Click **"Create Fee Structure"**

### Check Student Fees (Student)

1. Login to student portal
2. Go to dashboard
3. Click **"My Fees"** quick action
4. View:
   - Fee structure by semester
   - Payment history
   - Balance due
   - Total summary

---

## 🗂️ Database Setup

### Run Migrations (If Not Done)

```bash
# Execute in order:
scripts/34-create-fees-management-system.sql
scripts/35-create-default-accounts-personnel.sql
```

---

## 📊 Key Features

### Accounts Personnel Portal:
- ✅ Student search with autocomplete
- ✅ Fee structure viewing
- ✅ Payment recording with validation
- ✅ Payment history by student
- ✅ Dashboard statistics
- ✅ Secure authentication

### Admin Portal:
- ✅ Complete fee structure management
- ✅ Payment records with advanced filtering
- ✅ Export capabilities
- ✅ Statistics and summaries

### Student Portal:
- ✅ Personal fee structure view
- ✅ Payment history
- ✅ Balance calculation
- ✅ Status indicators (Paid/Pending/Partial)

---

## 🔐 Security Notes

- All routes protected by middleware
- JWT-based authentication
- HTTP-only cookies for sessions
- 7-day token expiry
- Password should be changed after first login

---

## 📱 Navigation

### From Homepage:
Click **"Accounts"** button → Login

### Within Accounts Portal:
- **Dashboard**: Overview and quick stats
- **Update Payment**: Record new payments
- **Fee Structure**: View all fee structures
- **Logout**: End session

---

## ⚡ Pro Tips

1. **Quick Student Search**: 
   - Type student ID or name in search box
   - Autocomplete shows matching students
   - Press Enter to select

2. **Payment Types**:
   - **Semester Fee**: Regular tuition
   - **Exam Fee**: Examination charges
   - **Both**: Combined payment

3. **Transaction IDs**:
   - Auto-generated: `TXN-YYYYMMDDHHMMSS-XXX`
   - Or enter custom ID (must be unique)

4. **Dashboard Stats**:
   - Refreshes on each page load
   - Shows current month data
   - Total collected and pending counts

5. **Fee Structure**:
   - Must be created before accepting payments
   - One structure per course-semester combination
   - Can be updated anytime by admin

---

## 🆘 Troubleshooting

### Cannot Login
- Verify credentials: `accounts` / `accounts123`
- Check if default user script was run
- Clear browser cookies and retry

### Student Not Found
- Verify student exists in database
- Check student ID spelling
- Ensure student is active

### Payment Recording Fails
- Ensure fee structure exists for that semester
- Check transaction ID is unique
- Verify amount is positive number

### Fees Not Showing (Student)
- Check if fee structure is created for course
- Verify student is enrolled in course
- Fees show only up to current semester

---

## 📞 Support

For issues or questions:
1. Check **FEES_MANAGEMENT_SYSTEM.md** for detailed documentation
2. Review **FEES_SYSTEM_IMPLEMENTATION_COMPLETE.md** for technical details
3. Contact system administrator

---

**Quick Start Complete!** 🎉

You're ready to use the Fees Management System. Start by logging into the Accounts Personnel portal and recording your first payment!
