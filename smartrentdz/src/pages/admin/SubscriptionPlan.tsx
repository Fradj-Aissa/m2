import { useEffect, useState } from "react";
import { format } from "date-fns";
import { arDZ } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { approveSubscription, fetchPendingSubscriptions, rejectSubscription, Subscription } from "@/services/subscriptionService";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";

const SubscriptionPlan = () => {
  const { toast } = useToast();
  const [pending, setPending] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Subscription | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingSubscriptions();
      setPending(data);
    } catch (error) {
      console.error("Failed to load subscriptions", error);
      toast({ title: "فشل تحميل الطلبات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await approveSubscription(id);
      toast({ title: "تم تفعيل الاشتراك" });
      setPending((prev) => prev.filter((s) => s.id !== id));
      setPreview((prev) => (prev?.id === id ? null : prev));
    } catch (err: any) {
      toast({ title: "فشل التفعيل", description: err?.message || "Server error", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await rejectSubscription(id);
      toast({ title: "تم رفض الطلب" });
      setPending((prev) => prev.filter((s) => s.id !== id));
      setPreview((prev) => (prev?.id === id ? null : prev));
    } catch (err: any) {
      toast({ title: "فشل الرفض", description: err?.message || undefined, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const buildReceiptUrl = (path?: string | null) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const origin = API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    return `${origin}${path}`;
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الاشتراكات</h1>
          <p className="text-muted-foreground mt-2">مراجعة وتفعيل طلبات الاشتراك المعلقة</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>الطلبات المعلقة</CardTitle>
            <CardDescription>تحقق من الإيصالات وفَعِّل أو ارفض الاشتراك</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">جارٍ التحميل...</div>
            ) : pending.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">لا توجد طلبات معلقة</div>
            ) : (
              <ScrollArea className="max-h-[480px]">
                <div className="space-y-4">
                  {pending.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border p-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge>{sub.plan_name}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {sub.price.toLocaleString("ar-DZ")} د.ج
                          </span>
                        </div>
                        <div className="text-sm text-foreground">
                          المستخدم: {sub.user_id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sub.created_at
                            ? format(new Date(sub.created_at), "PPP p", { locale: arDZ })
                            : ""}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {sub.receipt_image ? (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPreview(sub)}
                            title="معاينة الإيصال"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          className="text-destructive"
                          disabled={processingId === sub.id}
                          onClick={() => handleReject(sub.id)}
                        >
                          رفض
                        </Button>
                        <Button
                          disabled={processingId === sub.id}
                          onClick={() => handleApprove(sub.id)}
                        >
                          تفعيل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>إيصال الدفع</DialogTitle>
            <DialogDescription>معاينة الإيصال المرفوع لهذا الاشتراك.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            {preview?.receipt_image ? (
              <img
                src={buildReceiptUrl(preview.receipt_image)}
                alt="Receipt"
                className="max-h-[70vh] w-full object-contain"
              />
            ) : (
              <div className="text-muted-foreground">لا يوجد إيصال</div>
            )}
          </div>
          <DialogFooter className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>
              إغلاق
            </Button>
            {preview ? (
              <>
                <Button
                  variant="outline"
                  className="text-destructive"
                  disabled={processingId === preview.id}
                  onClick={() => handleReject(preview.id)}
                >
                  رفض
                </Button>
                <Button
                  disabled={processingId === preview.id}
                  onClick={() => handleApprove(preview.id)}
                >
                  تفعيل
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionPlan;
