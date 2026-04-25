import { useEffect, useState } from "react";
import { Users, Building2, CreditCard, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";

interface StatsData {
  totalUsers: number;
  totalProperties: number;
  activeSubscriptions: number;
  pendingApprovals: number;
}

const AdminHome = () => {
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalProperties: 0,
    activeSubscriptions: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Replace with actual API endpoints
        const response = await apiGet<StatsData>("/admin/stats");
        setStats(response);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        // Mock data for demonstration
        setStats({
          totalUsers: 1243,
          totalProperties: 456,
          activeSubscriptions: 89,
          pendingApprovals: 12,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "إجمالي المستخدمين",
      value: stats.totalUsers,
      icon: Users,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      trend: "+12% from last month",
    },
    {
      title: "إجمالي العقارات",
      value: stats.totalProperties,
      icon: Building2,
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
      trend: "+8% from last month",
    },
    {
      title: "الاشتراكات النشطة",
      value: stats.activeSubscriptions,
      icon: CreditCard,
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      trend: "+5% from last month",
    },
    {
      title: "العقارات قيد المراجعة",
      value: stats.pendingApprovals,
      icon: Clock,
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      trend: "Awaiting approval",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-2">
          مرحباً في لوحة التحكم الإدارية - نظرة عامة على نظام SmartRent
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {stat.trend}
                    </CardDescription>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {loading ? "..." : stat.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>نشاط حديث</CardTitle>
            <CardDescription>آخر العمليات في النظام</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">عقار جديد تم إضافته</p>
                    <p className="text-xs text-muted-foreground">قبل 2 ساعة</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    جديد
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الإحصائيات السريعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">معدل التحويل</span>
              <span className="font-bold text-foreground">3.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">متوسط الزيارات</span>
              <span className="font-bold text-foreground">1,242</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">العقارات المقررة</span>
              <span className="font-bold text-foreground">89</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminHome;
