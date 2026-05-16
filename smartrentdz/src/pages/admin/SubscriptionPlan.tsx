import { useEffect, useState } from "react";
import { format } from "date-fns";
import { arDZ } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { fetchPendingSubscriptions, Subscription, updateSubscriptionStatus } from "@/services/subscriptionService";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";

const SubscriptionPlan = () => {
  const { toast } = useToast();
  const [pending, setPending] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Subscription | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

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

  const handleStatus = async (id: string, status: "approved" | "rejected") => {
    console.log("🔵 handleStatus called with id:", id, "status:", status, "feedback:", feedback[id]);
    setProcessingId(id);
    try {
      console.log("📤 Sending updateSubscriptionStatus request...");
      const result = await updateSubscriptionStatus(id, status, feedback[id] || "");
      console.log("✅ updateSubscriptionStatus succeeded:", result);
      
      toast({
        title: status === "approved" ? "تم تفعيل الاشتراك" : "تم رفض الطلب",
      });
      setPending((prev) => prev.filter((s) => s.id !== id));
      setPreview((prev) => (prev?.id === id ? null : prev));
      setFeedback((prev) => ({ ...prev, [id]: "" }));
    } catch (err: any) {
      console.error("❌ Full Error in handleStatus:", {
        message: err?.message,
        error: err,
        feedback: feedback[id]
      });
      toast({
        title: status === "approved" ? "فشل التفعيل" : "فشل الرفض",
        description: err?.message || "Server error",
        variant: "destructive",
      });
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
              <ScrollArea className="max-h-[520px]">
                <div className="space-y-5">
                  {pending.map((sub) => (
                    <div key={sub.id} className="rounded-xl border p-4 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge>{sub.plan_name}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {sub.price.toLocaleString("ar-DZ")} د.ج
                            </span>
                          </div>
                          <div className="text-sm text-foreground">المستخدم: {sub.user_id}</div>
                          <div className="text-xs text-muted-foreground">
                            {sub.created_at ? format(new Date(sub.created_at), "PPP p", { locale: arDZ }) : ""}
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
                            onClick={() => handleStatus(sub.id, "rejected")}
                          >
                            رفض
                          </Button>
                          <Button disabled={processingId === sub.id} onClick={() => handleStatus(sub.id, "approved")}>
                            تفعيل
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">التعليق / السبب (اختياري)</label>
                        <Textarea
                          rows={3}
                          placeholder="اكتب ملاحظة الموافقة أو سبب الرفض..."
                          value={feedback[sub.id] || ""}
                          onChange={(e) =>
                            setFeedback((prev) => ({
                              ...prev,
                              [sub.id]: e.target.value,
                            }))
                          }
                        />
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
              <img src={buildReceiptUrl(preview.receipt_image)} alt="Receipt" className="max-h-[70vh] w-full object-contain" />
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
                  onClick={() => handleStatus(preview.id, "rejected")}
                >
                  رفض
                </Button>
                <Button disabled={processingId === preview.id} onClick={() => handleStatus(preview.id, "approved")}>
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

