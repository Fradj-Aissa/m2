import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-muted/40 py-16">
        <div className="w-full max-w-2xl rounded-3xl border bg-card p-10 shadow-lg">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">مرحباً بك في اجرلي!</h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                تم إنشاء حسابك بنجاح باستخدام Google. يمكنك الآن استكمال إعداد ملفك الشخصي أو البدء في تصفح الشقق.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => navigate("/dashboard")}
                className="w-full"
              >
                الذهاب إلى لوحة التحكم
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/settings")}
                className="w-full"
              >
                استكمال الملف الشخصي
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="mt-2"
              onClick={() => navigate("/search")}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Welcome;
