import { Link } from "react-router-dom";
import { Check, X, Star, Zap, Crown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const plans = [
  {
    id: "free",
    name: "مجانية",
    icon: Star,
    price: 0,
    priceLabel: "مجاني",
    features: [
      { label: "عدد الشقق", value: "1" },
      { label: "مدة الإعلان", value: "15 يوم" },
      { label: "ترتيب الظهور", value: "منخفض" },
      { label: "عدد الصور", value: "5" },
      { label: "الإحصائيات", value: "مشاهدات فقط" },
      { label: "إعلان مميز", value: false },
    ],
    highlighted: false,
  },
  {
    id: "basic",
    name: "Basic",
    icon: Zap,
    price: 1800,
    priceLabel: "1,800 د.ج",
    features: [
      { label: "عدد الشقق", value: "3" },
      { label: "مدة الإعلان", value: "30 يوم" },
      { label: "ترتيب الظهور", value: "عادي" },
      { label: "عدد الصور", value: "10" },
      { label: "الإحصائيات", value: "مشاهدات + نقرات" },
      { label: "إعلان مميز", value: false },
    ],
    highlighted: true,
    badge: "الأكثر شعبية",
  },
  {
    id: "pro",
    name: "Pro",
    icon: Crown,
    price: 3900,
    priceLabel: "3,900 د.ج",
    features: [
      { label: "عدد الشقق", value: "10" },
      { label: "مدة الإعلان", value: "30 يوم" },
      { label: "ترتيب الظهور", value: "أولوية" },
      { label: "عدد الصور", value: "20" },
      { label: "الإحصائيات", value: "متقدمة" },
      { label: "إعلان مميز", value: true },
    ],
    highlighted: false,
  },
];

const Subscription = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-hero py-16 text-center">
          <div className="container">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              اختر الباقة المناسبة لك
            </h1>
            <p className="text-primary-foreground/80 max-w-xl mx-auto">
              ابدأ بنشر شققك المفروشة وتواصل مع آلاف المستأجرين في جميع أنحاء الجزائر
            </p>
          </div>
        </section>

        {/* Plans Grid */}
        <section className="container py-16">
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-card rounded-2xl border p-6 ${
                  plan.highlighted
                    ? "border-primary shadow-xl ring-2 ring-primary/20"
                    : "shadow-sm"
                }`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-featured text-featured-foreground border-0">
                    {plan.badge}
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-4 ${
                      plan.highlighted ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <plan.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                </div>

                <div className="text-center mb-6">
                  <div className="text-4xl font-bold">
                    {plan.price === 0 ? "مجاني" : (
                      <>
                        {plan.price.toLocaleString("ar-DZ")}
                        <span className="text-lg font-normal text-muted-foreground mr-1">
                          د.ج
                        </span>
                      </>
                    )}
                  </div>
                  {plan.price > 0 && (
                    <div className="text-sm text-muted-foreground">/ شهر</div>
                  )}
                </div>

                <Separator className="my-6" />

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">{feature.label}</span>
                      {typeof feature.value === "boolean" ? (
                        feature.value ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
                            <Check className="h-3 w-3 text-success" />
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20">
                            <X className="h-3 w-3 text-destructive" />
                          </div>
                        )
                      ) : (
                        <span className="text-sm font-medium">{feature.value}</span>
                      )}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.highlighted ? "bg-gradient-hero hover:opacity-90" : ""
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link to="/register">
                    {plan.price === 0 ? "ابدأ مجاناً" : "اشترك الآن"}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-muted/50 py-16">
          <div className="container max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-8">أسئلة شائعة</h2>
            
            <div className="space-y-4">
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-2">هل يمكنني تغيير الباقة لاحقاً؟</h3>
                <p className="text-muted-foreground text-sm">
                  نعم، يمكنك الترقية أو تخفيض باقتك في أي وقت. سيتم احتساب الفرق بناءً على المدة المتبقية من اشتراكك الحالي.
                </p>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-2">ما هي طرق الدفع المتاحة؟</h3>
                <p className="text-muted-foreground text-sm">
                  نقبل الدفع عبر البطاقات البنكية، بريدي موب، وCCP. كما نوفر خيار الدفع نقداً عبر مكاتبنا المعتمدة.
                </p>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-2">هل هناك فترة تجريبية مجانية؟</h3>
                <p className="text-muted-foreground text-sm">
                  الباقة المجانية متاحة دائماً وتتيح لك نشر شقة واحدة. يمكنك الترقية في أي وقت للحصول على مزايا إضافية.
                </p>
              </div>
            </div>

            <div className="text-center mt-8">
              <p className="text-muted-foreground mb-4">هل لديك أسئلة أخرى؟</p>
              <Button variant="outline" asChild>
                <Link to="/contact">
                  تواصل معنا
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Subscription;
