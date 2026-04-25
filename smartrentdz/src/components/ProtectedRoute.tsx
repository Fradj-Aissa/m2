import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredType?: "renter" | "landlord";
  requiredRole?: string; // e.g., "admin"
}

const ProtectedRoute = ({ children, requiredType, requiredRole }: ProtectedRouteProps) => {
  const { currentUser, userData, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check required user type (account type)
  if (requiredType && userData?.type !== requiredType) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check required role - case insensitive comparison
  if (requiredRole) {
    const userRole = userData?.role?.toLowerCase() || "";
    const requiredRoleLower = requiredRole.toLowerCase();
    
    if (userRole !== requiredRoleLower) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
