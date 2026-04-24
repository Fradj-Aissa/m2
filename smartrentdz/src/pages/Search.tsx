import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, Grid, List, MapIcon, SlidersHorizontal } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApartmentCard from "@/components/ApartmentCard";
import SmartSearch from "@/components/SmartSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { wilayas } from "@/data/wilayas";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { SmartSearchFilters } from "@/services/aiSearchService";
import { Apartment, getAllApartments } from "@/services/apartmentService";
import {
  addToFavorites,
  getUserFavorites,
  removeFromFavorites,
} from "@/services/favoritesService";

const NearbySearchMap = lazy(() => import("@/components/NearbySearchMap"));
const DEFAULT_PRICE_RANGE: [number, number] = [0, 100000];
const ROOM_FILTER_OPTIONS = [
  { value: "1", label: "غرفة واحدة" },
  { value: "2", label: "غرفتان" },
  { value: "3", label: "3 غرف" },
  { value: "2plus", label: "2+ غرف" },
  { value: "3plus", label: "3+ غرف" },
  { value: "4plus", label: "4+ غرف" },
] as const;

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
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

function normalizeArabicText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ولاية/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function matchesNormalizedText(source: string, target: string) {
  const normalizedSource = normalizeArabicText(source);
  const normalizedTarget = normalizeArabicText(target);

  return (
    normalizedSource === normalizedTarget ||
    normalizedSource.includes(normalizedTarget) ||
    normalizedTarget.includes(normalizedSource)
  );
}

function findWilayaIdByName(wilayaName: string | null) {
  if (!wilayaName) {
    return "";
  }

  const normalizedTarget = normalizeArabicText(wilayaName);
  const matchedWilaya = wilayas.find((wilaya) => {
    const normalizedWilaya = normalizeArabicText(wilaya.name);
    return (
      normalizedWilaya === normalizedTarget ||
      normalizedWilaya.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedWilaya)
    );
  });

  return matchedWilaya ? matchedWilaya.id.toString() : "";
}

function getRoomsDropdownValue(minRooms: number | null, maxRooms: number | null) {
  if (minRooms !== null && maxRooms !== null && minRooms === maxRooms) {
    if ([1, 2, 3].includes(minRooms)) {
      return minRooms.toString();
    }
  }

  if (minRooms !== null && maxRooms === null) {
    if (minRooms >= 4) return "4plus";
    if (minRooms === 3) return "3plus";
    if (minRooms === 2) return "2plus";
  }

  return "";
}

function matchesRoomsFilter(apartmentRooms: number, selectedRooms: string) {
  if (!selectedRooms) {
    return true;
  }

  if (selectedRooms === "2plus") {
    return apartmentRooms >= 2;
  }

  if (selectedRooms === "3plus") {
    return apartmentRooms >= 3;
  }

  if (selectedRooms === "4plus") {
    return apartmentRooms >= 4;
  }

  return apartmentRooms === Number(selectedRooms);
}

function getRoomsBadgeLabel(value: string) {
  return ROOM_FILTER_OPTIONS.find((option) => option.value === value)?.label || value;
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMapMode, setIsMapMode] = useState(false);
  const [searchCenter, setSearchCenter] = useState({ lat: 36.7525, lng: 3.04197 });
  const [searchRadius, setSearchRadius] = useState(10);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const selectedWilaya = searchParams.get("wilaya") || "";
  const selectedPriceUnit = searchParams.get("priceUnit") || "";
  const selectedRooms = searchParams.get("rooms") || "";
  const selectedMunicipality = searchParams.get("municipality") || "";
  const selectedPropertyType = searchParams.get("propertyType") || "";
  const selectedMinPrice = searchParams.get("minPrice") || "";
  const selectedMaxPrice = searchParams.get("maxPrice") || "";
  const selectedMinRooms = searchParams.get("minRooms") || "";
  const selectedMaxRooms = searchParams.get("maxRooms") || "";

  useEffect(() => {
    const nextMin = selectedMinPrice ? Number(selectedMinPrice) : DEFAULT_PRICE_RANGE[0];
    const nextMax = selectedMaxPrice ? Number(selectedMaxPrice) : DEFAULT_PRICE_RANGE[1];
    setPriceRange([nextMin, nextMax]);
  }, [selectedMinPrice, selectedMaxPrice]);

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

    void fetchApartments();
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

    void fetchFavorites();
  }, [currentUser]);

  const hasPropertyTypeData = useMemo(
    () => apartments.some((apartment) => Boolean(apartment.property_type)),
    [apartments]
  );

  const updateFilter = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value && value !== "all") {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    setSearchParams({});
    setPriceRange(DEFAULT_PRICE_RANGE);
  };

  const applySmartFilters = (filters: SmartSearchFilters) => {
    const nextParams = new URLSearchParams(searchParams);
    const wilayaId = findWilayaIdByName(filters.wilaya);
    const roomsDropdownValue = getRoomsDropdownValue(filters.minRooms, filters.maxRooms);

    if (wilayaId) nextParams.set("wilaya", wilayaId);
    else nextParams.delete("wilaya");

    if (filters.municipality) nextParams.set("municipality", filters.municipality);
    else nextParams.delete("municipality");

    if (filters.priceUnit) nextParams.set("priceUnit", filters.priceUnit);
    else nextParams.delete("priceUnit");

    if (filters.propertyType) nextParams.set("propertyType", filters.propertyType);
    else nextParams.delete("propertyType");

    if (filters.minPrice !== null) nextParams.set("minPrice", filters.minPrice.toString());
    else nextParams.delete("minPrice");

    if (filters.maxPrice !== null) nextParams.set("maxPrice", filters.maxPrice.toString());
    else nextParams.delete("maxPrice");

    if (roomsDropdownValue) {
      nextParams.set("rooms", roomsDropdownValue);
      nextParams.delete("minRooms");
      nextParams.delete("maxRooms");
    } else {
      nextParams.delete("rooms");

      if (filters.minRooms !== null) nextParams.set("minRooms", filters.minRooms.toString());
      else nextParams.delete("minRooms");

      if (filters.maxRooms !== null) nextParams.set("maxRooms", filters.maxRooms.toString());
      else nextParams.delete("maxRooms");
    }

    setSearchParams(nextParams);
    setPriceRange([filters.minPrice ?? DEFAULT_PRICE_RANGE[0], filters.maxPrice ?? DEFAULT_PRICE_RANGE[1]]);
  };

  const filteredApartments = useMemo(() => {
    return apartments.filter((apartment) => {
      if (selectedWilaya && apartment.wilaya_id.toString() !== selectedWilaya) {
        return false;
      }

      if (selectedPriceUnit && apartment.price_unit !== selectedPriceUnit) {
        return false;
      }

      if (selectedMunicipality && !matchesNormalizedText(apartment.municipality, selectedMunicipality)) {
        return false;
      }

      if (selectedRooms && !matchesRoomsFilter(apartment.rooms, selectedRooms)) {
        return false;
      }

      if (selectedMinRooms && apartment.rooms < Number(selectedMinRooms)) {
        return false;
      }

      if (selectedMaxRooms && apartment.rooms > Number(selectedMaxRooms)) {
        return false;
      }

      if (
        selectedPropertyType &&
        hasPropertyTypeData &&
        apartment.property_type !== selectedPropertyType
      ) {
        return false;
      }

      if (apartment.price < priceRange[0] || apartment.price > priceRange[1]) {
        return false;
      }

      if (isMapMode && apartment.lat && apartment.lng) {
        const distance = calculateDistance(
          searchCenter.lat,
          searchCenter.lng,
          apartment.lat,
          apartment.lng
        );

        if (distance > searchRadius) {
          return false;
        }
      }

      return true;
    });
  }, [
    apartments,
    hasPropertyTypeData,
    isMapMode,
    priceRange,
    searchCenter.lat,
    searchCenter.lng,
    searchRadius,
    selectedMaxRooms,
    selectedMinRooms,
    selectedMunicipality,
    selectedPriceUnit,
    selectedPropertyType,
    selectedRooms,
    selectedWilaya,
  ]);

  const hasManualPriceRangeFilter =
    !selectedMinPrice &&
    !selectedMaxPrice &&
    (priceRange[0] !== DEFAULT_PRICE_RANGE[0] || priceRange[1] !== DEFAULT_PRICE_RANGE[1]);

  const activeFiltersCount = [
    selectedWilaya,
    selectedPriceUnit,
    selectedRooms,
    selectedMunicipality,
    selectedPropertyType,
    selectedMinRooms,
    selectedMaxRooms,
    selectedMinPrice,
    selectedMaxPrice,
    hasManualPriceRangeFilter ? "priceRange" : "",
  ].filter(Boolean).length;

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
        setFavoriteIds((previous) => previous.filter((id) => id !== apartmentId));
        toast({ title: "تمت إزالة الشقة من المفضلة" });
      } else {
        await addToFavorites(currentUser.uid, apartmentId);
        setFavoriteIds((previous) => [...previous, apartmentId]);
        toast({ title: "تمت إضافة الشقة إلى المفضلة" });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المفضلة. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium">الولاية</label>
        <Select value={selectedWilaya || "all"} onValueChange={(value) => updateFilter("wilaya", value)}>
          <SelectTrigger>
            <SelectValue placeholder="جميع الولايات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الولايات</SelectItem>
            {wilayas.map((wilaya) => (
              <SelectItem key={wilaya.id} value={wilaya.id.toString()}>
                {wilaya.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">البلدية</label>
        <Input
          value={selectedMunicipality}
          onChange={(event) => updateFilter("municipality", event.target.value)}
          placeholder="مثال: عين وسارة"
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">نوع العقار</label>
        <Select
          value={selectedPropertyType || "all"}
          onValueChange={(value) => updateFilter("propertyType", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="كل الأنواع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="Apartment">شقة</SelectItem>
            <SelectItem value="House">منزل</SelectItem>
            <SelectItem value="Studio">ستوديو</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">مدة الكراء</label>
        <Select value={selectedPriceUnit || "all"} onValueChange={(value) => updateFilter("priceUnit", value)}>
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

      <div className="space-y-3">
        <label className="text-sm font-medium">عدد الغرف</label>
        <Select value={selectedRooms || "all"} onValueChange={(value) => updateFilter("rooms", value)}>
          <SelectTrigger>
            <SelectValue placeholder="أي عدد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">أي عدد</SelectItem>
            {ROOM_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">نطاق السعر</label>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          max={100000}
          step={1000}
          className="mt-6"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{priceRange[0].toLocaleString("ar-DZ")} د.ج</span>
          <span>{priceRange[1].toLocaleString("ar-DZ")} د.ج</span>
        </div>
      </div>

      {isMapMode && (
        <div className="space-y-3">
          <label className="text-sm font-medium">نطاق البحث على الخريطة</label>
          <Slider
            value={[searchRadius]}
            onValueChange={(value) => setSearchRadius(value[0])}
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
        <main className="flex flex-1 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
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
          <div className="mb-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">تصفح الشقق</h1>
              <p className="mt-1 text-muted-foreground">{filteredApartments.length} شقة متاحة</p>
            </div>
            <SmartSearch onApplyFilters={applySmartFilters} />
          </div>

          <div className="flex gap-6">
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="sticky top-20 rounded-xl border bg-card p-5">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <Filter className="h-4 w-4" />
                  الفلاتر
                </h3>
                <FilterContent />
              </div>
            </aside>

            <div className="flex-1">
              <div className="mb-6 flex items-center justify-between gap-4">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden">
                      <SlidersHorizontal className="ml-2 h-4 w-4" />
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

                <div className="mr-auto flex items-center gap-3">
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

                  <div className="hidden rounded-lg border md:flex">
                    <Button
                      variant={viewMode === "grid" && !isMapMode ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => {
                        setViewMode("grid");
                        setIsMapMode(false);
                      }}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" && !isMapMode ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => {
                        setViewMode("list");
                        setIsMapMode(false);
                      }}
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

              {activeFiltersCount > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {selectedWilaya && (
                    <Badge variant="secondary" className="gap-1">
                      {wilayas.find((wilaya) => wilaya.id.toString() === selectedWilaya)?.name}
                      <button onClick={() => updateFilter("wilaya", "")} className="mr-1 hover:text-destructive">
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedMunicipality && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedMunicipality}
                      <button
                        onClick={() => updateFilter("municipality", "")}
                        className="mr-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedPropertyType && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedPropertyType === "Apartment"
                        ? "شقة"
                        : selectedPropertyType === "House"
                          ? "منزل"
                          : "ستوديو"}
                      <button
                        onClick={() => updateFilter("propertyType", "")}
                        className="mr-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedPriceUnit && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedPriceUnit === "day"
                        ? "يومي"
                        : selectedPriceUnit === "week"
                          ? "أسبوعي"
                          : "شهري"}
                      <button onClick={() => updateFilter("priceUnit", "")} className="mr-1 hover:text-destructive">
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedRooms && (
                    <Badge variant="secondary" className="gap-1">
                      {getRoomsBadgeLabel(selectedRooms)}
                      <button onClick={() => updateFilter("rooms", "")} className="mr-1 hover:text-destructive">
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedMinPrice && (
                    <Badge variant="secondary" className="gap-1">
                      من {Number(selectedMinPrice).toLocaleString("ar-DZ")} د.ج
                      <button onClick={() => updateFilter("minPrice", "")} className="mr-1 hover:text-destructive">
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedMaxPrice && (
                    <Badge variant="secondary" className="gap-1">
                      إلى {Number(selectedMaxPrice).toLocaleString("ar-DZ")} د.ج
                      <button onClick={() => updateFilter("maxPrice", "")} className="mr-1 hover:text-destructive">
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedMinRooms && (
                    <Badge variant="secondary" className="gap-1">
                      {selectedMinRooms}+ غرف
                      <button onClick={() => updateFilter("minRooms", "")} className="mr-1 hover:text-destructive">
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedMaxRooms && (
                    <Badge variant="secondary" className="gap-1">
                      حتى {selectedMaxRooms} غرف
                      <button onClick={() => updateFilter("maxRooms", "")} className="mr-1 hover:text-destructive">
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              )}

              {isMapMode && (
                <div className="mb-6 overflow-hidden rounded-xl border">
                  <Suspense
                    fallback={
                      <div className="flex h-[500px] w-full items-center justify-center rounded-xl border border-border bg-muted animate-pulse">
                        <span className="font-medium text-muted-foreground">جاري تحميل الخريطة...</span>
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

              {filteredApartments.length > 0 ? (
                <div className={viewMode === "grid" ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
                  {filteredApartments.map((apartment) => {
                    const apartmentId = apartment.firebase_id || apartment.id;
                    const isFavorited = favoriteIds.includes(apartmentId);

                    let distanceLabel: string | undefined;
                    if (isMapMode && apartment.lat && apartment.lng) {
                      const distance = calculateDistance(
                        searchCenter.lat,
                        searchCenter.lng,
                        apartment.lat,
                        apartment.lng
                      );
                      distanceLabel = `يبعد ${distance.toFixed(1)} كم`;
                    }

                    return (
                      <div key={apartment.id} className="relative">
                        <ApartmentCard
                          apartment={apartment}
                          isFavorite={isFavorited}
                          onFavoriteClick={() => handleToggleFavorite(apartment)}
                        />
                        {distanceLabel && (
                          <div className="pointer-events-none absolute right-2 top-2 z-10 flex w-full justify-end pr-10">
                            <Badge
                              variant="secondary"
                              className="bg-white/90 font-bold text-primary shadow-sm backdrop-blur-md"
                            >
                              {distanceLabel}
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-lg text-muted-foreground">لا توجد شقق تطابق معايير البحث</p>
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
