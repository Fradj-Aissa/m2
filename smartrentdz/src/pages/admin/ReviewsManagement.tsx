import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

const ReviewsManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إدارة المراجعات</h1>
        <p className="text-muted-foreground mt-2">
          إدارة تقييمات وتعليقات المستخدمين على العقارات
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            المراجعات والتقييمات
          </CardTitle>
          <CardDescription>
            سيتم تطوير هذه الميزة قريباً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                لم يتم تنشيط هذه الميزة بعد
              </p>
              <p className="text-sm text-muted-foreground">
                سيتمكن المسؤولون من إدارة وتصفية التقييمات والمراجعات هنا في المستقبل
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for future features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-lg">التقييمات الجديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">قريباً</p>
          </CardContent>
        </Card>
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-lg">المراجعات المعلقة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">قريباً</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReviewsManagement;
