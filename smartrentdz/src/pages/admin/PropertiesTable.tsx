import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPut } from "@/lib/api";
import VerificationModal from "./VerificationModal";

interface Property {
  id: string;
  firebase_id?: string;
  title: string;
  description: string;
  price: number;
  wilaya: string;
  landlord_name: string;
  landlord_email?: string;
  landlord_phone?: string;
  status: "pending" | "approved" | "rejected";
  verification_status?: "pending" | "verified" | "rejected";
  verification_docs?: string[];
  created_at: string;
  images?: string[];
}

const PropertiesTable = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      // Replace with actual API endpoint
      const response = await apiGet<Property[]>("/admin/properties");
      console.log('✅ Admin Properties Data:', response);
      console.log('Properties with verification_docs:', response.filter(p => p.verification_docs && p.verification_docs.length > 0));
      setProperties(response);
      setFilteredProperties(response);
    } catch (error) {
      console.error("Failed to fetch properties:", error);
      // Mock data for demonstration
      const mockProperties: Property[] = [
        {
          id: "1",
          title: "شقة فاخرة في الجزائر العاصمة",
          description: "شقة حديثة بتجهيزات كاملة",
          price: 2500,
          wilaya: "الجزائر",
          landlord_name: "أحمد محمد",
          status: "pending",
          verification_status: "pending",
          verification_docs: ["https://i.ibb.co/sample1.jpg"],
          created_at: "2024-03-20",
        },
        {
          id: "2",
          title: "فيلا راقية بوهران",
          description: "فيلا مستقلة مع حديقة واسعة",
          price: 3500,
          wilaya: "وهران",
          landlord_name: "علي حسن",
          status: "approved",
          verification_status: "pending",
          created_at: "2024-03-15",
        },
        {
          id: "3",
          title: "مكتب تجاري بقسنطينة",
          description: "مكتب في موقع متميز",
          price: 1500,
          wilaya: "قسنطينة",
          landlord_name: "فاطمة بن علي",
          status: "rejected",
          created_at: "2024-03-10",
        },
      ];
      setProperties(mockProperties);
      setFilteredProperties(mockProperties);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = properties.filter(
      (prop) =>
        prop.title.toLowerCase().includes(term.toLowerCase()) ||
        prop.wilaya.includes(term)
    );
    setFilteredProperties(filtered);
  };

  const handleApprove = async (id: string) => {
    try {
      setUpdating(id);
      await apiPut(`/admin/properties/${id}/approve`, {});
      setProperties(
        properties.map((p) =>
          p.id === id ? { ...p, status: "approved" } : p
        )
      );
      setFilteredProperties(
        filteredProperties.map((p) =>
          p.id === id ? { ...p, status: "approved" } : p
        )
      );
      toast({
        title: "تم الموافقة",
        description: "تم الموافقة على العقار بنجاح.",
      });
    } catch (error) {
      console.error("Failed to approve property:", error);
      toast({
        title: "خطأ",
        description: "فشل الموافقة على العقار.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("هل تريد رفض هذا العقار؟")) return;

    try {
      setUpdating(id);
      await apiPut(`/admin/properties/${id}/reject`, {});
      setProperties(
        properties.map((p) =>
          p.id === id ? { ...p, status: "rejected" } : p
        )
      );
      setFilteredProperties(
        filteredProperties.map((p) =>
          p.id === id ? { ...p, status: "rejected" } : p
        )
      );
      toast({
        title: "تم الرفض",
        description: "تم رفض العقار بنجاح.",
      });
    } catch (error) {
      console.error("Failed to reject property:", error);
      toast({
        title: "خطأ",
        description: "فشل رفض العقار.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleOpenVerificationModal = async (property: Property) => {
    try {
      console.log('🔓 Opening verification modal for property:', {
        id: property.id,
        title: property.title,
        verification_docs_from_list: property.verification_docs,
      });
      
      // Fetch full property details including verification_docs
      const response = await apiGet<any>(
        `/admin/properties/${property.id}/verification`
      );
      
      console.log('✅ Verification details fetched:', {
        verification_docs: response.verification_docs,
        verification_status: response.verification_status,
        landlord_info: {
          name: response.landlord_name,
          email: response.landlord_email,
          phone: response.landlord_phone,
        },
      });
      
      setSelectedProperty(response);
      setIsVerificationModalOpen(true);
    } catch (error) {
      console.error("❌ Failed to fetch verification details:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل بيانات التحقق.",
        variant: "destructive",
      });
    }
  };

  const handleVerificationUpdated = () => {
    fetchProperties();
    setIsVerificationModalOpen(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "pending":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "معتمد";
      case "rejected":
        return "مرفوض";
      case "pending":
        return "قيد المراجعة";
      default:
        return "غير معروف";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>إدارة العقارات</CardTitle>
            <CardDescription>
              {filteredProperties.length} عقار
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالعنوان أو الولاية..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-3 pr-10"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? "لم يتم العثور على عقارات" : "لا توجد بيانات"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">المالك</TableHead>
                  <TableHead className="text-right">الولاية</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التوثيق</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {property.title}
                    </TableCell>
                    <TableCell>{property.landlord_name}</TableCell>
                    <TableCell>{property.wilaya}</TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {property.price.toLocaleString()} دج
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(property.status)}
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            property.status
                          )}`}
                        >
                          {getStatusLabel(property.status)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {property.verification_status ? (
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              property.verification_status === "verified"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                : property.verification_status === "rejected"
                                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                                : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                            }`}
                          >
                            {property.verification_status === "verified" && "موثق"}
                            {property.verification_status === "rejected" && "مرفوض"}
                            {property.verification_status === "pending" && "قيد الانتظار"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(property.created_at).toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {/* Debug: Log each property's verification status */}
                        {(() => {
                          console.log(`📋 Property: ${property.title}`, {
                            id: property.id,
                            status: property.status,
                            verification_status: property.verification_status,
                            verification_docs_count: property.verification_docs?.length || 0,
                            verification_docs_exists: !!property.verification_docs,
                          });
                          return null;
                        })()}
                        
                        {/* Review Docs Button - Show if verification_docs exist */}
                        {property.verification_docs && property.verification_docs.length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenVerificationModal(property)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            مراجعة الوثائق
                          </Button>
                        ) : null}

                        {/* Approve/Reject Buttons - Show only for pending properties */}
                        {property.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(property.id)}
                              disabled={updating === property.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              موافقة
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(property.id)}
                              disabled={updating === property.id}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              رفض
                            </Button>
                          </>
                        )}

                        {/* No Actions Message - Only show when none of the above apply */}
                        {property.status !== "pending" && (!property.verification_docs || property.verification_docs.length === 0) && (
                          <span className="text-xs text-muted-foreground">
                            لا توجد إجراءات
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <VerificationModal
        property={selectedProperty}
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        onVerificationUpdated={handleVerificationUpdated}
      />
    </Card>
  );
};

export default PropertiesTable;
