import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminGate from "@/components/admin/AdminGate";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * AdminRoute - Protects admin routes
 * Only allows access if user is authenticated and has admin role.
 * If logged in but not admin, shows the AdminGate for verification.
 */
const AdminRoute = ({ children }: AdminRouteProps) => {
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground mr-3">جاري التحقق...</p>
      </div>
    );
  }

  // Check if user is authenticated
  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is admin
  const isAdmin = userData.role === "admin";

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-muted/30">
          <AdminGate />
        </main>
        <Footer />
      </div>
    );
  }

  return <>{children}</>;
};

import { Loader2 } from "lucide-react";

export default AdminRoute;
