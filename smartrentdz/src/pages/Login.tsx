import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, setAuthInfo } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في اجرلي",
      });
      navigate("/dashboard");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تسجيل الدخول";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/google`,
        {
          idToken: credentialResponse.credential,
          mode: "login",
        }
      );

      if (res.data.token && res.data.user) {
        const { token, user } = res.data;
        setAuthInfo({ token, user, isAuthenticated: true });
        localStorage.setItem("token", token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "مرحباً بك في اجرلي",
        });
        navigate(res.data.requiresCompleteProfile ? "/complete-profile" : "/dashboard");
      } else {
        throw new Error("Google login failed, please try again.");
      }
    } catch (error: unknown) {
      console.error("Google login error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during Google login.";
      toast({
        title: "خطأ في تسجيل الدخول عبر جوجل",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 justify-center md:justify-start"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary">اجرلي</span>
          </Link>

          {/* Header */}
          <div className="text-center md:text-right">
            <h1 className="text-2xl md:text-3xl font-bold">تسجيل الدخول</h1>
            <p className="text-muted-foreground mt-2">
              أدخل بياناتك للوصول إلى حسابك
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  className="pr-10"
                  dir="ltr"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">كلمة المرور</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pr-10 pl-10"
                  dir="ltr"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-hero hover:opacity-90"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>

          <div className="flex flex-col items-center space-y-4">
            <Separator />
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => {
                toast({
                  title: "خطأ",
                  description: "فشل تسجيل الدخول عبر جوجل. حاول مرة أخرى",
                  variant: "destructive",
                });
              }}
              
            />
            <Separator />
          </div>

          {/* Register Link */}
          <p className="text-center text-sm text-muted-foreground">
            ليس لديك حساب؟{" "}
            <Link
              to="/register"
              className="text-primary font-medium hover:underline"
            >
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] bg-cover bg-center opacity-20" />
        <div className="relative h-full flex items-center justify-center p-12">
          <div className="text-center text-primary-foreground max-w-md">
            <h2 className="text-3xl font-bold mb-4">مرحباً بعودتك!</h2>
            <p className="text-primary-foreground/80 text-lg">
              ادخل إلى حسابك لإدارة شققك أو متابعة البحث عن السكن المثالي
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
