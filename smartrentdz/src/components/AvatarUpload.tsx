import { useState, useRef } from "react";
import { Upload, Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiPatch } from "@/lib/api";

interface AvatarUploadProps {
  currentImage?: string;
  userId: string;
  onUploadSuccess: (imageUrl: string) => void;
}

const AvatarUpload = ({ currentImage, userId, onUploadSuccess }: AvatarUploadProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن لا يتجاوز 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "خطأ",
        description: "يجب أن تكون الملف صورة",
        variant: "destructive",
      });
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      toast({
        title: "خطأ",
        description: "لم تقم باختيار صورة",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", fileInputRef.current.files[0]);

      const response = await apiPatch(`/users/${userId}/avatar`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const imageUrl = response.imageUrl || response.user?.profile_image;

      if (imageUrl) {
        setPreviewUrl(null);
        setIsLoading(false);
        toast({
          title: "نجح",
          description: "تم تحميل الصورة بنجاح",
        });
        onUploadSuccess(imageUrl);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        title: "خطأ",
        description: error.response?.data?.error || "حدث خطأ أثناء تحميل الصورة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Display Current or Preview Image */}
      <div className="relative w-32 h-32 rounded-full bg-muted border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="معاينة الصورة"
            className="w-full h-full object-cover"
          />
        ) : currentImage ? (
          <img
            src={currentImage}
            alt="صورة المستخدم الحالية"
            className="w-full h-full object-cover"
          />
        ) : (
          <Camera className="h-8 w-8 text-muted-foreground" />
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="تحميل صورة"
      />

      {/* Upload Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={isLoading}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          اختيار صورة
        </Button>

        {previewUrl && (
          <>
            <Button
              onClick={handleUpload}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التحميل...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  تحميل
                </>
              )}
            </Button>
            <Button
              onClick={handleCancelPreview}
              variant="outline"
              disabled={isLoading}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              إلغاء
            </Button>
          </>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground text-center">
        بحد أقصى 5MB • الصيغ المدعومة: JPG, PNG, GIF
      </p>
    </div>
  );
};

export default AvatarUpload;
