import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Upload, X, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { wilayas } from "@/data/wilayas";
import { useAuth } from "@/contexts/AuthContext";
import { createApartment } from "@/services/apartmentService";
import { uploadImagesToImgBB } from "@/services/imageService";
import {
  predictApartmentPrice,
  PropertyType,
} from "@/services/pricePredictionService";

const amenitiesList = [
  "واي فاي",
  "تكييف",
  "تدفئة",
  "موقف سيارات",
  "مطبخ مجهز",
  "غسالة",
  "تلفزيون",
  "شرفة",
  "مصعد",
  "أمن 24/7",
];

const propertyTypeOptions: PropertyType[] = [
  "Apartment",
  "Villa",
  "House",
  "Loft",
  "Condo",
];

const AI_PRICE_WARNING_THRESHOLD = 1.15;

const AddApartment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, userData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPredictingPrice, setIsPredictingPrice] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [lastPredictedPrice, setLastPredictedPrice] = useState<number | null>(null);
  const [showPriceSuggestion, setShowPriceSuggestion] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    propertyType: "Apartment" as PropertyType,
    wilayaId: "",
    municipality: "",
    price: "",
    priceUnit: "day",
    rooms: "",
    bathrooms: "",
    area: "",
    amenities: [] as string[],
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      
      setImageFiles((prev) => [...prev, ...newFiles].slice(0, 10));
      setImagePreviews((prev) => [...prev, ...newPreviews].slice(0, 10));
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const resetPredictionFeedback = () => {
    setAiConfidence(null);
    setLastPredictedPrice(null);
    setShowPriceSuggestion(false);
  };

  const updatePriceSuggestion = (nextPrice: string, comparisonPrice = lastPredictedPrice) => {
    const numericPrice = Number(nextPrice);
    const shouldSuggest =
      comparisonPrice !== null &&
      Number.isFinite(numericPrice) &&
      numericPrice > comparisonPrice * AI_PRICE_WARNING_THRESHOLD;

    setShowPriceSuggestion(shouldSuggest);
  };

  const handlePriceChange = (value: string) => {
    setFormData((prev) => ({ ...prev, price: value }));
    updatePriceSuggestion(value);
  };

  const handlePredictPrice = async () => {
    const requestedPrice = Number(formData.price);
    const rooms = Number(formData.rooms);
    const bathrooms = Number(formData.bathrooms);
    const wilayaId = Number(formData.wilayaId);

    if (!Number.isFinite(requestedPrice) || requestedPrice <= 0) {
      toast({
        title: "خطأ",
        description: "أدخل سعرًا حاليًا صحيحًا أولاً حتى يتمكن الذكاء الاصطناعي من التقدير.",
        variant: "destructive",
      });
      return;
    }

    if (
      !Number.isFinite(rooms) ||
      rooms <= 0 ||
      !Number.isFinite(bathrooms) ||
      bathrooms <= 0 ||
      !Number.isFinite(wilayaId) ||
      wilayaId <= 0
    ) {
      toast({
        title: "خطأ",
        description: "اختر الولاية وأدخل عدد الغرف والحمامات قبل طلب تقدير السعر.",
        variant: "destructive",
      });
      return;
    }

    setIsPredictingPrice(true);

    try {
      const manualPriceBeforePrediction = requestedPrice;
      const prediction = await predictApartmentPrice({
        requested_price: requestedPrice,
        rooms,
        bathrooms,
        wilayaId,
        property_type: formData.propertyType,
      });

      const roundedPrediction = Math.round(prediction.predicted_price);

      setFormData((prev) => ({
        ...prev,
        price: roundedPrediction.toString(),
      }));
      setLastPredictedPrice(prediction.predicted_price);
      setAiConfidence(prediction.confidence);
      setShowPriceSuggestion(
        manualPriceBeforePrediction > prediction.predicted_price * AI_PRICE_WARNING_THRESHOLD
      );

      toast({
        title: "تم تقدير السعر",
        description: `تم تحديث السعر إلى ${roundedPrediction.toLocaleString("en-US")} د.ج`,
      });
    } catch (error: any) {
      console.error("Error predicting apartment price:", error);
      toast({
        title: "خطأ",
        description:
          error?.message || "تعذر جلب التقدير من خادم الذكاء الاصطناعي.",
        variant: "destructive",
      });
    } finally {
      setIsPredictingPrice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !userData) {
      toast({
        title: "خطأ",
        description: "يرجى تسجيل الدخول أولاً",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (imageFiles.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إضافة صورة واحدة على الأقل",
        variant: "destructive",
      });
      return;
    }

    // Validate all required form fields
    if (!formData.title.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال عنوان الشقة",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال وصف الشقة",
        variant: "destructive",
      });
      return;
    }

    if (!formData.wilayaId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار الولاية",
        variant: "destructive",
      });
      return;
    }

    if (!formData.municipality.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البلدية",
        variant: "destructive",
      });
      return;
    }

    if (!formData.price || parseInt(formData.price) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سعر صحيح",
        variant: "destructive",
      });
      return;
    }

    if (!formData.rooms || parseInt(formData.rooms) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال عدد الغرف",
        variant: "destructive",
      });
      return;
    }

    if (!formData.bathrooms || parseInt(formData.bathrooms) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال عدد الحمامات",
        variant: "destructive",
      });
      return;
    }

    if (!formData.area || parseInt(formData.area) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مساحة الشقة",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Upload images to ImgBB via backend
      const imageUrls = await uploadImagesToImgBB(imageFiles);

      // Get wilaya name
      const wilaya = wilayas.find((w) => w.id.toString() === formData.wilayaId);

      // Create apartment in PostgreSQL backend
      await createApartment({
        title: formData.title,
        description: formData.description,
        images: imageUrls,
        price: parseInt(formData.price),
        price_unit: formData.priceUnit as "day" | "week" | "month",
        wilaya: wilaya?.name || "",
        wilaya_id: parseInt(formData.wilayaId),
        municipality: formData.municipality,
        rooms: parseInt(formData.rooms),
        bathrooms: parseInt(formData.bathrooms),
        area: parseInt(formData.area),
        amenities: formData.amenities,
        is_featured: false,
        is_active: true,
        landlord_id: currentUser.uid,
        landlord_phone: userData.phone,
        landlord_name: userData.name,
      });

      toast({
        title: "تم إضافة الشقة بنجاح",
        description: "ستظهر شقتك في نتائج البحث قريباً",
      });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error adding apartment:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة الشقة. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-muted/30">
        <div className="container py-8 max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => navigate(-1)}
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              رجوع
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold">إضافة شقة جديدة</h1>
            <p className="text-muted-foreground mt-1">
              أضف تفاصيل شقتك لعرضها للمستأجرين
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Images Section */}
            <div className="bg-card rounded-xl border p-6">
              <h2 className="font-semibold mb-4">صور الشقة</h2>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {imagePreviews.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={img} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      onClick={() => removeImage(idx)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 10 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">إضافة</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                أضف حتى 10 صور للشقة. الصورة الأولى ستكون الصورة الرئيسية.
              </p>
            </div>

            {/* Basic Info */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold mb-4">المعلومات الأساسية</h2>
              
              <div className="space-y-2">
                <Label htmlFor="title">عنوان الإعلان</Label>
                <Input
                  id="title"
                  placeholder="مثال: شقة فاخرة بإطلالة بحرية"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  placeholder="صف شقتك بالتفصيل..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>نوع العقار</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(v) => {
                    const propertyType = v as PropertyType;
                    resetPredictionFeedback();
                    setFormData({ ...formData, propertyType });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع العقار" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypeOptions.map((propertyType) => (
                      <SelectItem key={propertyType} value={propertyType}>
                        {propertyType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                الموقع
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>الولاية</Label>
                  <Select
                    value={formData.wilayaId}
                    onValueChange={(v) => {
                      resetPredictionFeedback();
                      setFormData({ ...formData, wilayaId: v });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الولاية" />
                    </SelectTrigger>
                    <SelectContent>
                      {wilayas.map((w) => (
                        <SelectItem key={w.id} value={w.id.toString()}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="municipality">البلدية</Label>
                  <Input
                    id="municipality"
                    placeholder="اسم البلدية"
                    value={formData.municipality}
                    onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                السعر
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">السعر (د.ج)</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="price"
                      type="number"
                      placeholder="5000"
                      value={formData.price}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePredictPrice}
                      disabled={isPredictingPrice || isLoading}
                    >
                      {isPredictingPrice ? "جاري التقدير..." : "AI Predict Price"}
                    </Button>
                  </div>
                  {aiConfidence !== null && (
                    <p className="text-xs text-muted-foreground">
                      AI Confidence: {(aiConfidence * 100).toFixed(0)}%
                    </p>
                  )}
                  {lastPredictedPrice !== null && (
                    <p className="text-xs text-muted-foreground">
                      AI Suggested Price: {Math.round(lastPredictedPrice).toLocaleString("en-US")} د.ج
                    </p>
                  )}
                  {showPriceSuggestion && (
                    <p className="text-xs text-amber-700">
                      Consider lowering your price to match market demand.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>مدة الكراء</Label>
                  <Select
                    value={formData.priceUnit}
                    onValueChange={(v) => setFormData({ ...formData, priceUnit: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">يومي</SelectItem>
                      <SelectItem value="week">أسبوعي</SelectItem>
                      <SelectItem value="month">شهري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold mb-4">تفاصيل الشقة</h2>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="rooms">عدد الغرف</Label>
                  <Select
                    value={formData.rooms}
                    onValueChange={(v) => {
                      resetPredictionFeedback();
                      setFormData({ ...formData, rooms: v });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">عدد الحمامات</Label>
                  <Select
                    value={formData.bathrooms}
                    onValueChange={(v) => {
                      resetPredictionFeedback();
                      setFormData({ ...formData, bathrooms: v });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">المساحة (م²)</Label>
                  <Input
                    id="area"
                    type="number"
                    placeholder="100"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-card rounded-xl border p-6">
              <h2 className="font-semibold mb-4">المرافق والخدمات</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {amenitiesList.map((amenity) => (
                  <label
                    key={amenity}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <span className="text-sm">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="submit"
                size="lg"
                className="flex-1 bg-gradient-hero hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? "جاري النشر..." : "نشر الشقة"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate(-1)}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddApartment;
