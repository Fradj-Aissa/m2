import { useState } from "react";
import { Lock, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/lib/api";

const AdminGate = () => {
  const { toast } = useToast();
  const { userData, refreshUserData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.uid) return;

    setIsLoading(true);
    try {
      await apiPost("/admin/secure-verify", {
        ...formData,
        uid: userData.uid,
      });

      toast({
        title: "تم التحقق بنجاح",
        description: "تمت ترقية حسابك إلى مسؤول بنجاح.",
      });

      // Refresh user data to update frontend state (role will now be 'admin')
      await refreshUserData();
    } catch (error: any) {
      toast({
        title: "خطأ في التحقق",
        description: error.message || "فشل التحقق من بيانات المسؤول.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-primary/50 to-primary" />
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">بوابة المسؤول</CardTitle>
            <CardDescription className="text-base">
              يرجى إدخال بيانات المسؤول الخاصة للنظام للوصول إلى لوحة التحكم.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
              هذه المنطقة مخصصة للمسؤولين فقط. سيتم تسجيل محاولات الوصول غير المصرح بها.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email">البريد الإلكتروني للمسؤول</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@smartrentdz.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">كلمة مرور النظام</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="h-11"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold transition-all hover:shadow-lg active:scale-[0.98]" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                "دخول المسؤول"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGate;
