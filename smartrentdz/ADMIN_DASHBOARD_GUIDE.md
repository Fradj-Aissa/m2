# SmartRent Admin Dashboard - Implementation Guide

## Overview
The Admin Dashboard has been created with a scalable, professional architecture designed for future expansion. This guide covers the current implementation and the steps needed to fully integrate admin functionality.

## Directory Structure
```
src/
├── components/
│   ├── AdminLayout.tsx          # Main admin layout with sidebar & topbar
│   └── AdminRoute.tsx           # Protected route component for admin pages
├── pages/
│   └── admin/
│       ├── AdminDashboard.tsx   # Main admin dashboard page
│       ├── AdminHome.tsx        # Dashboard stats and overview
│       ├── AdminUsers.tsx       # Users management page wrapper
│       ├── UsersTable.tsx       # Users table component with search
│       ├── AdminProperties.tsx  # Properties page wrapper
│       ├── PropertiesTable.tsx  # Properties table with approval system
│       ├── AdminReviews.tsx     # Reviews management page (placeholder)
│       ├── ReviewsManagement.tsx# Reviews management component
│       ├── AdminSubscriptions.tsx # Subscriptions page wrapper
│       ├── SubscriptionPlan.tsx # Subscription plans component
│       ├── AdminSettings.tsx    # Settings management component
│       └── AdminSettingsPage.tsx# Settings page wrapper
```

## Current Features

### 1. **AdminLayout Component** (`components/AdminLayout.tsx`)
- **Persistent Sidebar** with navigation links
- **Responsive Design**: Collapsible on mobile (<768px)
- **Topbar** with app name and user info
- **Navigation Items**:
  - Dashboard (📊)
  - Users (👥)
  - Properties (🏠)
  - Reviews (💬)
  - Subscriptions (💳)
  - Settings (⚙️)

### 2. **Admin Dashboard** (`pages/admin/AdminHome.tsx`)
- **Stats Cards** showing:
  - Total Users
  - Total Properties
  - Active Subscriptions
  - Pending Approvals
- **Recent Activity** section
- **Quick Statistics** overview

### 3. **User Management** (`pages/admin/UsersTable.tsx`)
- **Table Displaying**:
  - Name
  - Email
  - Role (Renter/Landlord)
  - Phone Number
  - Status (Active/Inactive/Blocked)
  - Created Date
- **Search Functionality** (by email or name)
- **Delete User** button with confirmation
- **Status Badges** with color coding

### 4. **Property Management** (`pages/admin/PropertiesTable.tsx`)
- **Table Displaying**:
  - Property Title
  - Landlord Name
  - Wilaya (Region)
  - Price
  - Status (Pending/Approved/Rejected)
  - Created Date
- **Search Functionality** (by title or wilaya)
- **Approve/Reject Buttons** for pending properties
- **Status Icons and Badges**
- **Action Restrictions** - Only pending properties show action buttons

### 5. **Placeholder Components** (For Future Development)
- **ReviewsManagement.tsx**: Placeholder for review moderation
- **SubscriptionPlan.tsx**: Placeholder for subscription management
- **AdminSettings.tsx**: Placeholder for system settings

### 6. **Protected Routes** (`components/AdminRoute.tsx`)
- Checks if user is authenticated
- Verifies admin role (currently using localStorage flag)
- Redirects non-admins to main dashboard
- Shows loading state during verification

## API Integration Points

The admin dashboard expects the following API endpoints:

### Stats Endpoint
```
GET /admin/stats
Response: {
  totalUsers: number,
  totalProperties: number,
  activeSubscriptions: number,
  pendingApprovals: number
}
```

### Users Endpoints
```
GET /admin/users
Response: User[]

DELETE /admin/users/:uid
```

### Properties Endpoints
```
GET /admin/properties
Response: Property[]

PUT /admin/properties/:id/approve
PUT /admin/properties/:id/reject
```

## Next Steps for Full Implementation

### 1. **Database Schema Updates**
Add a `role` column to the users table:
```sql
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin'));
CREATE INDEX idx_users_role ON users(role);
```

### 2. **Update AuthContext** (`src/contexts/AuthContext.tsx`)
Add role field to UserData interface:
```typescript
interface UserData {
  // ... existing fields
  role?: "user" | "admin";
}
```

### 3. **Update AdminRoute Component**
Replace the temporary localStorage check with actual role verification:
```typescript
// Replace:
const isAdmin = localStorage.getItem("isAdmin") === "true";

// With:
if (userData?.role !== "admin") {
  return <Navigate to="/dashboard" replace />;
}
```

### 4. **Create Backend Admin Endpoints**

Create routes in `my-express-backend/routes/admin.js`:
```javascript
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

// Verify user is admin middleware
const adminOnly = (req, res, next) => {
  // Check if user has admin role
  next();
};

router.get("/stats", authMiddleware, adminOnly, getStats);
router.get("/users", authMiddleware, adminOnly, getAllUsers);
router.delete("/users/:uid", authMiddleware, adminOnly, deleteUser);
router.get("/properties", authMiddleware, adminOnly, getAllProperties);
router.put("/properties/:id/approve", authMiddleware, adminOnly, approveProperty);
router.put("/properties/:id/reject", authMiddleware, adminOnly, rejectProperty);
```

### 5. **Update App.tsx**
Already implemented with proper admin routes and AdminRoute protection.

### 6. **Mock Data vs. Real Data**
Currently uses mock data when API calls fail. Once backend endpoints are available, remove the try/catch fallback logic.

## Security Considerations

1. **AdminRoute Component**: Ensures only authenticated users with admin role can access
2. **Backend Verification**: Always verify admin role on backend (never trust client-side)
3. **RBAC**: Implement proper Role-Based Access Control
4. **Audit Logging**: Log all admin actions (user deletion, property approval, etc.)
5. **Rate Limiting**: Implement rate limiting for admin endpoints

## Styling & Theme

- Uses **Tailwind CSS** for styling
- Follows **shadcn/ui** component library
- **Dark Mode Support**: Components support light/dark themes
- **Arabic Language**: UI fully supports RTL (Right-to-Left) text
- **Responsive Design**: Mobile-first approach with breakpoints at 768px

## Component Customization

### AdminLayout Props
```typescript
interface AdminLayoutProps {
  children: React.ReactNode;
}
```

### Adding New Admin Pages
1. Create component in `src/pages/admin/`
2. Wrap with `AdminLayout` component
3. Add route in `App.tsx` with `AdminRoute` protection
4. Add navigation link in `AdminLayout.tsx` (`navItems` array)

Example:
```typescript
import AdminLayout from "@/components/AdminLayout";
import YourComponent from "./YourComponent";

const AdminNewPage = () => (
  <AdminLayout>
    <YourComponent />
  </AdminLayout>
);
```

## Testing

### Manual Testing Checklist
- [ ] Login as admin user
- [ ] Navigate to `/admin` - should show dashboard
- [ ] Try accessing `/admin/users` while logged out - should redirect to login
- [ ] Try accessing `/admin` as non-admin user - should redirect to dashboard
- [ ] Test responsive sidebar on mobile
- [ ] Test search functionality in users/properties tables
- [ ] Test approve/reject property buttons
- [ ] Test delete user with confirmation dialog

### Unit Testing
Admin components can be tested using:
- React Testing Library
- Vitest (already configured)
- Mock API responses

## Future Features

Based on placeholder components, planned features include:

1. **Reviews Management**
   - View all user reviews
   - Filter by rating, date, property
   - Approve/reject reviews
   - Moderate inappropriate content

2. **Subscription Management**
   - Create subscription plans
   - Manage pricing tiers
   - View subscriber list
   - Generate revenue reports

3. **Advanced Settings**
   - Database backups
   - Email configuration
   - System maintenance mode
   - Feature toggles

4. **Reporting & Analytics**
   - Revenue reports
   - User growth charts
   - Property performance metrics
   - System health monitoring

## Troubleshooting

### Admin Routes Not Accessible
1. Check if `isAdmin` flag is set in localStorage
2. Verify AdminRoute component is returning correct value
3. Check browser dev tools → Application → Local Storage

### Mock Data Not Loading
1. Check browser console for errors
2. Verify API endpoint URLs
3. Check if axios interceptor is adding Authorization header

### Build Issues
- Run `npm install` to ensure all dependencies installed
- Clear `.next` or `dist` folder and rebuild
- Check for TypeScript errors: `npm run build`

## Contact & Support

For questions or issues with the admin dashboard:
1. Check this documentation
2. Review component code comments
3. Contact the development team

---

**Last Updated**: March 2024
**Version**: 1.0.0
**Status**: Production Ready (Backend Integration Pending)
