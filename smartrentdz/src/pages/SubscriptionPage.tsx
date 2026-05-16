import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Crown, Loader2, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { requestSubscription } from "@/services/subscriptionService";
import { fetchMySubscriptions, Subscription } from "@/services/subscriptionService";

const premiumFeatures = [
  "وصول مبكر 24 ساعة للإعلانات الجديدة",
  "سجل بحث غير محدود",
  "شارة مستأجر موثّق",
  "تحليلات أسعار مدعومة بالذكاء الاصطناعي",
];

const SubscriptionPage = () => {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [receipt, setReceipt] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [latestRequest, setLatestRequest] = useState<Subscription | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const isPremium = !!userData?.is_premium;
  const isPending = userData?.verification_status === "pending";
  const requestPending = latestRequest?.status === "pending";
  const requestApproved = latestRequest?.status === "approved";
  const requestRejected = latestRequest?.status === "rejected";
  const uploadLocked = isPending || requestPending || requestApproved;

  const remainingDays = useMemo(() => {
    if (!userData?.premium_until) return 0;
    const diff = new Date(userData.premium_until).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [userData?.premium_until]);

  useEffect(() => {
    const load = async () => {
      if (!userData?.uid) return;
      setLoadingStatus(true);
      try {
        const rows = await fetchMySubscriptions();
        setLatestRequest(rows?.[0] || null);
      } catch {
        setLatestRequest(null);
      } finally {
        setLoadingStatus(false);
      }
    };
    void load();
  }, [userData?.uid]);

  const handleUpload = async () => {
    if (!receipt) {
      toast({ title: "يرجى رفع إيصال الدفع أولًا", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await requestSubscription("Pro", receipt, 500);
      toast({ title: "تم رفع الإيصال! سيتم التحقق منه من الإدارة قريبًا." });
      setReceipt(null);
      const rows = await fetchMySubscriptions();
      setLatestRequest(rows?.[0] || null);
    } catch (error: any) {
      toast({
        title: "فشل رفع الإيصال",
        description: error?.response?.data?.error || error?.message || "يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30" dir="rtl">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-hero py-14 text-center text-primary-foreground">
          <div className="container space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold">اشتراك المستأجر Premium</h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              فعّل باقة Premium للاستفادة من الوصول المبكر للإعلانات الجديدة وتجربة بحث أكثر ذكاءً.
            </p>
          </div>
        </section>

        <section className="container py-12">
          <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>الخطة المجانية</span>
                <Badge variant="secondary">0 د.ج / شهر</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-muted-foreground">
              <p>تصفح عادي للإعلانات</p>
              <p>ميزات أساسية فقط</p>
              <p>بدون أولوية للوصول المبكر</p>
            </CardContent>
          </Card>

          <Card className="border-primary shadow-lg ring-2 ring-primary/15">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-primary">
                <span className="flex items-center gap-2"><Crown className="h-5 w-5" /> Premium</span>
                <Badge className="bg-emerald-600 text-white">500 د.ج / شهر</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {premiumFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-emerald-600" />
                رفع إيصال الدفع (CCP / BaridiMob)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPremium || requestApproved ? (
                <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                  <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400"><ShieldCheck className="h-5 w-5" /> شكرًا لك، أنت عضو Premium</div>
                  <p className="text-sm text-muted-foreground mt-1">الأيام المتبقية: {remainingDays}</p>
                  {latestRequest?.start_date ? <p className="text-sm text-muted-foreground mt-1">بداية الاشتراك: {new Date(latestRequest.start_date).toLocaleDateString("ar-DZ")}</p> : null}
                  {latestRequest?.end_date ? <p className="text-sm text-muted-foreground mt-1">نهاية الاشتراك: {new Date(latestRequest.end_date).toLocaleDateString("ar-DZ")}</p> : null}
                </div>
              ) : uploadLocked ? (
                <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
                  <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400"><Clock3 className="h-5 w-5" /> التحقق قيد المراجعة</div>
                  <p className="text-sm text-muted-foreground mt-1">تم استلام إيصالك وهو الآن قيد المراجعة من الإدارة.</p>
                </div>
              ) : requestRejected ? (
                <div className="rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
                  <div className="font-semibold text-red-700 dark:text-red-400">تم رفض الاشتراك</div>
                  <p className="text-sm text-muted-foreground mt-1">السبب: {latestRequest?.admin_feedback || "لم يتم تقديم سبب"}</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <p className="text-sm text-muted-foreground">ادفع 500 د.ج عبر CCP/BaridiMob ثم ارفع صورة الإيصال لتفعيل الاشتراك.</p>
                    <Input type="file" accept="image/*" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
                    <Button onClick={handleUpload} disabled={uploading || !receipt} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> جاري الرفع...</> : <><CheckCircle2 className="h-4 w-4 mr-2" /> رفع الإيصال</>}
                    </Button>
                  </div>
                </>
              )}
              {loadingStatus ? <p className="text-xs text-muted-foreground">جاري تحديث حالة الاشتراك...</p> : null}
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SubscriptionPage;
