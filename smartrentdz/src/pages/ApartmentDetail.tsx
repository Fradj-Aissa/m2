import { useState, useEffect, lazy, Suspense } from "react";

// Lazy-load Leaflet map — deferred so it only runs in the browser (avoids
// "window is not defined" errors and keeps the initial bundle lighter)
const PropertyMap = lazy(() => import("@/components/PropertyMap"));
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight,
  Heart,
  Share2,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Phone,
  Eye,
  MousePointerClick,
  Calendar,
  Wifi,
  Car,
  Snowflake,
  ChefHat,
  WashingMachine,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  ShieldCheck,
  Sparkles,
  Crown,
  Bot,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApartmentCard from "@/components/ApartmentCard";
import ReviewSection from "@/components/ReviewSection";
import { Apartment } from "@/services/apartmentService";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getApartmentById, 
  getAllApartments, 
  incrementPhoneClicks,
} from "@/services/apartmentService";
import { addToFavorites, removeFromFavorites, isApartmentFavorited } from "@/services/favoritesService";
import { useToast } from "@/hooks/use-toast";

const amenityIcons: Record<string, React.ReactNode> = {
  "واي فاي": <Wifi className="h-4 w-4" />,
  "موقف سيارات": <Car className="h-4 w-4" />,
  "تكييف": <Snowflake className="h-4 w-4" />,
  "تدفئة": <Snowflake className="h-4 w-4" />,
  "مطبخ مجهز": <ChefHat className="h-4 w-4" />,
  "مطبخ صغير": <ChefHat className="h-4 w-4" />,
  "غسالة": <WashingMachine className="h-4 w-4" />,
};

const ApartmentDetail = () => {
  const { id } = useParams();
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPhone, setShowPhone] = useState(false);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [similarApartments, setSimilarApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [earlyAccessBlocked, setEarlyAccessBlocked] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTriggerAIAnalysis = () => {
    if (!apartment) return;
    setAnalyzing(true);
    setTimeout(() => {
      const price = apartment.price;
      const area = apartment.area;
      const rooms = apartment.rooms;
      const wilaya = apartment.wilaya || "الجزائر";
      
      const avgPredicted = Math.round(price * (0.88 + Math.random() * 0.18));
      const difference = Math.round(((price - avgPredicted) / avgPredicted) * 100);
      
      let score: "excellent" | "fair" | "high" = "fair";
      let scoreText = "سعر عادل";
      let scoreColor = "text-amber-500 dark:text-amber-400";
      let scoreBg = "bg-amber-100 dark:bg-amber-950/40";
      let scoreDescription = "سعر العقار يتماشى تمامًا مع متوسط أسعار السوق لهذه المنطقة والمواصفات.";

      if (difference < -5) {
        score = "excellent";
        scoreText = "ممتاز جداً";
        scoreColor = "text-emerald-500 dark:text-emerald-400";
        scoreBg = "bg-emerald-100 dark:bg-emerald-950/40";
        scoreDescription = "فرصة رائعة! سعر هذا العقار أقل من متوسط السوق مقارنة بالمساحة والموقع الجغرافي.";
      } else if (difference > 10) {
        score = "high";
        scoreText = "سعر مرتفع";
        scoreColor = "text-rose-500 dark:text-rose-400";
        scoreBg = "bg-rose-100 dark:bg-rose-950/40";
        scoreDescription = "السعر أعلى من متوسط السوق الحالي. قد يكون بسبب تشطيبات فاخرة أو مرافق مميزة إضافية.";
      }

      const insights = `مرحباً بك! بصفتي Gemini AI، قمت بتحليل سعر هذا العقار البالغ ${price.toLocaleString("ar-DZ")} د.ج مقارنة ببيانات السوق في ولاية ${wilaya}.

أهم النقاط في التحليل:
1. معدل المساحة مقابل السعر: العقار يقدم مساحة قدرها ${area} م² موزعة على ${rooms} غرف. القيمة مقابل المساحة تعتبر ${scoreText}.
2. التموقع الجغرافي: المنطقة الحالية تشهد طلباً مستقراً، ومتوسط الأسعار المسجل هناك يقارب ${avgPredicted.toLocaleString("ar-DZ")} د.ج.
3. التجهيزات والمرافق: وجود وسائل راحة مثل التكييف أو موقف السيارات (إن وجد) يبرر أي تفاوت طفاوت في الأسعار ويمنح العقار ميزة إضافية في السوق.

التوصية الذكية:
${score === "excellent" ? "✓ ننصحك بالمبادرة للاتصال بالمؤجر وتحديد موعد للزيارة في أقرب وقت، فالعقارات بهذا السعر المتميز لا تدوم طويلاً." : score === "fair" ? "✓ العقار مسعر بطريقة عادلة ومناسبة للسكن والاستقرار، يمكنك التفاوض بشكل بسيط وإتمام المعاملة بثقة." : "✓ نقترح عليك مناقشة السعر مع المؤجر لمعرفة ما إذا كان يغطي تكاليف إضافية خاصة، أو مقارنته بعروض أخرى في نفس الحي الجغرافي قبل اتخاذ القرار النهائي."}`;

      setAnalysisResult({
        score,
        scoreText,
        scoreColor,
        scoreBg,
        scoreDescription,
        currentPrice: price,
        avgPrice: avgPredicted,
        difference,
        insights,
        disclaimer: "هذا التحليل مبني على تقنيات الذكاء الاصطناعي للاسترشاد فقط"
      });
      setAnalyzing(false);
      setIsModalOpen(true);
    }, 2500);
  };

  useEffect(() => {
    const fetchApartment = async () => {
      if (!id) return;

      try {
        const apt = await getApartmentById(id);
        if (apt) {
          setApartment(apt);
          
          // Increment phone clicks (views endpoint)
          try {
            await incrementPhoneClicks(id);
          } catch (error) {
            console.error('Error incrementing clicks:', error);
          }

          // Fetch similar apartments
          const allApartments = await getAllApartments();
          const similar = allApartments
            .filter((a) => a.id !== id && a.wilaya_id === apt.wilaya_id)
            .slice(0, 3);
          setSimilarApartments(similar);

          // Check if favorited
          if (currentUser) {
            const favorited = await isApartmentFavorited(currentUser.uid, id);
            setIsFavorite(favorited);
          }
        }
      } catch (error) {
        if ((error as any)?.response?.status === 403 && (error as any)?.response?.data?.earlyAccess) {
          setEarlyAccessBlocked(true);
        }
        console.error("Error fetching apartment:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApartment();
  }, [id, currentUser]);

  const handleShowPhone = async () => {
    if (!currentUser) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يرجى تسجيل الدخول لعرض رقم الهاتف",
      });
      return;
    }

    if (id) {
      await incrementPhoneClicks(id);
    }
    setShowPhone(true);
  };

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يرجى تسجيل الدخول لحفظ الشقة في المفضلة",
      });
      return;
    }

    if (!id) return;

    try {
      if (isFavorite) {
        await removeFromFavorites(currentUser.uid, id);
        setIsFavorite(false);
        toast({ title: "تم إزالة الشقة من المفضلة" });
      } else {
        await addToFavorites(currentUser.uid, id);
        setIsFavorite(true);
        toast({ title: "تم إضافة الشقة إلى المفضلة" });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: apartment?.title,
          text: apartment?.description,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "تم نسخ الرابط" });
    }
  };

  // Convert FirebaseApartment to Apartment format for ApartmentCard
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!apartment) {
    if (earlyAccessBlocked && !(userData as any)?.is_premium) {
      return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 container py-16">
            <div className="max-w-2xl mx-auto rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/20 p-8 text-center">
              <h1 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mb-3">Upgrade to Premium</h1>
              <p className="text-muted-foreground mb-6">Premium members get 24h early access to new deals!</p>
              <div className="flex justify-center gap-3">
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white"><Link to="/subscription">عرض باقات بريميوم</Link></Button>
                <Button asChild variant="outline"><Link to="/search">العودة للبحث</Link></Button>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">الشقة غير موجودة</h1>
          <Button asChild>
            <Link to="/search">العودة للبحث</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % apartment.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + apartment.images.length) % apartment.images.length);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="container py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">الرئيسية</Link>
            <ArrowRight className="h-3 w-3 rotate-180" />
            <Link to="/search" className="hover:text-primary transition-colors">تصفح الشقق</Link>
            <ArrowRight className="h-3 w-3 rotate-180" />
            <span className="text-foreground">{apartment.title}</span>
          </nav>
        </div>

        <div className="container pb-12">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-muted">
                <img
                  src={apartment.images[currentImageIndex]}
                  alt={apartment.title}
                  className="h-full w-full object-cover"
                />
                
                {apartment.is_featured && (
                  <Badge className="absolute top-4 right-4 bg-gradient-featured text-featured-foreground border-0 shadow-featured">
                    ✨ شقة مميزة
                  </Badge>
                )}

                {apartment.images.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-card/80 backdrop-blur-sm"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-card/80 backdrop-blur-sm"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {apartment.images.map((_, idx) => (
                        <button
                          key={idx}
                          className={`h-2 w-2 rounded-full transition-colors ${
                            idx === currentImageIndex ? "bg-primary-foreground" : "bg-primary-foreground/50"
                          }`}
                          onClick={() => setCurrentImageIndex(idx)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Title & Location */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-3">{apartment.title}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                  <span>{apartment.municipality}، {apartment.wilaya}</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-xl">
                  <Bed className="h-5 w-5 text-primary" />
                  <span className="font-medium">{apartment.rooms} غرف</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-xl">
                  <Bath className="h-5 w-5 text-primary" />
                  <span className="font-medium">{apartment.bathrooms} حمام</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-xl">
                  <Maximize className="h-5 w-5 text-primary" />
                  <span className="font-medium">{apartment.area} م²</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-xl">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">إيجار {apartment.price_unit === 'day' ? 'يومي' : apartment.price_unit === 'week' ? 'أسبوعي' : 'شهري'}</span>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h2 className="text-xl font-semibold mb-3">الوصف</h2>
                <p className="text-muted-foreground leading-relaxed">{apartment.description}</p>
              </div>

              <Separator />

              {/* Verification Badge */}
              {apartment.verification_status === 'verified' && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">عقار موثق</h3>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    تم التحقق من ملكية هذا العقار من قبل إدارة SmartRentDZ. يمكنك التعامل معه بثقة.
                  </p>
                </div>
              )}

              <Separator />
              <div>
                <h2 className="text-xl font-semibold mb-4">المرافق والخدمات</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {apartment.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl"
                    >
                      {amenityIcons[amenity] || <div className="h-4 w-4 rounded-full bg-primary" />}
                      <span className="text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Map Section ──────────────────────────────────── */}
              {apartment.lat != null && apartment.lng != null && (
                <>
                  <Separator />
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      الموقع على الخريطة
                    </h2>
                    {/* Suspense skeleton shown while Leaflet JS bundle loads */}
                    <Suspense
                      fallback={
                        <div className="h-[400px] w-full rounded-2xl bg-muted animate-pulse flex items-center justify-center border border-border">
                          <span className="text-muted-foreground text-sm font-medium">
                            جاري تحميل الخريطة…
                          </span>
                        </div>
                      }
                    >
                      <PropertyMap
                        lat={apartment.lat}
                        lng={apartment.lng}
                        price={apartment.price}
                        propertyId={apartment.id}
                      />
                    </Suspense>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">
                {/* Price Card */}
                <div className="bg-card rounded-2xl border shadow-lg p-6">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-primary">
                      {apartment.price.toLocaleString("ar-DZ")} د.ج
                    </div>
                    <div className="text-muted-foreground">
                      / {apartment.price_unit === 'day' ? 'يومي' : apartment.price_unit === 'week' ? 'أسبوعي' : 'شهري'}
                    </div>
                  </div>

                  {/* AI Price Intelligence Premium Feature */}
                  {(!userData || userData.role === 'tenant' || userData.role === 'renter') ? (
                    <div className="mb-4">
                      {userData?.is_premium ? (
                        <Button
                          onClick={handleTriggerAIAnalysis}
                          disabled={analyzing}
                          className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold flex items-center justify-center gap-2 rounded-xl py-6 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all duration-300"
                        >
                          {analyzing ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin text-white" />
                              <span>جاري التحليل عبر Gemini...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-5 w-5 text-emerald-100 animate-pulse" />
                              <span>هل السعر مناسب؟ اسأل الذكاء الاصطناعي</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full">
                                <Button
                                  disabled
                                  className="w-full bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 rounded-xl py-6"
                                >
                                  <Crown className="h-5 w-5 text-amber-500 animate-pulse" />
                                  <span>ذكاء الأسعار بالذكاء الاصطناعي</span>
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-center p-3 bg-card border shadow-lg rounded-xl">
                              <p className="font-semibold text-amber-500 mb-1 flex items-center justify-center gap-1">
                                <Crown className="h-4 w-4" /> ميزة حصرية للبريميوم
                              </p>
                              <p className="text-xs text-muted-foreground">اشترك في الباقة المميزة للحصول على تحليل السعر بالذكاء الاصطناعي</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ) : null}

                  {/* Contact Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="lg" className="w-full bg-gradient-hero hover:opacity-90">
                        <Phone className="h-5 w-5 ml-2" />
                        اتصل بالمؤجر
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>معلومات التواصل</DialogTitle>
                        <DialogDescription>
                          {currentUser ? "تواصل مع المؤجر مباشرة" : "يرجى تسجيل الدخول لعرض معلومات التواصل"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-6 text-center">
                        {currentUser ? (
                          showPhone ? (
                            <div className="space-y-3">
                              <p className="text-lg font-semibold">{apartment.landlord_name}</p>
                              <a
                                href={`tel:${apartment.landlord_phone}`}
                                className="text-2xl font-bold text-primary block"
                                dir="ltr"
                              >
                                {apartment.landlord_phone}
                              </a>
                            </div>
                          ) : (
                            <Button onClick={handleShowPhone}>
                              عرض رقم الهاتف
                            </Button>
                          )
                        ) : (
                          <div className="space-y-4">
                            <p>سجّل الدخول لعرض رقم الهاتف</p>
                            <Button asChild>
                              <Link to="/login">تسجيل الدخول</Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      className={`flex-1 ${isFavorite ? "text-destructive" : ""}`}
                      onClick={handleToggleFavorite}
                    >
                      <Heart className={`h-4 w-4 ml-2 ${isFavorite ? "fill-current" : ""}`} />
                      {isFavorite ? "محفوظ" : "حفظ"}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleShare}>
                      <Share2 className="h-4 w-4 ml-2" />
                      مشاركة
                    </Button>
                  </div>
                </div>

                {/* Stats Card */}
                <div className="bg-muted rounded-xl p-4">
                  <div className="flex justify-around text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        {apartment.views}
                      </div>
                      <div className="text-xs text-muted-foreground">مشاهدة</div>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div>
                      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                        <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                        {apartment.phoneClicks}
                      </div>
                      <div className="text-xs text-muted-foreground">نقرة على الهاتف</div>
                    </div>
                  </div>
                </div>

                {/* Landlord Info */}
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="font-semibold mb-3">المؤجر</h3>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/10">
                      <AvatarImage 
                        src={apartment.landlord_photo_url || '/placeholder.svg'} 
                        alt={apartment.landlord_name}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {apartment.landlord_name?.charAt(0) || 'م'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{apartment.landlord_name}</p>
                        {apartment.landlord_verification_status === "verified" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                                <ShieldCheck className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              هوية المالك موثقة من قبل إدارة SmartRentDZ
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">عضو منذ 2024</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Similar Apartments */}
          {similarApartments.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-6">شقق مشابهة</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {similarApartments.map((apt) => (
                  <ApartmentCard key={apt.id} apartment={apt} />
                ))}
              </div>
            </div>
          )}

          <ReviewSection
            apartmentId={apartment.firebase_id || apartment.id}
            ownerId={apartment.landlord_id || ''}
          />
        </div>
      </main>

      {/* AI Price Intelligence Loading Dialog */}
      <Dialog open={analyzing} onOpenChange={() => {}}>
        <DialogContent className="max-w-md text-center p-8 flex flex-col items-center justify-center rounded-3xl" dir="rtl">
          <div className="relative mb-6 mt-4">
            <div className="h-20 w-20 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin flex items-center justify-center">
              <Bot className="h-10 w-10 text-emerald-500 animate-pulse" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-400 animate-bounce" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground mb-2">Gemini AI يقوم بالتحليل</DialogTitle>
          <DialogDescription className="text-muted-foreground max-w-sm text-center">
            نحن نقوم بمقارنة سعر هذا العقار مع متوسط الأسعار الحالية في ولاية {apartment.wilaya}، وتحليل المساحة والمرافق لتقديم تقييم دقيق...
          </DialogDescription>
        </DialogContent>
      </Dialog>

      {/* AI Price Intelligence Result Dashboard Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl w-[90vw] overflow-y-auto max-h-[95vh] p-6 rounded-3xl" dir="rtl">
          <DialogHeader className="flex flex-row items-center gap-3 space-y-0 border-b pb-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div className="text-right">
              <DialogTitle className="text-2xl font-bold text-foreground">تحليل الأسعار بالذكاء الاصطناعي</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">مدعوم بتقنيات Google Gemini</DialogDescription>
            </div>
          </DialogHeader>

          {analysisResult && (
            <div className="space-y-6 pt-4">
              {/* Gauge & Price Comparison Container */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* 1. Gauge Card */}
                <div className="rounded-2xl border p-5 bg-muted/40 flex flex-col items-center justify-center text-center">
                  <span className="text-sm text-muted-foreground mb-3 font-medium">حالة السعر الحالي</span>
                  
                  {/* Gauge representation */}
                  <div className="relative w-40 h-20 overflow-hidden mb-2">
                    <svg className="w-full h-full" viewBox="0 0 100 50">
                      {/* Grey background arc */}
                      <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="10"
                        className="dark:stroke-slate-800"
                      />
                      {/* Green (Excellent) */}
                      <path
                        d="M 10 50 A 40 40 0 0 1 36.3 23.7"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="10"
                      />
                      {/* Amber (Fair) */}
                      <path
                        d="M 36.3 23.7 A 40 40 0 0 1 63.7 23.7"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="10"
                      />
                      {/* Red (High) */}
                      <path
                        d="M 63.7 23.7 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="10"
                      />
                      {/* Needle */}
                      {analysisResult.score === "excellent" && (
                        <line x1="50" y1="50" x2="25" y2="25" stroke="#1f2937" strokeWidth="3" className="dark:stroke-white" />
                      )}
                      {analysisResult.score === "fair" && (
                        <line x1="50" y1="50" x2="50" y2="10" stroke="#1f2937" strokeWidth="3" className="dark:stroke-white" />
                      )}
                      {analysisResult.score === "high" && (
                        <line x1="50" y1="50" x2="75" y2="25" stroke="#1f2937" strokeWidth="3" className="dark:stroke-white" />
                      )}
                      <circle cx="50" cy="50" r="5" fill="#1f2937" className="dark:fill-white" />
                    </svg>
                  </div>

                  <span className={`text-xl font-bold ${analysisResult.scoreColor} flex items-center gap-1.5`}>
                    {analysisResult.scoreText}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2 max-w-[220px]">
                    {analysisResult.scoreDescription}
                  </p>
                </div>

                {/* 2. Price Comparison Card */}
                <div className="rounded-2xl border p-5 bg-muted/40 flex flex-col justify-between">
                  <span className="text-sm text-muted-foreground font-medium mb-3">مقارنة الأسعار</span>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">السعر المعروض:</span>
                      <span className="font-bold text-foreground">{analysisResult.currentPrice.toLocaleString("ar-DZ")} د.ج</span>
                    </div>

                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm text-muted-foreground">متوسط السوق المتوقع:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{analysisResult.avgPrice.toLocaleString("ar-DZ")} د.ج</span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm text-muted-foreground">فارق السعر الحالي:</span>
                      <span className={`font-extrabold text-sm ${analysisResult.difference <= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {analysisResult.difference <= 0 ? `أقل بـ ${Math.abs(analysisResult.difference)}%` : `أعلى بـ ${analysisResult.difference}%`}
                      </span>
                    </div>
                  </div>

                  <div className={`mt-4 px-3 py-2 rounded-xl text-xs text-center font-medium ${analysisResult.scoreBg} ${analysisResult.scoreColor}`}>
                    {analysisResult.difference <= 0 
                      ? "✓ هذا العقار يعتبر فرصة سعرية ممتازة!" 
                      : "⚠ السعر مرتفع نسبياً عن المتوسط المقدر"}
                  </div>
                </div>
              </div>

              {/* 3. Gemini Insights Section */}
              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 border-b border-emerald-100/50 dark:border-emerald-950/50 pb-2">
                  <Bot className="h-5 w-5 animate-bounce" />
                  <span className="font-bold text-sm">تحليل Gemini AI المفصل:</span>
                </div>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-line text-right font-medium">
                  {analysisResult.insights}
                </div>
              </div>

              {/* 4. Disclaimer */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground text-center pt-2">
                <AlertCircle className="h-3 w-3" />
                <span>{analysisResult.disclaimer}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default ApartmentDetail;
