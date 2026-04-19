import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, SlidersHorizontal, Grid, List, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApartmentCard from "@/components/ApartmentCard";
import { wilayas } from "@/data/wilayas";
import { getAllApartments, Apartment } from "@/services/apartmentService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addToFavorites, removeFromFavorites, getUserFavorites } from "@/services/favoritesService";

const NearbySearchMap = lazy(() => import("@/components/NearbySearchMap"));

// Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Map / Nearby Search State
  const [isMapMode, setIsMapMode] = useState(false);
  const [searchCenter, setSearchCenter] = useState({ lat: 36.7525, lng: 3.04197 }); // Default Algiers
  const [searchRadius, setSearchRadius] = useState(10); // 10 km default radius

  const selectedWilaya = searchParams.get("wilaya") || "";
  const selectedPriceUnit = searchParams.get("priceUnit") || "";
  const selectedRooms = searchParams.get("rooms") || "";

  useEffect(() => {
    const fetchApartments = async () => {
      try {
        const data = await getAllApartments();
        setApartments(data);
      } catch (error) {
        console.error("Error fetching apartments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApartments();
  }, []);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!currentUser) {
        setFavoriteIds([]);
        return;
      }

      try {
        const ids = await getUserFavorites(currentUser.uid);
        setFavoriteIds(ids);
      } catch (error) {
        console.error("Error fetching user favorites:", error);
      }
    };

    fetchFavorites();
  }, [currentUser]);

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
    setPriceRange([0, 100000]);
  };

  const filteredApartments = useMemo(() => {
    return apartments.filter((apartment) => {
      if (selectedWilaya && apartment.wilaya_id.toString() !== selectedWilaya) {
        return false;
      }
      if (selectedPriceUnit && apartment.price_unit !== selectedPriceUnit) {
        return false;
      }
      if (selectedRooms) {
        const rooms = parseInt(selectedRooms);
        if (rooms === 4 && apartment.rooms < 4) return false;
        if (rooms !== 4 && apartment.rooms !== rooms) return false;
      }
      if (apartment.price < priceRange[0] || apartment.price > priceRange[1]) {
        return false;
      }
      
      // Map Search Filter
      if (isMapMode && apartment.lat && apartment.lng) {
        const dist = calculateDistance(searchCenter.lat, searchCenter.lng, apartment.lat, apartment.lng);
        if (dist > searchRadius) return false;
      }

      return true;
    });
  }, [apartments, selectedWilaya, selectedPriceUnit, selectedRooms, priceRange, isMapMode, searchCenter, searchRadius]);

  const activeFiltersCount = [selectedWilaya, selectedPriceUnit, selectedRooms].filter(Boolean).length;

  const handleToggleFavorite = async (apartment: Apartment) => {
    if (!currentUser) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يرجى تسجيل الدخول لحفظ الشقة في المفضلة",
      });
      return;
    }

    const apartmentId = apartment.firebase_id || apartment.id;
    const isFavorited = favoriteIds.includes(apartmentId);

    try {
      if (isFavorited) {
        await removeFromFavorites(currentUser.uid, apartmentId);
        setFavoriteIds((prev) => prev.filter((id) => id !== apartmentId));
        toast({ title: "تم إزالة الشقة من المفضلة" });
      } else {
        await addToFavorites(currentUser.uid, apartmentId);
        setFavoriteIds((prev) => [...prev, apartmentId]);
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

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Wilaya */}
      <div className="space-y-3">
        <label className="text-sm font-medium">الولاية</label>
        <Select value={selectedWilaya || "all"} onValueChange={(v) => updateFilter("wilaya", v)}>
          <SelectTrigger>
            <SelectValue placeholder="جميع الولايات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الولايات</SelectItem>
            {wilayas.map((w) => (
              <SelectItem key={w.id} value={w.id.toString()}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Unit */}
      <div className="space-y-3">
        <label className="text-sm font-medium">مدة الكراء</label>
        <Select value={selectedPriceUnit || "all"} onValueChange={(v) => updateFilter("priceUnit", v)}>
          <SelectTrigger>
            <SelectValue placeholder="جميع المدد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المدد</SelectItem>
            <SelectItem value="day">يومي</SelectItem>
            <SelectItem value="week">أسبوعي</SelectItem>
            <SelectItem value="month">شهري</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rooms */}
      <div className="space-y-3">
        <label className="text-sm font-medium">عدد الغرف</label>
        <Select value={selectedRooms || "all"} onValueChange={(v) => updateFilter("rooms", v)}>
          <SelectTrigger>
            <SelectValue placeholder="أي عدد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">أي عدد</SelectItem>
            <SelectItem value="1">غرفة واحدة</SelectItem>
            <SelectItem value="2">غرفتان</SelectItem>
            <SelectItem value="3">3 غرف</SelectItem>
            <SelectItem value="4">4+ غرف</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <label className="text-sm font-medium">نطاق السعر</label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={100000}
          step={1000}
          className="mt-6"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{priceRange[0].toLocaleString("ar-DZ")} د.ج</span>
          <span>{priceRange[1].toLocaleString("ar-DZ")} د.ج</span>
        </div>
      </div>

      {/* Radius Filter - Only visible in Map Mode */}
      {isMapMode && (
        <div className="space-y-3">
          <label className="text-sm font-medium">نطاق البحث (مسافة التقريب)</label>
          <Slider
            value={[searchRadius]}
            onValueChange={(v) => setSearchRadius(v[0])}
            max={50}
            min={1}
            step={1}
            className="mt-6"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>1 كم</span>
            <span>{searchRadius} كم</span>
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          مسح الفلاتر
        </Button>
      )}
    </div>
  );

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
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container py-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">تصفح الشقق</h1>
            <p className="text-muted-foreground mt-1">
              {filteredApartments.length} شقة متاحة
            </p>
          </div>

          <div className="flex gap-6">
            {/* Desktop Sidebar Filters */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-20 bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  الفلاتر
                </h3>
                <FilterContent />
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6 gap-4">
                {/* Mobile Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden">
                      <SlidersHorizontal className="h-4 w-4 ml-2" />
                      الفلاتر
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="mr-2">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetHeader>
                      <SheetTitle>الفلاتر</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Sort & View */}
                <div className="flex items-center gap-3 mr-auto">
                  <Select defaultValue="newest">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="ترتيب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">الأحدث</SelectItem>
                      <SelectItem value="price-low">السعر: الأقل</SelectItem>
                      <SelectItem value="price-high">السعر: الأعلى</SelectItem>
                      <SelectItem value="views">الأكثر مشاهدة</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="hidden md:flex border rounded-lg">
                    <Button
                      variant={viewMode === "grid" && !isMapMode ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => { setViewMode("grid"); setIsMapMode(false); }}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" && !isMapMode ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => { setViewMode("list"); setIsMapMode(false); }}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={isMapMode ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setIsMapMode(true)}
                      className={isMapMode ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                    >
                      <MapIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Active Filters Tags */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedWilaya && (
                    <Badge variant="secondary" className="gap-1">
                      {wilayas.find((w) => w.id.toString() === selectedWilaya)?.name}
                      <button onClick={() => updateFilter("wilaya", "")} className="mr-1 hover:text-destructive">×</button>
                    </Badge>
                  )}
                  {selectedPriceUnit && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedPriceUnit === "day" ? "يومي" : selectedPriceUnit === "week" ? "أسبوعي" : "شهري"}
                      <button onClick={() => updateFilter("priceUnit", "")} className="mr-1 hover:text-destructive">×</button>
                    </Badge>
                  )}
                  {selectedRooms && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedRooms === "1" ? "غرفة واحدة" : selectedRooms === "2" ? "غرفتان" : selectedRooms === "3" ? "3 غرف" : "4+ غرف"}
                      <button onClick={() => updateFilter("rooms", "")} className="mr-1 hover:text-destructive">×</button>
                    </Badge>
                  )}
                </div>
              )}

              {/* Map View Toggle */}
              {isMapMode && (
                <div className="mb-6 rounded-xl overflow-hidden border">
                  <Suspense
                    fallback={
                      <div className="h-[500px] w-full rounded-xl bg-muted animate-pulse flex items-center justify-center border border-border">
                        <span className="text-muted-foreground font-medium">جاري تحميل الخريطة...</span>
                      </div>
                    }
                  >
                    <NearbySearchMap
                      apartments={filteredApartments}
                      centerLat={searchCenter.lat}
                      centerLng={searchCenter.lng}
                      onSearchPinMove={(lat, lng) => setSearchCenter({ lat, lng })}
                    />
                  </Suspense>
                </div>
              )}

              {/* Results */}
              {filteredApartments.length > 0 ? (
                <div className={viewMode === "grid" ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
                  {filteredApartments.map((apartment) => {
                const apartmentId = apartment.firebase_id || apartment.id;
                const isFavorited = favoriteIds.includes(apartmentId);
                
                // Calculate distance for badge
                let distanceLabel;
                if (isMapMode && apartment.lat && apartment.lng) {
                  const dist = calculateDistance(searchCenter.lat, searchCenter.lng, apartment.lat, apartment.lng);
                  distanceLabel = `يبعد ${dist.toFixed(1)} كم`;
                }

                return (
                  <div key={apartment.id} className="relative">
                    <ApartmentCard
                      apartment={apartment}
                      isFavorite={isFavorited}
                      onFavoriteClick={() => handleToggleFavorite(apartment)}
                    />
                    {distanceLabel && (
                      <div className="absolute top-2 right-2 pointer-events-none z-10 w-full flex justify-end pr-10">
                        <Badge variant="secondary" className="bg-white/90 text-primary shadow-sm backdrop-blur-md font-bold">
                          {distanceLabel}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">لا توجد شقق تطابق معايير البحث</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    مسح الفلاتر وعرض الكل
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Search;
