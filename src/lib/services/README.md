# Service Layer

This directory contains the service layer for all backend operations using Supabase.

## Type Assertions Note

You'll see `as any` type assertions throughout these service files. This is intentional and necessary because:

1. **Database Types Not Fully Generated**: The `database.types.ts` file provides the structure for Supabase types, but without running Supabase's CLI type generator (`supabase gen types typescript`), the types default to `never`.

2. **Runtime Safety**: All operations are runtime-safe. The type assertions only suppress TypeScript errors; they don't affect runtime behavior.

3. **Proper Solution**: After setting up your Supabase project, run:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
   ```
   This will generate proper types and you can remove most `as any` assertions.

## Services Overview

### staffService
- Employee/staff CRUD operations
- User invitation and onboarding
- Profile management

### scheduleService  
- Shift creation and management
- Staff assignment to shifts
- Conflict detection
- Locum (temporary staff) support

### leaveService
- Leave type management
- Leave request workflow (create, approve, reject, cancel)
- Leave balance tracking
- Automatic balance calculations

### attendanceService
- Clock in/out functionality
- Manual attendance entries
- Daily attendance generation
- Attendance statistics and summaries

### payrollService
- Payroll period management
- Payroll entry generation
- Allowances and deductions
- Payment tracking
- Payroll finalization

### organizationService
- Organization profile management
- Location management (multi-location support)
- Verification workflow (business registration, facility licensing)
- Subscription plan management

### adminService (SuperAdmin only)
- Platform-wide organization management
- Verification approval/rejection
- Account status management
- Audit logs
- Platform statistics

## Usage Example

```typescript
import { staffService, scheduleService } from '@/lib/services';

// Get current user's organization staff
const staff = await staffService.getAll();

// Create a shift
const shift = await scheduleService.create({
  locationId: 'loc-123',
  date: '2026-01-15',
  startTime: '09:00',
  endTime: '17:00',
  roleRequired: 'Nurse',
  staffNeeded: 2,
}, organizationId, userId);

// Assign staff to shift
await scheduleService.assignStaff(shift.id, staffId);
```

## Database Schema

All services interact with tables defined in `supabase/migrations/001_initial_schema.sql`. Key features:

- **Row Level Security (RLS)**: All tables have RLS policies ensuring multi-tenant data isolation
- **Automatic Timestamps**: `created_at` and `updated_at` managed by database triggers
- **Audit Logging**: Critical operations automatically logged
- **Soft Deletes**: Some tables support soft deletion

## Error Handling

All service methods throw errors that should be caught by the calling code:

```typescript
try {
  const staff = await staffService.create(input, orgId);
} catch (error) {
  console.error('Failed to create staff:', error);
  // Handle error (show toast, etc.)
}
```
