import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Bell, Trash2, Save, Eye, EyeOff, Loader2, Camera, Upload, UploadCloud, X, ShieldCheck, Clock3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiPut, apiPost, apiDelete, apiPatch } from "@/lib/api";
import { uploadIdCard } from "@/services/subscriptionService";

const Settings = () => {
  const { toast } = useToast();
  const { currentUser, userData, logout, updateUserAvatar, refreshUserData } = useAuth();
  const navigate = useNavigate();
  
  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [isUploadingIdCard, setIsUploadingIdCard] = useState(false);
  
  // Google-only accounts: they have no password set in the DB.
  const isGoogleOnlyUser = !!(userData && (userData as any).google_id && !(userData as any).has_password);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    newApartments: true,
    priceChanges: true,
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const isOwner =
    userData?.role === "owner" ||
    userData?.account_type === "owner" ||
    userData?.type === "landlord" ||
    userData?.account_type === "landlord";

  const isTenant =
    userData?.role === "tenant" ||
    userData?.type === "renter" ||
    userData?.account_type === "renter" ||
    (!userData?.role && !userData?.type && !userData?.account_type);

  const isPremiumTenant = isTenant && !!userData?.is_premium;
  const showVerificationSection = isOwner || isPremiumTenant;
  const verificationStatus = userData?.verification_status || "unverified";

  useEffect(() => {
    const init = async () => {
      try {
        if (refreshUserData) {
          await refreshUserData();
        }
      } catch (error) {
        console.error("Mount refresh error:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    void init();
  }, []);

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
      });
    }
  }, [userData]);

  /**
   * Validate Algerian phone number
   */
  const isValidAlgerianPhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    const algerianPhoneRegex = /^(?:\+213|0)[5-7]\d{8}$/;
    return algerianPhoneRegex.test(cleanPhone);
  };

  /**
   * Handle avatar file selection
   */
  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن لا يتجاوز 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "خطأ",
        description: "يجب أن تكون الملف صورة",
        variant: "destructive",
      });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Upload avatar to backend
   */
  const handleUploadAvatar = async () => {
    if (!avatarFile || !currentUser) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("image", avatarFile);

      const response = await apiPatch(`/users/${currentUser.uid}/avatar`, formData);
      const imageUrl = response.imageUrl || response.user?.profile_image;

      if (imageUrl) {
        updateUserAvatar(imageUrl);
        setAvatarPreview(null);
        setAvatarFile(null);
        if (avatarInputRef.current) {
          avatarInputRef.current.value = "";
        }
        toast({
          title: "نجح",
          description: "تم تحميل الصورة بنجاح",
        });
      }
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        title: "خطأ",
        description: error.response?.data?.error || "حدث خطأ أثناء تحميل الصورة",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  /**
   * Cancel avatar preview
   */
  const handleCancelAvatarPreview = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handleUploadIdCard = async () => {
    if (!idCardFile) {
      toast({
        title: "اختر صورة الهوية أولًا",
        description: "ارفع صورة واضحة لبطاقة الهوية قبل إرسال الطلب.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingIdCard(true);
    try {
      await uploadIdCard(idCardFile);
      await refreshUserData();
      setIdCardFile(null);
      toast({
        title: "تم إرسال وثيقة الهوية",
        description: "طلب التوثيق الآن قيد المراجعة من إدارة SmartRentDZ.",
      });
    } catch (error: any) {
      console.error("ID upload error:", error);
      toast({
        title: "فشل رفع وثيقة الهوية",
        description: error?.response?.data?.error || "تعذر إرسال الوثيقة الآن.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingIdCard(false);
    }
  };

  /**
   * Save profile changes to backend
   */
  const handleSaveProfile = async () => {
    if (!currentUser) return;

    if (formData.phone && !isValidAlgerianPhone(formData.phone)) {
      toast({
        title: "خطأ في رقم الهاتف",
        description: "يجب أن يبدأ رقم الهاتف بـ 05 أو 06 أو 07 ويحتوي على 10 أرقام",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiPut(`/users/${currentUser.uid}`, {
        name: formData.name,
        phone: formData.phone,
      });
      toast({
        title: "تم الحفظ",
        description: "تم حفظ التغييرات بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.error || "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Change password
   */
  const handleChangePassword = async () => {
    if (!currentUser) return;

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع حقول كلمة المرور",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "خطأ",
        description: "يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمات المرور الجديدة غير متطابقة",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiPost("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      toast({
        title: "نجح",
        description: "تم تغيير كلمة المرور بنجاح",
      });

      // Clear password fields
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.error || "حدث خطأ أثناء تغيير كلمة المرور",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete user account
   */
  const handleDeleteAccount = async (password: string) => {
    if (!currentUser) return;
    // Google-only users don't need a password, but email/password users do.
    if (!isGoogleOnlyUser && !password) return;

    setIsDeleting(true);
    try {
      await apiDelete("/auth/account", {
        data: password ? { password } : {},
      });

      toast({
        title: "تم حذف الحساب",
        description: "سيتم تسجيل خروجك الآن",
      });

      // Full storage wipe — belt-and-suspenders cleanup before logout
      localStorage.clear();
      sessionStorage.clear();
      await logout();
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.error || "حدث خطأ أثناء حذف الحساب",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle avatar upload success
   */
  const handleAvatarUploadSuccess = (imageUrl: string) => {
    updateUserAvatar(imageUrl);
  };

  const currentAvatar = userData?.profile_image || userData?.avatar || "";

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Header />

      <main className="flex-1 bg-gradient-to-b from-background to-muted/20" dir="rtl">
        <div className="container py-12" dir="rtl">
          {/* Page Header */}
          <div className="mb-12 text-right">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">الإعدادات</h1>
            <p className="text-muted-foreground text-lg">إدارة حسابك والتفضيلات الخاصة بك</p>
          </div>

          {/* Tabs Card */}
          <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden" dir="rtl">
            <Tabs defaultValue="profile" className="w-full" dir="rtl">
              <TabsList className="w-full justify-start border-b border-border rounded-none h-auto p-0 bg-muted/30" dir="rtl">
                <TabsTrigger
                  value="profile"
                  className="rounded-none border-l-2 border-transparent data-[state=active]:border-primary py-5 px-8 font-semibold text-base"
                >
                  <User className="h-5 w-5 mr-3" />
                  الملف الشخصي
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="rounded-none border-l-2 border-transparent data-[state=active]:border-primary py-5 px-8 font-semibold text-base"
                >
                  <Lock className="h-5 w-5 mr-3" />
                  الأمان
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="rounded-none border-l-2 border-transparent data-[state=active]:border-primary py-5 px-8 font-semibold text-base"
                >
                  <Bell className="h-5 w-5 mr-3" />
                  الإشعارات
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="p-8 space-y-8 text-right">
                {/* Avatar Section with Premium Style */}
                <div className="flex flex-col items-center py-12 px-6 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent rounded-2xl border border-primary/10" dir="rtl">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                    aria-label="تحميل الصورة الشخصية"
                  />

                  {/* Avatar Circle with Glowing Border */}
                  <div className="relative group mb-6">
                    {/* Outer Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary/15 to-primary/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Avatar Container */}
                    <div className="relative w-40 h-40 rounded-full bg-muted border-4 border-primary/20 group-hover:border-primary/50 flex items-center justify-center overflow-hidden transition-all duration-300 shadow-xl cursor-pointer">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="معاينة الصورة"
                          className="w-full h-full object-cover"
                        />
                      ) : currentAvatar ? (
                        <img
                          src={currentAvatar}
                          alt="صورة المستخدم"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-16 w-16 text-muted-foreground" />
                      )}
                      
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                      )}

                      {/* Camera Icon Overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Label */}
                  <p className="text-center text-foreground font-semibold text-lg mb-6">صورة الملف الشخصي</p>

                  {/* Buttons */}
                  <div className="flex gap-3 flex-wrap justify-center">
                    <Button
                      onClick={() => avatarInputRef.current?.click()}
                      variant="outline"
                      size="lg"
                      disabled={isUploadingAvatar}
                      className="gap-2 font-semibold"
                    >
                      <Upload className="h-5 w-5" />
                      اختيار صورة
                    </Button>

                    {avatarPreview && (
                      <>
                        <Button
                          onClick={handleUploadAvatar}
                          size="lg"
                          disabled={isUploadingAvatar}
                          className="gap-2 font-semibold bg-gradient-hero hover:opacity-90"
                        >
                          {isUploadingAvatar ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              جاري التحميل...
                            </>
                          ) : (
                            <>
                              <Upload className="h-5 w-5" />
                              تحميل الصورة
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleCancelAvatarPreview}
                          variant="outline"
                          size="lg"
                          disabled={isUploadingAvatar}
                          className="gap-2 font-semibold"
                        >
                          <X className="h-5 w-5" />
                          إلغاء
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Help Text */}
                  <p className="text-sm text-muted-foreground mt-6 text-center">
                    الحد الأقصى 5MB • الصيغ المدعومة: JPG, PNG, GIF, WebP
                  </p>
                </div>

                <Separator className="my-4" />

                {/* Profile Information Section */}
                <div className="space-y-8">
                  <h3 className="text-2xl font-bold text-foreground text-right">المعلومات الشخصية</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-base font-semibold text-right">الاسم الكامل</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="أدخل اسمك الكامل"
                        className="h-12 text-base rounded-xl border-border text-right"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-base font-semibold text-right">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="h-12 text-base bg-muted/50 border-border rounded-xl text-muted-foreground cursor-not-allowed text-right"
                      />
                      <p className="text-xs text-muted-foreground text-right">لا يمكن تغيير البريد الإلكتروني المرتبط بحسابك</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-base font-semibold text-right">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0XX XXX XXXX"
                      className="h-12 text-base rounded-xl border-border text-right"
                    />
                    <p className="text-xs text-muted-foreground text-right">أرقام جزائرية: يجب أن تبدأ بـ 05 أو 06 أو 07 وتحتوي على 10 أرقام</p>
                  </div>

                  {isInitialLoading ? (
                    <Card className="border-border bg-card p-6 flex flex-col items-center justify-center min-h-[200px]">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground mt-4">جاري تحميل بيانات التوثيق...</p>
                    </Card>
                  ) : showVerificationSection ? (
                    <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-background to-sky-50/70 dark:border-emerald-950/60 dark:from-emerald-950/20 dark:to-slate-950">
                      <CardHeader className="space-y-2">
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <ShieldCheck className="h-5 w-5 text-emerald-600" />
                          توثيق الهوية
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {isOwner
                            ? "توثيق هوية المالك يضيف شارة ثقة لملفك الشخصي ويطمئن المستأجرين عند تصفح عقاراتك."
                            : "توثيق هوية المستأجر يمنحك شارة مستأجر موثّق لزيادة فرص قبول طلبات تأجيرك من الملاك."}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {verificationStatus === "verified" ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                            <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="h-5 w-5" />
                              حساب موثق
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {isOwner
                                ? "شارة التوثيق تظهر الآن بجانب اسمك في تفاصيل العقارات لزيادة ثقة المستأجرين."
                                : "شارة مستأجر موثّق تظهر الآن على ملفك الشخصي لزيادة فرص قبولك من قبل الملاك."}
                            </p>
                          </div>
                        ) : null}

                        {verificationStatus === "pending" ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                            <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
                              <Clock3 className="h-5 w-5" />
                              الطلب قيد المراجعة
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              استلمنا وثيقتك، وسيتم إشعارك فور انتهاء المراجعة من الإدارة.
                            </p>
                          </div>
                        ) : null}

                        {verificationStatus === "rejected" ? (
                          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                            <div className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                              <AlertTriangle className="h-5 w-5" />
                              تم رفض التوثيق السابق
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              السبب: {userData?.rejection_reason || "لم يتم توضيح السبب من الإدارة."}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              يمكنك إعادة رفع وثيقة أوضح من نفس القسم.
                            </p>
                          </div>
                        ) : null}

                        {(verificationStatus === "unverified" || verificationStatus === "rejected") ? (
                          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                            <Label htmlFor="id-card-upload" className="text-base font-semibold">
                              رفع صورة الهوية
                            </Label>
                            <Input
                              id="id-card-upload"
                              type="file"
                              accept="image/*"
                              onChange={(event) => setIdCardFile(event.target.files?.[0] || null)}
                            />
                            <p className="text-xs text-muted-foreground">
                              ارفع صورة واضحة ومقروءة لبطاقة الهوية الوطنية أو أي وثيقة رسمية معتمدة.
                            </p>
                            <Button
                              onClick={handleUploadIdCard}
                              disabled={isUploadingIdCard || !idCardFile}
                              className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                            >
                              {isUploadingIdCard ? (
                                <>
                                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                  جاري الإرسال...
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="ml-2 h-4 w-4" />
                                  إرسال طلب التوثيق
                                </>
                              )}
                            </Button>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/5 relative overflow-hidden rounded-2xl p-6 shadow-sm text-right">
                      <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
                      <div className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-yellow-400/10 blur-2xl" />
                      
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="space-y-2 text-right flex-1 w-full">
                          <div className="flex items-center justify-start gap-2 flex-wrap">
                            <ShieldCheck className="h-6 w-6 text-amber-500" />
                            <h4 className="text-xl font-bold text-foreground">توثيق الهوية والحساب</h4>
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-0 text-xs px-2 py-0.5 font-semibold">
                              ميزة Premium
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                            تتيح لك هذه الميزة إرسال وثيقة هويتك للحصول على شارة **"مستأجر موثّق"** الزرقاء، مما يزيد ثقة الملاك بك ويسرّع قبول طلبات الإيجار الخاصة بك بنسبة 85%. هذه الميزة متاحة فقط للأعضاء المميزين.
                          </p>
                        </div>
                        
                        <Button 
                          onClick={() => navigate("/subscription")}
                          className="bg-gradient-hero text-white font-semibold shadow-lg hover:opacity-90 transition-all duration-300 w-full md:w-auto px-6 h-12 rounded-xl"
                        >
                          اشترك في Premium للتفعيل
                        </Button>
                      </div>
                    </Card>
                  )}

                  <Button onClick={handleSaveProfile} disabled={isLoading} size="lg" className="gap-2 font-semibold w-full sm:w-auto bg-gradient-hero hover:opacity-90">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        حفظ التغييرات
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="p-8 space-y-8 text-right">
                {/* Change Password Section */}
                <div className="bg-muted/30 rounded-2xl border border-border p-8 space-y-8">
                  <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <Lock className="h-6 w-6 text-primary" />
                    تغيير كلمة المرور
                  </h3>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="current-password" className="text-base font-semibold">كلمة المرور الحالية</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="أدخل كلمة المرور الحالية"
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, currentPassword: e.target.value })
                          }
                          className="h-12 text-base pl-12 rounded-xl border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="new-password" className="text-base font-semibold">كلمة المرور الجديدة</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="أدخل كلمة المرور الجديدة"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, newPassword: e.target.value })
                          }
                          className="h-12 text-base pl-12 rounded-xl border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="confirm-password" className="text-base font-semibold">تأكيد كلمة المرور</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="أعد إدخال كلمة المرور الجديدة"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                          }
                          className="h-12 text-base pl-12 rounded-xl border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleChangePassword} disabled={isLoading} size="lg" className="gap-2 font-semibold w-full bg-gradient-hero hover:opacity-90">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        جاري التحديث...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        تحديث كلمة المرور
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                {/* Delete Account Section */}
                <div className="bg-destructive/10 rounded-2xl border border-destructive/20 p-8 space-y-6">
                  <h3 className="text-2xl font-bold text-destructive flex items-center gap-3">
                    <Trash2 className="h-6 w-6" />
                    منطقة الخطر
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    حذف حسابك سيؤدي إلى إزالة جميع بيانات حسابك وإعلاناتك بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
                  </p>

                  <DeleteAccountDialog
                    onConfirm={handleDeleteAccount}
                    isLoading={isDeleting}
                    isGoogleUser={isGoogleOnlyUser}
                  />
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="p-8 text-right">
                <div className="max-w-2xl space-y-8">
                  {/* Notification Methods */}
                  <div className="bg-muted/30 rounded-2xl border border-border p-8 space-y-6">
                    <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
                      <Bell className="h-6 w-6 text-primary" />
                      طريقة الإشعارات
                    </h3>

                    <div className="space-y-4">
                      {/* Email Notifications */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-colors">
                        <div>
                          <p className="font-semibold text-foreground">البريد الإلكتروني</p>
                          <p className="text-sm text-muted-foreground">استقبل الإشعارات عبر بريدك الإلكتروني</p>
                        </div>
                        <Switch
                          checked={notifications.email}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, email: checked })
                          }
                        />
                      </div>

                      {/* SMS Notifications */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-colors">
                        <div>
                          <p className="font-semibold text-foreground">الرسائل النصية</p>
                          <p className="text-sm text-muted-foreground">استقبل الإشعارات عبر رسائل SMS</p>
                        </div>
                        <Switch
                          checked={notifications.sms}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, sms: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Notification Types */}
                  <div className="bg-muted/30 rounded-2xl border border-border p-8 space-y-6">
                    <h3 className="text-2xl font-bold text-foreground">نوع الإشعارات</h3>

                    <div className="space-y-4">
                      {/* New Apartments */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-colors">
                        <div>
                          <p className="font-semibold text-foreground">شقق جديدة</p>
                          <p className="text-sm text-muted-foreground">إشعار عند إضافة شقق جديدة في المناطق المفضلة</p>
                        </div>
                        <Switch
                          checked={notifications.newApartments}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, newApartments: checked })
                          }
                        />
                      </div>

                      {/* Price Changes */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-colors">
                        <div>
                          <p className="font-semibold text-foreground">تغييرات الأسعار</p>
                          <p className="text-sm text-muted-foreground">إشعار عند تغيير أسعار الشقق المحفوظة</p>
                        </div>
                        <Switch
                          checked={notifications.priceChanges}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, priceChanges: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={() => {}} disabled={isLoading} size="lg" className="gap-2 font-semibold w-full bg-gradient-hero hover:opacity-90">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        حفظ التفضيلات
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

/**
 * Delete Account Dialog Component
 */
const DeleteAccountDialog = ({
  onConfirm,
  isLoading,
  isGoogleUser,
}: {
  onConfirm: (password: string) => void;
  isLoading: boolean;
  isGoogleUser: boolean;
}) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    if (isGoogleUser) {
      // Google-only accounts have no password — confirm directly
      onConfirm("");
    } else if (password) {
      onConfirm(password);
      setPassword("");
    }
  };

  // Confirm button is enabled when: Google user (no password needed) OR password entered
  const canConfirm = isGoogleUser ? true : !!password;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isLoading} size="lg" className="gap-2 font-semibold w-full">
          <Trash2 className="h-5 w-5" />
          حذف الحساب بشكل نهائي
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md" dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-right text-lg">هل أنت متأكد من حذف حسابك؟</AlertDialogTitle>
          <AlertDialogDescription className="text-right">
            هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف جميع بيانات حسابك وشقتك من الخادم.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isGoogleUser ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-400 text-right">
            حسابك مرتبط بـ Google فقط. لا تحتاج إلى كلمة مرور لتأكيد الحذف.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="delete-password" className="font-semibold">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة المرور الخاصة بك"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-base pl-12 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter className="gap-2 flex-row-reverse">
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري الحذف...
              </>
            ) : (
              "حذف نهائياً"
            )}
          </AlertDialogAction>
          <AlertDialogCancel disabled={isLoading} className="mr-2">إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default Settings;
