import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Home,
  Building2,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, setAuthInfo } = useAuth();
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    userType: "renter" as "renter" | "landlord",
  });

  const handleGoogleRegister = async (
    credentialResponse: CredentialResponse
  ) => {
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/google`,
        {
          idToken: credentialResponse.credential,
          mode: "register",
          account_type: formData.userType,
        }
      );

      if (res.data.token && res.data.user) {
        const { token, user, isNewUser } = res.data;
        setAuthInfo({ token, user, isAuthenticated: true });
        localStorage.setItem("token", token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        if (!isNewUser) {
          // Existing user logging in via Google
          toast({
            title: "أهلاً بعودتك!",
            description: "جاري التوجيه إلى الصفحة الرئيسية...",
          });
          setTimeout(() => navigate("/"), 1500);
        } else {
          // New user - needs to complete profile
          toast({
            title: "تم إنشاء الحساب بنجاح",
            description: res.data.message || "مرحباً بك في اجرلي",
          });
          const destination = res.data.requiresCompleteProfile
            ? "/complete-profile"
            : "/welcome";
          navigate(destination);
        }
      } else {
        throw new Error("Google registration failed, please try again.");
      }
    } catch (error: any) {
      console.error("Google registration error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred during Google registration.";
      toast({
        title: "خطأ في التسجيل عبر جوجل",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمتا المرور غير متطابقتين",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use FormData to support optional profile image
      const payload = new FormData();
      payload.append("email", formData.email);
      payload.append("password", formData.password);
      payload.append("name", formData.name);
      payload.append("phone", formData.phone);
      payload.append("account_type", formData.userType);
      if (profileFile) {
        payload.append("image", profileFile, profileFile.name);
      }

      const res = await axios.post(`${API_BASE_URL}/auth/register`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { token, user } = res.data;
      if (token && user) {
        setAuthInfo({ token, user, isAuthenticated: true });
        toast({ title: "تم إنشاء الحساب بنجاح", description: "مرحباً بك في اجرلي" });
        navigate("/dashboard");
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "حدث خطأ أثناء إنشاء الحساب";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setProfileFile(file);
      const url = URL.createObjectURL(file);
      setProfilePreview(url);
    } else {
      setProfileFile(null);
      setProfilePreview(null);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] bg-cover bg-center opacity-20" />
        <div className="relative h-full flex items-center justify-center p-12">
          <div className="text-center text-primary-foreground max-w-md">
            <h2 className="text-3xl font-bold mb-4">انضم إلى اجرلي</h2>
            <p className="text-primary-foreground/80 text-lg">
              سواء كنت تبحث عن شقة أو تريد تأجير شقتك، اجرلي يوفر لك الحل الأمثل
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
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
            <h1 className="text-2xl md:text-3xl font-bold">إنشاء حساب جديد</h1>
            <p className="text-muted-foreground mt-2">
              أنشئ حسابك للبدء في استخدام المنصة
            </p>
          </div>

          {/* Avatar Upload - Premium Top Section */}
          <div className="flex flex-col items-center py-6 px-4 bg-gradient-to-b from-muted to-transparent rounded-xl">
            {/* Hidden file input */}
            <input
              id="profile-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Circular Avatar Container */}
            <div className="relative group mb-3">
              {/* Glowing Background Circle */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Avatar Circle */}
              <label
                htmlFor="profile-upload"
                className="relative w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer shadow-lg border-2 border-primary/30 group-hover:border-primary/60 transition-all duration-300"
              >
                {profilePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePreview}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/10">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* Camera Icon Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Camera className="h-6 w-6 text-primary-foreground" />
                </div>
              </label>
            </div>

            {/* Label */}
            <p className="text-sm text-muted-foreground">
              صورة الملف الشخصي <span className="text-xs">(اختياري)</span>
            </p>
          </div>

          {/* User Type Selection */}
          <div className="space-y-3">
            <Label>نوع الحساب</Label>
            <RadioGroup
              value={formData.userType}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  userType: value as "renter" | "landlord",
                })
              }
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="renter"
                  id="renter"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="renter"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <User className="mb-2 h-6 w-6" />
                  <span className="font-medium">مستأجر</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    أبحث عن شقة
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="landlord"
                  id="landlord"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="landlord"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Building2 className="mb-2 h-6 w-6" />
                  <span className="font-medium">مؤجّر</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    أعرض شققي
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="محمد أحمد"
                  className="pr-10"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
            </div>

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
              <Label htmlFor="phone">رقم الهاتف</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0555 123 456"
                  className="pr-10"
                  dir="ltr"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pr-10"
                  dir="ltr"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-hero hover:opacity-90"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
            </Button>
          </form>

          {formData.userType === "landlord" && (
            <p className="text-sm text-muted-foreground text-center bg-muted p-3 rounded-lg">
              💡 كمؤجّر، ستحتاج إلى اشتراك لنشر شققك.{" "}
              <Link
                to="/subscription"
                className="text-primary hover:underline"
              >
                تعرف على الباقات
              </Link>
            </p>
          )}

          <Separator />
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleRegister}
              onError={() => {
                toast({
                  title: "خطأ",
                  description: "فشل التسجيل عبر جوجل. حاول مرة أخرى",
                  variant: "destructive",
                });
              }}
            />
          </div>
          <Separator />

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟{" "}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
