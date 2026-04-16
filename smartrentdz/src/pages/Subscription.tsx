import { useEffect, useMemo, useState } from "react";
import { Copy, Crown, Star, Zap } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  requestSubscription,
  PlanName,
  fetchMySubscriptions,
  Subscription as SubRecord,
} from "@/services/subscriptionService";

type Feature = { label: string; value: string };

const planDetails: Record<
  PlanName,
  {
    price: number;
    period: string;
    highlight?: string;
    icon: typeof Star;
    features: Feature[];
    cta: string;
  }
> = {
  Free: {
    price: 0,
    period: "",
    icon: Star,
    cta: "ابدأ مجانًا",
    features: [
      { label: "عدد الشقق", value: "1" },
      { label: "مدة الإعلان", value: "15 يومًا" },
      { label: "ترتيب الظهور", value: "منخفض" },
      { label: "عدد الصور", value: "5" },
      { label: "الإحصائيات", value: "مشاهدات فقط" },
    ],
  },
  Basic: {
    price: 1800,
    period: "/ شهر",
    icon: Zap,
    highlight: "الأكثر شعبية",
    cta: "اشترك الآن",
    features: [
      { label: "عدد الشقق", value: "3" },
      { label: "مدة الإعلان", value: "30 يومًا" },
      { label: "ترتيب الظهور", value: "عادي" },
      { label: "عدد الصور", value: "10" },
      { label: "الإحصائيات", value: "مشاهدات + نقرات" },
    ],
  },
  Pro: {
    price: 3900,
    period: "/ شهر",
    icon: Crown,
    highlight: "أعلى قيمة",
    cta: "اشترك الآن",
    features: [
      { label: "عدد الشقق", value: "10" },
      { label: "مدة الإعلان", value: "30 يومًا" },
      { label: "ترتيب الظهور", value: "أولوية" },
      { label: "عدد الصور", value: "20" },
      { label: "الإحصائيات", value: "إحصائيات متقدمة" },
    ],
  },
};

const paymentDetails = [
  { label: "RIP Baridimob", value: "00799999005678912345", copyLabel: "RIP" },
  { label: "CCP Name", value: "SMARTRENT DZ" },
  { label: "CCP + Key", value: "0123456789-01" },
];

const Subscription = () => {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubRecord[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const isRenter = userData?.type === "renter";

  const activePlan: PlanName = useMemo(() => {
    const plan = (userData?.current_plan as PlanName) || "Free";
    return planDetails[plan] ? plan : "Free";
  }, [userData?.current_plan]);

  const latestSubscription = subscriptions[0];
  const pendingReview = latestSubscription?.status === "pending";
  const rejected = latestSubscription?.status === "rejected";

  useEffect(() => {
    const load = async () => {
      if (!userData?.uid) return;
      setLoadingSubs(true);
      try {
        const data = await fetchMySubscriptions();
        setSubscriptions(data);
      } catch (error) {
        console.error("Failed to load subscriptions", error);
      } finally {
        setLoadingSubs(false);
      }
    };
    void load();
  }, [userData?.uid]);

  const openModal = (plan: PlanName) => {
    if (plan === activePlan) return;
    if (plan === "Free") {
      toast({ title: "أنت على الخطة المجانية بالفعل" });
      return;
    }
    if (pendingReview) {
      toast({ title: "طلبك قيد المراجعة", description: "انتظر رد الإدارة قبل تقديم طلب جديد" });
      return;
    }
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "تم النسخ" });
    } catch {
      toast({ title: "تعذر النسخ، انسخها يدويًا", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;
    if (!receipt) {
      toast({ title: "حمّل إيصال الدفع أولاً", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await requestSubscription(selectedPlan, receipt);
      toast({
        title: "تم إرسال طلب الاشتراك",
        description: "سيتم التحقق من الإيصال خلال 24 ساعة",
      });
      setModalOpen(false);
      setReceipt(null);
      const data = await fetchMySubscriptions();
      setSubscriptions(data);
    } catch (error: any) {
      toast({
        title: "فشل إرسال الطلب",
        description: error?.message || "حاول مجددًا",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusNotice = () => {
    if (pendingReview) {
      return (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-900">
          طلبك قيد المراجعة. ستصلك نتيجة المراجعة قريبًا.
        </div>
      );
    }
    if (rejected) {
      return (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
          <div className="font-semibold">تم رفض الاشتراك</div>
          <div className="text-sm">
            السبب: {latestSubscription?.admin_feedback || "لم يتم تقديم سبب"}
          </div>
          <div className="mt-3">
            <Button
              variant="outline"
              onClick={() => openModal((latestSubscription?.plan_name as PlanName) || "Basic")}
            >
              التقديم مجددًا
            </Button>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isRenter) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Header />
        <main className="flex-1 container py-16">
          <h1 className="text-3xl font-bold mb-4">الاشتراكات</h1>
          <p className="text-muted-foreground text-lg">
            ميزات حصرية للمستأجرين قادمة قريبًا! تابعنا لمعرفة التحديثات القادمة.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-hero py-14 text-center text-primary-foreground">
          <div className="container space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold">خطط الاشتراك في SmartRentDZ</h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              اختر الخطة الأنسب لعدد شققك ومستوى الظهور الذي تريده، وفعّلها عبر CCP أو Baridimob.
            </p>
            <div>
              <Badge className="bg-white/20 text-white">
                الخطة الحالية: {activePlan}
              </Badge>
            </div>
          </div>
        </section>

        <section className="container py-12">
          {renderStatusNotice()}

          <div className="mb-4 text-sm text-muted-foreground">
            {loadingSubs ? "جارٍ جلب حالة الاشتراك..." : latestSubscription ? `آخر حالة: ${latestSubscription.status}` : ""}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {(Object.keys(planDetails) as PlanName[]).map((planKey) => {
              const plan = planDetails[planKey];
              const isActive = planKey === activePlan && !rejected;
              const disabled = isActive || pendingReview;
              const Icon = plan.icon;
              return (
                <Card
                  key={planKey}
                  className={`relative h-full ${plan.highlight ? "border-primary shadow-lg ring-2 ring-primary/15" : ""}`}
                >
                  <CardHeader className="space-y-3 text-center">
                    {plan.highlight && (
                      <Badge className="mx-auto bg-gradient-featured text-featured-foreground border-0">
                        {plan.highlight}
                      </Badge>
                    )}
                    <div className="flex justify-center">
                      <div
                        className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                          plan.highlight ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <Icon className="h-7 w-7" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{planKey}</CardTitle>
                      <CardDescription className="text-base font-semibold text-foreground">
                        {plan.price === 0 ? (
                          "مجاني دائمًا"
                        ) : (
                          <>
                            {plan.price.toLocaleString("ar-DZ")} د.ج{" "}
                            <span className="text-muted-foreground text-sm">{plan.period}</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      {plan.features.map((feature) => (
                        <div
                          key={feature.label}
                          className="flex items-center justify-between text-sm text-muted-foreground"
                        >
                          <span>{feature.label}</span>
                          <span className="font-semibold text-foreground">{feature.value}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      variant={plan.highlight ? "default" : "outline"}
                      disabled={disabled}
                      onClick={() => openModal(planKey)}
                    >
                      {isActive ? "الخطة الحالية" : pendingReview ? "طلب قيد المراجعة" : plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>إتمام الدفع لخطة {selectedPlan}</DialogTitle>
            <DialogDescription>
              ادفع عبر CCP أو Baridimob ثم حمّل إيصال الدفع. التفعيل خلال 24 ساعة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              {paymentDetails.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border px-3 py-2 bg-muted/50"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-semibold">{item.value}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyText(item.value)}
                    title={`نسخ ${item.copyLabel || item.label}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">إيصال الدفع</p>
              <Input type="file" accept="image/*" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground">
                يرجى دفع المبلغ عبر CCP/Baridimob ثم رفع صورة الإيصال هنا. التحقق يستغرق حتى 24 ساعة.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "جاري الإرسال..." : "إرسال الطلب"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscription;
