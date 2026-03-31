import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface CompleteProfileResponse {
  message: string;
  user: {
    uid: string;
    email: string;
    name: string;
    phone: string;
    type?: string;
    account_type?: string;
    created_at?: string;
  };
  requiresCompleteProfile: boolean;
}

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData, setAuthInfo } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect existing users away from profile completion
  useEffect(() => {
    if (userData?.phone && userData?.type) {
      // User already has complete profile, redirect to dashboard
      navigate("/dashboard", { replace: true });
    }
  }, [userData, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone && !password) {
      toast({
        title: "مطلوب",
        description: "الرجاء إدخال رقم الهاتف أو كلمة المرور لإنهاء الملف الشخصي.",
        variant: "destructive",
      });
      return;
    }

    if (password && password.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
        variant: "destructive",
      });
      return;
    }

    if (password && password !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمتا المرور غير متطابقتين.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await apiPost<CompleteProfileResponse>(
        "/auth/complete-profile",
        {
          phone: phone || undefined,
          password: password || undefined,
          account_type: userData?.type === "landlord" ? "owner" : "renter",
        }
      );

      if (token && response.user) {
        const user = {
          uid: response.user.uid,
          email: response.user.email,
          name: response.user.name,
          phone: response.user.phone,
          type: response.user.type || (response.user.account_type === "owner" ? "landlord" : "renter") || "renter",
          created_at: response.user.created_at,
        };
        setAuthInfo({ token, user, isAuthenticated: true });
      }

      toast({
        title: "تم استكمال الملف الشخصي",
        description: response.message || "تم حفظ بياناتك بنجاح.",
      });
      navigate("/dashboard");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء إكمال الملف الشخصي.";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/40 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto rounded-3xl border bg-card p-10 shadow-lg">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold">أكمل بيانات حسابك</h1>
              <p className="mt-3 text-muted-foreground">
                أضف رقم الهاتف و/أو كلمة المرور لتفعيل جميع ميزات الحساب
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="complete_profile_phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="pr-10"
                    autoComplete="tel-national"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="complete_profile_password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "إخفاء" : "عرض"}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <Input
                  id="complete_profile_confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "جاري المتابعة..." : "Continue"}
              </Button>

              <Separator />

              <div className="text-center text-sm text-muted-foreground">
                يمكنك الرجوع إلى <span className="font-medium">الإعدادات</span> في أي وقت من لوحة التحكم.
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CompleteProfile;
