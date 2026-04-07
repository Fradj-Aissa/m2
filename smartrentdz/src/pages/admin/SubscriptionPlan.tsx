import { useEffect, useState } from "react";
import { format } from "date-fns";
import { arDZ } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { approveSubscription, fetchPendingSubscriptions, rejectSubscription, Subscription } from "@/services/subscriptionService";
import { useToast } from "@/hooks/use-toast";

const SubscriptionPlan = () => {
  const { toast } = useToast();
  const [pending, setPending] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
    } catch {
      toast({ title: "فشل التفعيل", variant: "destructive" });
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
    } catch {
      toast({ title: "فشل الرفض", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إدارة الاشتراكات</h1>
        <p className="text-muted-foreground mt-2">مراجعة وتفعيل طلبات الاشتراك المعلقة</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الطلبات المعلقة</CardTitle>
          <CardDescription>تحقق من الإيصالات وفعّل أو ارفض الاشتراك</CardDescription>
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
                      {sub.receipt_image && (
                        <a
                          href={sub.receipt_image}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary text-sm underline"
                        >
                          عرض إيصال الدفع
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
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
  );
};

export default SubscriptionPlan;
