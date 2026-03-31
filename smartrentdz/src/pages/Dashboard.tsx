import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Heart,
  Settings,
  Plus,
  Eye,
  MousePointerClick,
  TrendingUp,
  Edit,
  Pause,
  Play,
  Star,
  Crown,
  User,
  Bell,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApartmentCard from "@/components/ApartmentCard";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getApartmentsByLandlord, 
  toggleApartmentStatus as toggleStatus,
  deleteApartment,
  Apartment
} from "@/services/apartmentService";
import { getUserFavorites, removeFromFavorites } from "@/services/favoritesService";
import { getApartmentById } from "@/services/apartmentService";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [userApartments, setUserApartments] = useState<Apartment[]>([]);
  const [favoriteApartments, setFavoriteApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalPhoneClicks: 0,
    thisMonthViews: 0,
    thisMonthClicks: 0,
  });

  const isLandlord = userData?.type === "landlord";

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        if (isLandlord) {
          // Fetch landlord's apartments
          const apartments = await getApartmentsByLandlord(currentUser.uid);
          setUserApartments(apartments);

          // Calculate stats
          const totalViews = apartments.reduce((sum, apt) => sum + (apt.views || 0), 0);
          const totalClicks = apartments.reduce((sum, apt) => sum + (apt.phone_clicks || 0), 0);
          setStats({
            totalViews,
            totalPhoneClicks: totalClicks,
            thisMonthViews: Math.floor(totalViews * 0.3),
            thisMonthClicks: Math.floor(totalClicks * 0.3),
          });
        } else {
          // Fetch favorites for renter
          const favoriteIds = await getUserFavorites(currentUser.uid);
          const apartments: Apartment[] = [];
          for (const id of favoriteIds) {
            const apt = await getApartmentById(id);
            if (apt) apartments.push(apt);
          }
          setFavoriteApartments(apartments);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, isLandlord]);

  const handleToggleStatus = async (id: string) => {
    const apartment = userApartments.find((apt) => apt.id === id);
    if (!apartment) return;

    try {
      await toggleStatus(id, !apartment.is_active);
      setUserApartments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, is_active: !apt.is_active } : apt))
      );
      toast({
        title: apartment.is_active ? "تم إيقاف الإعلان" : "تم تفعيل الإعلان",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الحالة",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApartment = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الشقة؟")) return;

    try {
      await deleteApartment(id);
      setUserApartments((prev) => prev.filter((apt) => apt.id !== id));
      toast({ title: "تم حذف الشقة بنجاح" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الشقة",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    if (!currentUser) return;

    try {
      await removeFromFavorites(currentUser.uid, id);
      setFavoriteApartments((prev) => prev.filter((apt) => apt.id !== id));
      toast({ title: "تم إزالة الشقة من المفضلة" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إزالة الشقة من المفضلة",
        variant: "destructive",
      });
    }
  };

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

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />

      <main className="flex-1">
        <div className="container py-8">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {userData?.name?.charAt(0) || "م"}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">مرحباً، {userData?.name || "مستخدم"}</h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  {isLandlord ? (
                    <>
                      <Building2 className="h-4 w-4" />
                      <span>حساب مؤجّر</span>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4" />
                      <span>حساب مستأجر</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4 ml-2" />
                  الإعدادات
                </Link>
              </Button>
              {isLandlord && (
                <Button asChild>
                  <Link to="/add-apartment">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة شقة
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {isLandlord ? (
            <>
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4 mb-8">
                <div className="bg-card rounded-xl border p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalViews}</p>
                      <p className="text-sm text-muted-foreground">إجمالي المشاهدات</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-xl border p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <MousePointerClick className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalPhoneClicks}</p>
                      <p className="text-sm text-muted-foreground">نقرات الهاتف</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-xl border p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.thisMonthViews}</p>
                      <p className="text-sm text-muted-foreground">مشاهدات هذا الشهر</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-xl border p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-featured/20 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-featured" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userApartments.length}</p>
                      <p className="text-sm text-muted-foreground">الشقق المنشورة</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Banner */}
              <div className="bg-gradient-hero rounded-xl p-6 mb-8 text-primary-foreground">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Crown className="h-5 w-5" />
                      ترقية حسابك
                    </h3>
                    <p className="text-primary-foreground/80">
                      احصل على مميزات إضافية وزد من ظهور شققك
                    </p>
                  </div>
                  <Button variant="secondary" asChild>
                    <Link to="/subscription">تعرف على الباقات</Link>
                  </Button>
                </div>
              </div>

              {/* My Apartments */}
              <div className="bg-card rounded-xl border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">شققي</h2>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/add-apartment">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة شقة
                    </Link>
                  </Button>
                </div>

                {userApartments.length > 0 ? (
                  <div className="space-y-4">
                    {userApartments.map((apartment) => (
                      <div
                        key={apartment.id}
                        className="flex flex-col md:flex-row gap-4 p-4 bg-muted/50 rounded-xl"
                      >
                        <img
                          src={apartment.images[0]}
                          alt={apartment.title}
                          className="w-full md:w-40 h-28 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{apartment.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {apartment.municipality}، {apartment.wilaya}
                              </p>
                            </div>
                            <Badge variant={apartment.isActive ? "default" : "secondary"}>
                              {apartment.isActive ? "نشط" : "متوقف"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {apartment.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <MousePointerClick className="h-4 w-4" />
                              {apartment.phone_clicks}
                            </span>
                          </div>
                        </div>
                        <div className="flex md:flex-col gap-2 justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/apartment/${apartment.id}`}>
                              <Eye className="h-4 w-4 ml-1" />
                              عرض
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/edit-apartment/${apartment.id}`}>
                              <Edit className="h-4 w-4 ml-1" />
                              تعديل
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(apartment.id!)}
                          >
                            {apartment.isActive ? (
                              <>
                                <Pause className="h-4 w-4 ml-1" />
                                إيقاف
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 ml-1" />
                                تفعيل
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteApartment(apartment.id!)}
                          >
                            <Trash2 className="h-4 w-4 ml-1" />
                            حذف
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">لا توجد شقق بعد</h3>
                    <p className="text-muted-foreground mb-4">
                      أضف شقتك الأولى وابدأ في استقبال الطلبات
                    </p>
                    <Button asChild>
                      <Link to="/add-apartment">
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة شقة
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Renter Dashboard
            <div className="bg-card rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Heart className="h-5 w-5 text-destructive" />
                شققي المفضلة
              </h2>

              {favoriteApartments.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {favoriteApartments.map((apartment) => (
                    <ApartmentCard
                      key={apartment.id}
                      apartment={apartment}
                      isFavorite
                      onFavoriteClick={handleRemoveFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">لا توجد شقق محفوظة</h3>
                  <p className="text-muted-foreground mb-4">
                    ابدأ بتصفح الشقق واحفظ ما يعجبك
                  </p>
                  <Button asChild>
                    <Link to="/search">تصفح الشقق</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
