import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Heart, User, Menu, X, LogOut, Building2, Settings } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
            <Home className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-primary">اجرلي</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/search"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            تصفح الشقق
          </Link>
          <Link
            to="/favorites"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            المفضلة
          </Link>
          <Link
            to="/subscription"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            الاشتراكات
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild>
            <Link to="/favorites">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>

          {currentUser ? <NotificationBell /> : null}

          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  {userData?.profile_image || userData?.avatar ? (
                    <img
                      src={userData.profile_image || userData.avatar}
                      alt={userData?.name || "مستخدم"}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-xs font-bold text-primary">
                        {userData?.name?.charAt(0) || "م"}
                      </span>
                    </div>
                  )}
                  <span className="max-w-24 truncate">{userData?.name || "مستخدم"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    لوحة التحكم
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/favorites" className="flex items-center gap-2 cursor-pointer">
                    <Heart className="h-4 w-4" />
                    المفضلة
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    الإعدادات
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 cursor-pointer text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link to="/login">تسجيل الدخول</Link>
              </Button>
              <Button asChild>
                <Link to="/register">إنشاء حساب</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          {currentUser ? <NotificationBell /> : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t bg-card animate-fade-in">
          <nav className="container py-4 flex flex-col gap-2">
            <Link
              to="/search"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <Home className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">تصفح الشقق</span>
            </Link>
            <Link
              to="/favorites"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <Heart className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">المفضلة</span>
            </Link>

            {currentUser ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">لوحة التحكم</span>
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">الإعدادات</span>
                </Link>
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-right text-destructive transition-colors hover:bg-muted"
                  onClick={() => {
                    void handleLogout();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">تسجيل الخروج</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">تسجيل الدخول</span>
                </Link>
                <div className="pt-2 px-4">
                  <Button className="w-full" asChild>
                    <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                      إنشاء حساب
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
