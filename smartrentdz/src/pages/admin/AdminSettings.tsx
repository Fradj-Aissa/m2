import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إعدادات النظام</h1>
        <p className="text-muted-foreground mt-2">
          إدارة إعدادات وتكوينات نظام SmartRent
        </p>
      </div>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            إعدادات عامة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                اسم المنصة
              </label>
              <div className="p-3 bg-muted rounded-lg text-foreground">
                SmartRent
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                إصدار النظام
              </label>
              <div className="p-3 bg-muted rounded-lg text-foreground">
                v1.0.0
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Settings */}
      <Card className="opacity-75">
        <CardHeader>
          <CardTitle>إعدادات قاعدة البيانات</CardTitle>
          <CardDescription>
            سيتم تطوير هذه الميزة قريباً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            قريباً: إدارة messages البيانات والنسخ الاحتياطية
          </p>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card className="opacity-75">
        <CardHeader>
          <CardTitle>إعدادات البريد الإلكتروني</CardTitle>
          <CardDescription>
            سيتم تطوير هذه الميزة قريباً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            قريباً: إعدادات SMTP والإخطارات
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline">إلغاء</Button>
        <Button variant="default" disabled>
          حفظ التغييرات
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
