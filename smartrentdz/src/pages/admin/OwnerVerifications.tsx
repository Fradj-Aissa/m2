import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut, API_BASE_URL } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock3, Eye, Loader2, ShieldCheck, XCircle } from "lucide-react";

type VerificationStatus = "pending" | "verified" | "rejected" | "unverified";

interface OwnerVerificationItem {
  uid: string;
  name: string;
  email: string;
  phone?: string | null;
  type?: string | null;
  account_type?: string | null;
  id_card_path?: string | null;
  verification_status: VerificationStatus;
  rejection_reason?: string | null;
  created_at?: string;
}

const buildAssetUrl = (path?: string | null) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
};

const parseIdCardImages = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return [parsed.front, parsed.back].filter(Boolean).map(buildAssetUrl);
    }
  } catch {
    return [buildAssetUrl(value)];
  }
  return [];
};

const OwnerVerifications = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<OwnerVerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [preview, setPreview] = useState<OwnerVerificationItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OwnerVerificationItem | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiGet<OwnerVerificationItem[]>("/admin/verifications/pending");
      setItems(response);
    } catch (error) {
      console.error("Failed to load owner verifications", error);
      toast({
        title: "تعذر تحميل طلبات التوثيق",
        description: "يرجى المحاولة مرة أخرى بعد قليل.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleApprove = async (uid: string) => {
    const confirmed = window.confirm("هل أنت متأكد من قبول توثيق هذا المالك؟");
    if (!confirmed) return;

    setProcessingUid(uid);
    try {
      await apiPut(`/admin/verifications/${uid}/status`, { status: "verified" });
      setItems((prev) => prev.filter((item) => item.uid !== uid));
      if (preview?.uid === uid) {
        setPreview(null);
      }
      toast({ title: "تم قبول التوثيق بنجاح" });
    } catch (error: any) {
      console.error("Failed to approve verification", error);
      toast({
        title: "فشل قبول التوثيق",
        description: error?.response?.data?.error || "تعذر إتمام العملية.",
        variant: "destructive",
      });
    } finally {
      setProcessingUid(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!reason.trim()) {
      toast({
        title: "سبب الرفض مطلوب",
        description: "اكتب سببًا واضحًا ليظهر لصاحب الحساب.",
        variant: "destructive",
      });
      return;
    }

    setProcessingUid(rejectTarget.uid);
    try {
      await apiPut(`/admin/verifications/${rejectTarget.uid}/status`, {
        status: "rejected",
        reason: reason.trim(),
      });
      setItems((prev) => prev.filter((item) => item.uid !== rejectTarget.uid));
      if (preview?.uid === rejectTarget.uid) {
        setPreview(null);
      }
      setRejectTarget(null);
      setReason("");
      toast({ title: "تم رفض التوثيق وإرسال السبب للمالك" });
    } catch (error: any) {
      console.error("Failed to reject verification", error);
      toast({
        title: "فشل رفض التوثيق",
        description: error?.response?.data?.error || "تعذر إتمام العملية.",
        variant: "destructive",
      });
    } finally {
      setProcessingUid(null);
    }
  };

  const previewImages = useMemo(() => parseIdCardImages(preview?.id_card_path), [preview]);

  return (
    <>
      <div className="space-y-6" dir="rtl">
        <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-background to-sky-50 p-6 shadow-sm dark:border-emerald-900/70 dark:from-emerald-950/40 dark:via-background dark:to-slate-950">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">توثيق هويات الملاك</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                راجع وثائق الهوية المرفوعة من الملاك، ثم وافق أو ارفض مع سبب واضح حتى تصلهم النتيجة مباشرة داخل المنصة.
              </p>
            </div>
          </div>
        </div>

        <Card className="border-emerald-100 dark:border-emerald-950/60">
          <CardHeader>
            <CardTitle>الطلبات قيد المراجعة</CardTitle>
            <CardDescription>تظهر هنا فقط الطلبات التي لم يُتخذ فيها قرار بعد.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري تحميل الطلبات...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
                لا توجد طلبات توثيق معلقة حاليًا.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {items.map((item) => {
                  const images = parseIdCardImages(item.id_card_path);

                  return (
                    <div
                      key={item.uid}
                      className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-emerald-300 dark:hover:border-emerald-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{item.name}</h3>
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              <Clock3 className="ml-1 h-3 w-3" />
                              قيد المراجعة
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>{item.email}</p>
                            {item.phone ? <p>{item.phone}</p> : null}
                            <p>نوع الحساب: {item.account_type || item.type || "مالك"}</p>
                          </div>
                        </div>

                        {images[0] ? (
                          <button
                            type="button"
                            onClick={() => setPreview(item)}
                            className="overflow-hidden rounded-xl border border-border bg-muted/30"
                            title="عرض الوثيقة"
                          >
                            <img src={images[0]} alt={item.name} className="h-20 w-28 object-cover" />
                          </button>
                        ) : (
                          <div className="flex h-20 w-28 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                            لا توجد صورة
                          </div>
                        )}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          className="border-slate-300 dark:border-slate-700"
                          onClick={() => setPreview(item)}
                        >
                          <Eye className="ml-2 h-4 w-4" />
                          عرض الوثيقة
                        </Button>
                        <Button
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={processingUid === item.uid}
                          onClick={() => handleApprove(item.uid)}
                        >
                          <CheckCircle2 className="ml-2 h-4 w-4" />
                          قبول
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={processingUid === item.uid}
                          onClick={() => {
                            setRejectTarget(item);
                            setReason("");
                          }}
                        >
                          <XCircle className="ml-2 h-4 w-4" />
                          رفض
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-5xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>معاينة وثيقة الهوية</DialogTitle>
            <DialogDescription>
              {preview ? `وثائق ${preview.name}` : "عرض الوثائق المرفوعة"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            {previewImages.length > 0 ? (
              previewImages.map((image, index) => (
                <div key={image} className="overflow-hidden rounded-2xl border border-border bg-muted/20">
                  <img
                    src={image}
                    alt={`وثيقة ${index + 1}`}
                    className="max-h-[75vh] w-full object-contain"
                  />
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
                لا توجد صورة متاحة للمعاينة.
              </div>
            )}
          </div>
          {preview ? (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectTarget(preview);
                  setReason("");
                }}
              >
                رفض مع سبب
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={processingUid === preview.uid}
                onClick={() => handleApprove(preview.uid)}
              >
                قبول التوثيق
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض توثيق الهوية</DialogTitle>
            <DialogDescription>
              اكتب سببًا مهنيًا وواضحًا، وسيصل مباشرة إلى المالك داخل إشعاراته وصفحة الإعدادات.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              rows={5}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="مثال: الصورة غير واضحة، أو بيانات البطاقة غير كاملة..."
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" disabled={processingUid === rejectTarget?.uid} onClick={handleReject}>
              إرسال الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OwnerVerifications;
