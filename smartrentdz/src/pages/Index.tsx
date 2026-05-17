import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Star, 
  Shield, 
  Clock, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  Map, 
  BarChart3, 
  Crown, 
  LayoutDashboard 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import ApartmentCard from "@/components/ApartmentCard";
import { getAllApartments, getFeaturedApartments, Apartment } from "@/services/apartmentService";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "../assets/hero-apartment.jpg";

const Index = () => {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const [featuredApartments, setFeaturedApartments] = useState<Apartment[]>([]);
  const [latestApartments, setLatestApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApartments = async () => {
      try {
        const [featured, all] = await Promise.all([
          getFeaturedApartments(),
          getAllApartments(),
        ]);
        setFeaturedApartments(featured);
        setLatestApartments(all.slice(0, 6));
      } catch (error) {
        console.error("Error fetching apartments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApartments();
  }, []);

  const popularWilayas = [
    { id: 16, name: "الجزائر", count: 156 },
    { id: 31, name: "وهران", count: 98 },
    { id: 25, name: "قسنطينة", count: 67 },
    { id: 23, name: "عنابة", count: 45 },
    { id: 19, name: "سطيف", count: 38 },
    { id: 6, name: "بجاية", count: 32 },
  ];

  // Redirect logged-in users to dashboard
  if (!authLoading && currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="شقة مفروشة"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-background/95 via-background/80 to-background/60" />
          </div>

          <div className="container relative py-20 md:py-32">
            <div className="max-w-2xl space-y-6">
              {/* Badge */}
              <Badge variant="secondary" className="text-sm px-4 py-1.5">
                🇩🇿 منصة جزائرية 100%
              </Badge>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                ابحث عن{" "}
                <span className="text-gradient-hero">شقتك المفروشة</span>
                <br />
                في كل الجزائر
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                اكتشف أفضل الشقق المفروشة للإيجار اليومي، الأسبوعي والشهري في جميع الولايات الـ 58
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold">58</p>
                    <p className="text-xs text-muted-foreground">ولاية</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                    <Star className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-bold">+500</p>
                    <p className="text-xs text-muted-foreground">شقة</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
                    <Shield className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-bold">+1000</p>
                    <p className="text-xs text-muted-foreground">مؤجر موثوق</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search Bar */}
        <section className="container -mt-8 relative z-10">
          <SearchBar variant="hero" />
        </section>

        {/* Featured Apartments */}
        <section className="container py-16 md:py-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">✨ الشقق المميزة</h2>
              <p className="text-muted-foreground mt-1">أفضل العروض المختارة لك</p>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/search?featured=true" className="flex items-center gap-2">
                عرض الكل
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : featuredApartments.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredApartments.map((apartment) => (
                <ApartmentCard key={apartment.id} apartment={apartment} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد شقق مميزة حالياً
            </div>
          )}
        </section>

        {/* Popular Wilayas */}
        <section className="bg-secondary/30 py-16 md:py-20">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold">الولايات الأكثر طلباً</h2>
              <p className="text-muted-foreground mt-2">اختر ولايتك واكتشف الشقق المتاحة</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {popularWilayas.map((wilaya) => (
                <Link
                  key={wilaya.id}
                  to={`/search?wilaya=${wilaya.id}`}
                  className="group bg-card rounded-xl p-5 text-center border shadow-sm card-hover"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {wilaya.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {wilaya.count} شقة
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Latest Apartments */}
        <section className="container py-16 md:py-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">أحدث الإعلانات</h2>
              <p className="text-muted-foreground mt-1">شقق أُضيفت مؤخراً</p>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/search" className="flex items-center gap-2">
                عرض الكل
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : latestApartments.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestApartments.map((apartment) => (
                <ApartmentCard key={apartment.id} apartment={apartment} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد شقق حالياً. كن أول من يضيف شقة!
            </div>
          )}
        </section>

        {/* CTA Section - Show for non-logged in users and renters */}
        {(!currentUser || userData?.type === 'renter') && (
          <section className="bg-gradient-hero py-16 md:py-20">
            <div className="container text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
                هل لديك شقة للكراء؟
              </h2>
              <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
                انضم إلى آلاف المؤجرين واعرض شقتك لملايين الباحثين عن السكن في الجزائر
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/register">سجّل كمؤجّر</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                  <Link to="/subscription">تعرف على الاشتراكات</Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Features Bento Section */}
        <section className="py-24 bg-gradient-to-b from-secondary/50 via-background to-secondary/30 relative overflow-hidden">
          {/* Decorative Background Glows */}
          <div className="absolute top-1/4 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -z-10" />

          <div className="container">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
              <Badge variant="outline" className="px-4 py-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold text-xs rounded-full bg-emerald-50/50 dark:bg-emerald-950/20">
                مزايا حصرية وذكية ✨
              </Badge>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                كل ما تحتاجه في <span className="text-gradient-hero">SmartRentDZ</span>
              </h2>
              <p className="text-muted-foreground text-base md:text-lg">
                سواء كنت تبحث عن شقة مفروشة أحلامك أو تريد تأجير عقارك بأعلى عائد وأقل مجهود، وفرنا لك الحل!
              </p>
            </div>

            {/* TENANTS SECTION */}
            <div className="space-y-10 mb-24">
              <div className="flex items-center gap-3 border-r-4 border-emerald-500 pr-4">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400">للمستأجرين</h3>
                  <p className="text-sm text-muted-foreground">أسهل وأسرع طريقة للبحث، المقارنة، والتعاقد الموثوق</p>
                </div>
              </div>

              {/* Tenants Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Price Intelligence Card (Big Card - Col Span 2) */}
                <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-card/40 backdrop-blur-md p-8 shadow-md hover:shadow-emerald-500/10 transition-all duration-300 group">
                  <div className="absolute top-0 left-0 w-full h-full bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 animate-pulse" />
                      </div>
                      <h4 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                        الذكاء الاصطناعي لتحليل الأسعار
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-[10px] rounded-full">
                          Gemini AI
                        </Badge>
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                        لا داعي للقلق بعد الآن بشأن ما إذا كان السعر عادلاً أم مبالغاً فيه! يقوم نظام الذكاء الاصطناعي الذكي بمقارنة مواصفات الشقة، مساحتها، وعدد الغرف مع متوسط الأسعار الحقيقي في نفس المنطقة الجغرافية بدقة فائقة ليعطيك تقييماً فوريّاً يوضح جودة الصفقة.
                      </p>
                    </div>
                    {/* Visual mockup snippet inside bento */}
                    <div className="bg-background/80 dark:bg-slate-900/60 backdrop-blur rounded-2xl p-4 border border-emerald-500/10 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-xs font-semibold">تحليل السعر المباشر:</span>
                        <span className="text-emerald-500 font-bold">سعر ممتاز جداً وأقل بـ 12% من السوق!</span>
                      </div>
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* 2. Early Access Card */}
                <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-card/40 backdrop-blur-md p-8 shadow-md hover:shadow-amber-500/10 transition-all duration-300 group">
                  <div className="absolute top-0 left-0 w-full h-full bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-amber-500" />
                      </div>
                      <h4 className="text-xl font-bold text-foreground flex items-center gap-2">
                        الوصول المبكر للحصريات
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium text-[10px] rounded-full flex items-center gap-0.5">
                          <Crown className="h-3 w-3" /> بريميوم
                        </Badge>
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        كن الأول دائماً! يحصل المشتركون في الباقة المميزة على وصول حصري للشقق الجديدة والمميزة قبل نشرها للجميع بـ 24 ساعة كاملة، مما يضمن لك حجز أفضل الفرص التنافسية.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Identity Verification Card */}
                <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-card/40 backdrop-blur-md p-8 shadow-md hover:shadow-blue-500/10 transition-all duration-300 group">
                  <div className="absolute top-0 left-0 w-full h-full bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-blue-500" />
                      </div>
                      <h4 className="text-xl font-bold text-foreground">توثيق هوية المستأجر</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        قم برفع مستندات الهوية للحصول على شارة التوثيق الذهبية. الحسابات الموثقة تمنح المؤجرين ثقة أكبر وتسرّع قبول طلبات الإيجار الخاصة بك للضعف.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Interactive Map Card (Col Span 2) */}
                <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-slate-500/20 bg-card/40 backdrop-blur-md p-8 shadow-md hover:shadow-slate-500/10 transition-all duration-300 group">
                  <div className="absolute top-0 left-0 w-full h-full bg-slate-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-500/10 text-slate-500 flex items-center justify-center">
                        <Map className="h-6 w-6 text-slate-500" />
                      </div>
                      <h4 className="text-xl md:text-2xl font-bold text-foreground">بحث الخريطة التفاعلي</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                        تصفح الشقق المفروشة في الجزائر مباشرة على خريطة تفاعلية وسلسة. ابحث بالولاية أو البلدية، واعرف المرافق والخدمات المحيطة بالعقار والمسافات بدقة بنقرات بسيطة وممتازة.
                      </p>
                    </div>
                    {/* Visual map badge mockup */}
                    <div className="bg-background/80 dark:bg-slate-900/60 backdrop-blur rounded-2xl p-4 border border-slate-500/10 text-xs text-muted-foreground flex justify-between items-center">
                      <span>✓ تصفح وتوجيه جغرافي بالخريطة بنقرة واحدة</span>
                      <span className="font-semibold text-primary">تصفح الخريطة التفاعلية ←</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sleek CTA Button for Tenants */}
              <div className="flex justify-center pt-4">
                <Button size="lg" className="px-10 py-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/35 transition-all duration-300 flex items-center gap-3 group" asChild>
                  <Link to="/register?role=tenant">
                    ابدأ كمستأجر الآن
                    <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* LANDLORDS SECTION */}
            <div className="space-y-10">
              <div className="flex items-center gap-3 border-r-4 border-indigo-500 pr-4">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400">للمؤجرين (أصحاب العقارات)</h3>
                  <p className="text-sm text-muted-foreground">قم بتأجير شقتك المفروشة بأمان تام واحترافية متناهية</p>
                </div>
              </div>

              {/* Landlords Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Advanced Performance Stats Card */}
                <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-card/40 backdrop-blur-md p-8 shadow-md hover:shadow-indigo-500/10 transition-all duration-300 group">
                  <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-indigo-500" />
                      </div>
                      <h4 className="text-xl font-bold text-foreground">إحصائيات الأداء المتقدمة</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        تابع تفاعل الباحثين مع عقارك لحظة بلحظة. راقب إحصائيات عدد المشاهدات، وعدد النقرات على رقم هاتفك لتحليل وتطوير استراتيجيتك الإعلانية وزيادة فعاليتها.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Featured Properties Card (Big Card - Col Span 2) */}
                <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-amber-500/20 bg-card/40 backdrop-blur-md p-8 shadow-md hover:shadow-amber-500/10 transition-all duration-300 group">
                  <div className="absolute top-0 left-0 w-full h-full bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Crown className="h-6 w-6 text-amber-500 animate-bounce" />
                      </div>
                      <h4 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                        تمييز العقارات (Featured Showcase)
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium text-[10px] rounded-full">
                          أولوية قصوى
                        </Badge>
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                        اجعل إعلاناتك تظهر في مقدمة نتائج البحث وفي الصفحة الرئيسية للمنصة! يمنح تمييز العقارات عقارك وصولاً أعلى بمعدل 10 أضعاف مقارنة بالعقارات العادية، مما يعني تأجيراً فورياً وسريعاً.
                      </p>
                    </div>
                    {/* Visual mockup inside bento */}
                    <div className="bg-background/80 dark:bg-slate-900/60 backdrop-blur rounded-2xl p-4 border border-amber-500/10 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500 fill-current" />
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">تم التمييز: العقار معروض في قائمة الصدارة وقسم الشقق المميزة</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Integrated Management Card (Col Span 2) */}
                <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-slate-500/20 bg-card/40 backdrop-blur-md p-8 shadow-md hover:shadow-slate-500/10 transition-all duration-300 group">
                  <div className="absolute top-0 left-0 w-full h-full bg-slate-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-500/10 text-slate-500 flex items-center justify-center">
                        <LayoutDashboard className="h-6 w-6 text-slate-500" />
                      </div>
                      <h4 className="text-xl md:text-2xl font-bold text-foreground">إدارة عقارات متكاملة</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                        لوحة تحكم إعلانية متكاملة واحترافية تتيح لك إضافة شققك، تعديل تفاصيلها وأسعارها وصورها، وإيقاف أو تفعيل الإعلانات بلمسة واحدة بكل مرونة ودون تعقيد.
                      </p>
                    </div>
                    {/* Visual badge mockup */}
                    <div className="bg-background/80 dark:bg-slate-900/60 backdrop-blur rounded-2xl p-4 border border-slate-500/10 text-xs text-muted-foreground flex justify-between items-center">
                      <span>✓ لوحة تحكم سريعة وعصرية 100% لإدارة إعلانات الكراء</span>
                    </div>
                  </div>
                </div>

                {/* 4. Trusted Reviews Card */}
                <div className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-card/40 backdrop-blur-md p-8 shadow-md hover:shadow-orange-500/10 transition-all duration-300 group">
                  <div className="absolute top-0 left-0 w-full h-full bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <Star className="h-6 w-6 text-orange-500 fill-current animate-pulse" />
                      </div>
                      <h4 className="text-xl font-bold text-foreground">نظام تقييمات موثوق</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        احصل على تقييمات وآراء حقيقية من المستأجرين بعد إتمام فترات إقامتهم. التقييمات الإيجابية تبني لك سمعة ذهبية وتجلب لك المزيد من العملاء الدائمين والموثوقين.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sleek CTA Button for Landlords */}
              <div className="flex justify-center pt-4">
                <Button size="lg" className="px-10 py-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all duration-300 flex items-center gap-3 group" asChild>
                  <Link to="/register?role=owner">
                    أعلن عن عقارك الآن
                    <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
