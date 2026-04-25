import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * AdminRoute - Protects admin routes
 * Only allows access if user is authenticated and has admin role
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

  // Check if user is admin - case insensitive comparison
  const isAdmin = userData.role && userData.role.toLowerCase() === "admin";

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
