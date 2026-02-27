# Stationery Management System

A standalone system for managing stationery inventory and processing requests from faculty and staff.

## Roles & Permissions

### Super Admin
- Full visibility of all inventory and requests.
- Can manage inventory items.

### Technical Team
- Manage stationery inventory (Add, Edit, Delete).
- Review incoming requests (Approve or Reject).
- Inventory levels are automatically adjusted upon approval.

### Tutors & Admin Personnel
- View available stationery items.
- Submit new stationery requests.
- Track history and status of their own requests.

## Workflow

1. **Inventory Setup**: Technical team adds stationery items with total quantities.
2. **Request Submission**: User (Tutor/Personnel) selects items and quantities.
3. **Review**: Technical team reviews the pending request.
4. **Processing**:
   - **Approval**: Inventory is deducted, status becomes 'Approved'.
   - **Rejection**: Status becomes 'Rejected', reason can be provided.
5. **History**: Requesters can see their past requests and current status.

## Database Schema

- `stationery_inventory`: Stores item details and current stock levels.
- `stationery_requests`: Header table for requests tracking status and metadata.
- `stationery_request_items`: Detail table for items included in each request.
