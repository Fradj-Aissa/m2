import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiPatch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface Property {
  id: string;
  title: string;
  firebase_id?: string;
  verification_status: "pending" | "verified" | "rejected";
  verification_docs: string[];
  verification_feedback?: string;
  landlord_name: string;
  landlord_phone: string;
  landlord_email: string;
  created_at: string;
}

interface VerificationModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onVerificationUpdated?: () => void;
}

const VerificationModal = ({
  property,
  isOpen,
  onClose,
  onVerificationUpdated,
}: VerificationModalProps) => {
  const [feedback, setFeedback] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!property) return null;

  // Debug: Log when modal opens with property data
  console.log('📝 VerificationModal rendered with property:', {
    title: property.title,
    verification_status: property.verification_status,
    verification_docs_type: typeof property.verification_docs,
    verification_docs_array: Array.isArray(property.verification_docs),
    verification_docs_length: property.verification_docs?.length || 0,
    verification_docs_value: property.verification_docs,
  });

  const handleApprove = async () => {
    setLoading(true);
    try {
      await apiPatch(`/admin/properties/${property.id}/verification`, {
        status: "verified",
        feedback: feedback || null,
      });
      toast({
        title: "تم التحقق بنجاح",
        description: "تم تعيين حالة العقار إلى موثق.",
      });
      onVerificationUpdated?.();
      onClose();
    } catch (error) {
      console.error("Error approving verification:", error);
      toast({
        title: "خطأ",
        description: "فشل التحقق من العقار.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سبب الرفض.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await apiPatch(`/admin/properties/${property.id}/verification`, {
        status: "rejected",
        feedback,
      });
      toast({
        title: "تم الرفض",
        description: "تم تعيين حالة العقار إلى مرفوض.",
      });
      onVerificationUpdated?.();
      onClose();
    } catch (error) {
      console.error("Error rejecting verification:", error);
      toast({
        title: "خطأ",
        description: "فشل رفض التحقق.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statusBadgeColor = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    verified: "bg-green-500/10 text-green-700 dark:text-green-400",
    rejected: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <DialogTitle>مراجعة التحقق من الملكية</DialogTitle>
            <Badge className={statusBadgeColor[property.verification_status]}>
              {property.verification_status === "pending" && "قيد الانتظار"}
              {property.verification_status === "verified" && "موثق"}
              {property.verification_status === "rejected" && "مرفوض"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Property Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{property.title}</h3>
              <p className="text-sm text-muted-foreground">
                معرف العقار: {property.firebase_id}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">اسم المؤجر</p>
                <p className="font-medium">{property.landlord_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                <p className="font-medium">{property.landlord_email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                <p className="font-medium">{property.landlord_phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الإضافة</p>
                <p className="font-medium">
                  {new Date(property.created_at).toLocaleDateString("ar-DZ")}
                </p>
              </div>
            </div>
          </div>

          {/* Documents Gallery */}
          {property.verification_docs && property.verification_docs.length > 0 ? (
            <div>
              <h4 className="font-semibold mb-3">وثائق إثبات الملكية</h4>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {property.verification_docs.map((docUrl, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer bg-muted border-2 border-transparent hover:border-primary transition-colors"
                    onClick={() => setSelectedImage(docUrl)}
                  >
                    <img
                      src={docUrl}
                      alt={`Document ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                إجمالي الوثائق: {property.verification_docs.length}
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                لم يتم تقديم وثائق إثبات ملكية.
              </p>
            </div>
          )}

          {/* Previous Feedback */}
          {property.verification_feedback && (
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                التغذية الراجعة السابقة:
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {property.verification_feedback}
              </p>
            </div>
          )}

          {/* Admin Feedback Textarea */}
          <div>
            <label className="text-sm font-medium">
              {property.verification_status === "rejected"
                ? "سبب الرفض"
                : "ملاحظات الموافقة"}
            </label>
            <Textarea
              placeholder="أدخل ملاحظاتك أو سبب الرفض..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              إغلاق
            </Button>
            {property.verification_status === "rejected" && (
              <>
                <Button
                  variant="default"
                  onClick={handleApprove}
                  disabled={loading}
                >
                  {loading ? "جاري المعالجة..." : "الموافقة"}
                </Button>
              </>
            )}
            {property.verification_status !== "verified" && (
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={loading}
              >
                {loading ? "جاري المعالجة..." : "الرفض"}
              </Button>
            )}
            {property.verification_status !== "verified" && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={loading}
              >
                {loading ? "جاري المعالجة..." : "الموافقة"}
              </Button>
            )}
          </div>
        </div>

        {/* Image Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[80vh]">
              <img
                src={selectedImage}
                alt="Enlarged"
                className="h-full w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="absolute -top-10 -right-10 text-white hover:bg-white/20 rounded-full p-2"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VerificationModal;
