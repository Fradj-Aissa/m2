import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Bell, Trash2, Save, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import AvatarUpload from "@/components/AvatarUpload";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiPut, apiPost, apiDelete } from "@/lib/api";

const Settings = () => {
  const { toast } = useToast();
  const { currentUser, userData, logout, updateUserAvatar } = useAuth();
  const navigate = useNavigate();
  // Detect Google-only accounts: they have no password set in the DB.
  // The backend now allows deletion without a password for these accounts.
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
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-muted/30">
        <div className="container py-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-8">الإعدادات</h1>

          <div className="bg-card rounded-xl border">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
                <TabsTrigger
                  value="profile"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-4 px-6"
                >
                  <User className="h-4 w-4 ml-2" />
                  الملف الشخصي
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-4 px-6"
                >
                  <Lock className="h-4 w-4 ml-2" />
                  الأمان
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-4 px-6"
                >
                  <Bell className="h-4 w-4 ml-2" />
                  الإشعارات
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="p-6">
                <div className="max-w-2xl space-y-8">
                  {/* Avatar Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">صورة الملف الشخصي</h3>
                    <AvatarUpload
                      currentImage={currentAvatar}
                      userId={currentUser?.uid || ""}
                      onUploadSuccess={handleAvatarUploadSuccess}
                    />
                  </div>

                  <Separator />

                  {/* Profile Information Section */}
                  <div className="space-y-6">
                    <h3 className="font-semibold text-lg">المعلومات الشخصية</h3>

                    <div className="space-y-2">
                      <Label htmlFor="name">الاسم الكامل</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="أدخل اسمك الكامل"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        لا يمكن تغيير البريد الإلكتروني المرتبط بحسابك
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الهاتف</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="0XX XXX XXXX"
                      />
                      <p className="text-xs text-muted-foreground">
                        أرقام جزائرية: يجب أن تبدأ بـ 05 أو 06 أو 07
                      </p>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={isLoading} className="gap-2">
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          حفظ التغييرات
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="p-6">
                <div className="max-w-2xl space-y-8">
                  {/* Change Password Section */}
                  <div className="space-y-6">
                    <h3 className="font-semibold text-lg">تغيير كلمة المرور</h3>

                    <div className="space-y-2">
                      <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="أدخل كلمة المرور الحالية"
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, currentPassword: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="أدخل كلمة المرور الجديدة"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, newPassword: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="أعد إدخال كلمة المرور الجديدة"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button onClick={handleChangePassword} disabled={isLoading} className="gap-2">
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري التحديث...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          تحديث كلمة المرور
                        </>
                      )}
                    </Button>
                  </div>

                  <Separator />

                  {/* Delete Account Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-destructive">حذف الحساب</h3>
                    <p className="text-sm text-muted-foreground">
                      سيتم حذف حسابك وجميع بياناتك بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
                    </p>

                    <DeleteAccountDialog
                      onConfirm={handleDeleteAccount}
                      isLoading={isDeleting}
                      isGoogleUser={isGoogleOnlyUser}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="p-6">
                <div className="max-w-md space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">طريقة الإشعارات</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">البريد الإلكتروني</p>
                        <p className="text-sm text-muted-foreground">استلام الإشعارات عبر البريد</p>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, email: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">الرسائل النصية</p>
                        <p className="text-sm text-muted-foreground">استلام الإشعارات عبر SMS</p>
                      </div>
                      <Switch
                        checked={notifications.sms}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, sms: checked })
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold">نوع الإشعارات</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">شقق جديدة</p>
                        <p className="text-sm text-muted-foreground">
                          إشعار عند إضافة شقق جديدة في منطقتك
                        </p>
                      </div>
                      <Switch
                        checked={notifications.newApartments}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, newApartments: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">تغييرات الأسعار</p>
                        <p className="text-sm text-muted-foreground">
                          إشعار عند تغيير أسعار الشقق المحفوظة
                        </p>
                      </div>
                      <Switch
                        checked={notifications.priceChanges}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, priceChanges: checked })
                        }
                      />
                    </div>
                  </div>

                  <Button onClick={() => {}} disabled={isLoading} className="gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
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
        <Button variant="destructive" disabled={isLoading} className="gap-2">
          <Trash2 className="h-4 w-4" />
          حذف الحساب
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>هل أنت متأكد من حذف حسابك؟</AlertDialogTitle>
          <AlertDialogDescription>
            هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف جميع بيانات حسابك وشقتك من الخادم.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isGoogleUser ? (
          /* Google-only users: no password needed, just show a warning */
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-400">
            حسابك مرتبط بـ Google فقط. لا تحتاج إلى كلمة مرور لتأكيد الحذف.
          </div>
        ) : (
          /* Email/password users: must enter password */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة المرور الخاصة بك"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isLoading}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                جاري الحذف...
              </>
            ) : (
              "حذف نهائياً"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default Settings;
