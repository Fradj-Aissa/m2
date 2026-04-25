import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * AdminRoute - Protects admin routes
 * Only allows access if user is authenticated and has admin role
 *
 * Note: You'll need to:
 * 1. Add a 'role' or 'is_admin' field to the UserData interface in AuthContext.tsx
 * 2. Add a 'role' column to the users table in the database
 * 3. Update backend endpoints to return the role field
 */
const AdminRoute = ({ children }: AdminRouteProps) => {
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">جاري التحقق...</p>
      </div>
    );
  }

  // Check if user is authenticated
  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is admin (currently checking for a mock condition)
  // TODO: Once role field is added to UserData, change this check to:
  // if (userData.role !== "admin") {
  const isAdmin = localStorage.getItem("isAdmin") === "true"; // Temporary implementation

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
