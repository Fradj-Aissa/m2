import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Users,
  Building2,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { userData, logout } = useAuth();

  const navItems = [
    {
      label: "لوحة التحكم",
      icon: BarChart3,
      path: "/admin",
    },
    {
      label: "المستخدمون",
      icon: Users,
      path: "/admin/users",
    },
    {
      label: "العقارات",
      icon: Building2,
      path: "/admin/properties",
    },
    {
      label: "المراجعات",
      icon: MessageSquare,
      path: "/admin/reviews",
    },
    {
      label: "الاشتراكات",
      icon: CreditCard,
      path: "/admin/subscriptions",
    },
    {
      label: "توثيق الملاك",
      icon: ShieldCheck,
      path: "/admin/verifications",
    },
    {
      label: "الإعدادات",
      icon: Settings,
      path: "/admin/settings",
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-card border-l border-border transition-all duration-300 overflow-y-auto md:w-64 md:static fixed top-0 left-0 h-screen z-40 shadow-lg`}
      >
        {/* Logo / Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-border flex-shrink-0">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground hidden md:block">
            SmartRent
          </h1>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => {
                  navigate(item.path);
                  // Close sidebar on mobile after click
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border bg-card flex-shrink-0">
          <div className="text-xs font-medium text-muted-foreground mb-3">
            مسؤول النظام
          </div>
          <div className="text-sm font-medium text-foreground mb-2 truncate">
            {userData?.name}
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive text-xs"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
            <h2 className="text-lg font-semibold text-foreground">
              لوحة إدارة SmartRent
            </h2>
          </div>

          {/* User Profile / Notifications */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {userData?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto pb-8">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
