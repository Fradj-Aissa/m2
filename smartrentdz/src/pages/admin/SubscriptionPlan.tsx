import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

const SubscriptionPlan = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إدارة الاشتراكات</h1>
        <p className="text-muted-foreground mt-2">
          إدارة خطط الاشتراكات والعروض والمشتركين
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            خطط الاشتراكات
          </CardTitle>
          <CardDescription>
            سيتم تطوير هذه الميزة قريباً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <CreditCard className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                لم يتم تنشيط هذه الميزة بعد
              </p>
              <p className="text-sm text-muted-foreground">
                سيتمكن المسؤولون من إدارة خطط الاشتراكات والعروض الخاصة هنا في المستقبل
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for future features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-lg">خطة حرة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">قريباً</p>
          </CardContent>
        </Card>
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-lg">خطة مميزة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">قريباً</p>
          </CardContent>
        </Card>
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-lg">خطة متقدمة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">قريباً</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionPlan;
