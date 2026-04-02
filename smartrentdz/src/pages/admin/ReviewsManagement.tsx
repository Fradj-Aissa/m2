import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiDelete, apiPatch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RefreshCw, Eye } from "lucide-react";

interface Review {
  id: number;
  apartment_id: string;
  apartment_name: string;
  renter_id: string;
  renter_name: string;
  rating: number;
  comment: string;
  report_count: number;
  is_flagged: boolean;
  created_at: string;
}

const ReviewsManagement = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Review[]>("/admin/reviews");
      setReviews(data);
    } catch (error) {
      console.error("Failed to load Admin reviews", error);
      toast({
        title: "فشل التحميل",
        description: "تعذر الحصول على بيانات المراجعات.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من أنك تريد حذف هذه المراجعة؟")) return;

    try {
      setActionId(id);
      await apiDelete(`/admin/reviews/${id}`);
      setReviews((prev) => prev.filter((review) => review.id !== id));
      toast({ title: "تم الحذف", description: "تم حذف المراجعة بنجاح." });
    } catch (error) {
      console.error("Failed to delete review", error);
      toast({ title: "خطأ", description: "فشل حذف المراجعة.", variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const handleDismissReports = async (id: number) => {
    try {
      setActionId(id);
      const response = await apiPatch<{ review: Review }>(`/admin/reviews/${id}/flag`, { action: "reset" });
      setReviews((prev) => prev.map((rev) => (rev.id === id ? response.review : rev)));
      toast({ title: "تم التحديث", description: "تم إعادة ضبط عدد التقارير للمراجعة." });
    } catch (error) {
      console.error("Failed to dismiss reports", error);
      toast({ title: "خطأ", description: "فشل إعادة ضبط التقارير.", variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const handleToggleFlag = async (id: number) => {
    try {
      setActionId(id);
      const response = await apiPatch<{ review: Review }>(`/admin/reviews/${id}/flag`, { action: "toggle" });
      setReviews((prev) => prev.map((rev) => (rev.id === id ? response.review : rev)));
      toast({ title: "تم التحديث", description: "تم تحديث حالة التمييز للمراجعة." });
    } catch (error) {
      console.error("Failed to toggle flag", error);
      toast({ title: "خطأ", description: "فشل تحديث حالة التمييز.", variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const renderStars = (rating: number) => {
    const filled = "★".repeat(rating);
    const empty = "☆".repeat(5 - rating);
    return (
      <span className="font-semibold text-amber-500" aria-label={`Rating ${rating}`}>
        {filled}
        <span className="text-muted-foreground">{empty}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إدارة المراجعات</h1>
        <p className="text-muted-foreground mt-2">إدارة كافة المراجعات والتقارير في النظام.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>لوحة المراجعات</CardTitle>
              <CardDescription>{reviews.length} مراجعة</CardDescription>
            </div>
            <div>
              <Button onClick={loadReviews} variant="secondary" size="sm" disabled={loading}>
                تحديث
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">جارٍ تحميل البيانات...</div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">لا توجد مراجعات حتى الآن.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المراجع</TableHead>
                    <TableHead className="text-right">العقار</TableHead>
                    <TableHead className="text-right">التقييم</TableHead>
                    <TableHead className="text-right">التعليق</TableHead>
                    <TableHead className="text-right">عدد التقارير</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>{review.renter_name}</TableCell>
                      <TableCell>
                        <Link
                          to={`/apartment/${review.apartment_id}`}
                          className="text-primary hover:underline"
                        >
                          {review.apartment_name}
                        </Link>
                      </TableCell>
                      <TableCell>{renderStars(review.rating)}</TableCell>
                      <TableCell>{review.comment || "(بدون تعليق)"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            review.report_count > 0
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }
                        >
                          {review.report_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            review.is_flagged
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }
                        >
                          {review.is_flagged ? "مُعلّم" : "نظيف"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleFlag(review.id)}
                            disabled={actionId === review.id}
                            title="تبديل علم (flag)"
                            className="text-amber-600 hover:bg-amber-100"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDismissReports(review.id)}
                            disabled={actionId === review.id || review.report_count === 0}
                            title="إعادة ضبط التقارير"
                            className="text-blue-600 hover:bg-blue-100"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(review.id)}
                            disabled={actionId === review.id}
                            title="حذف المراجعة"
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewsManagement;
