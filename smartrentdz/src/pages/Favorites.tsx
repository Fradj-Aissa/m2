import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApartmentCard from "@/components/ApartmentCard";
import { useAuth } from "@/contexts/AuthContext";
import { getUserFavorites, removeFromFavorites } from "@/services/favoritesService";
import { getApartmentById, Apartment } from "@/services/apartmentService";
import { useToast } from "@/hooks/use-toast";

const Favorites = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const favoriteIds = await getUserFavorites(currentUser.uid);
        const apartments: Apartment[] = [];
        for (const id of favoriteIds) {
          const apt = await getApartmentById(id);
          if (apt) apartments.push(apt);
        }
        setFavorites(apartments);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [currentUser]);

  const removeFavorite = async (id: string) => {
    if (!currentUser) return;

    try {
      await removeFromFavorites(currentUser.uid, id);
      setFavorites((prev) => prev.filter((apt) => apt.id !== id));
      toast({ title: "تم إزالة الشقة من المفضلة" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
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

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="container py-16 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
              <Heart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">تسجيل الدخول مطلوب</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              يرجى تسجيل الدخول لعرض الشقق المحفوظة في المفضلة
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link to="/login">تسجيل الدخول</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/register">إنشاء حساب</Link>
              </Button>
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

      <main className="flex-1">
        <div className="container py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <Heart className="h-8 w-8 text-destructive" />
                شققي المفضلة
              </h1>
              <p className="text-muted-foreground mt-1">
                {favorites.length} شقة محفوظة
              </p>
            </div>
          </div>

          {favorites.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((apartment) => (
                <div key={apartment.id} className="relative">
                  <ApartmentCard
                    apartment={apartment}
                    isFavorite={true}
                    onFavoriteClick={removeFavorite}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
                <Heart className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">لا توجد شقق محفوظة</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                ابدأ بتصفح الشقق واحفظ ما يعجبك للعودة إليها لاحقاً
              </p>
              <Button asChild>
                <Link to="/search">
                  <Search className="h-4 w-4 ml-2" />
                  تصفح الشقق
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Favorites;
