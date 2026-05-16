import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import Search from "./pages/Search";
import ApartmentDetail from "./pages/ApartmentDetail";
import Favorites from "./pages/Favorites";
import SubscriptionEntry from "./pages/SubscriptionEntry";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AddApartment from "./pages/AddApartment";
import EditApartment from "./pages/EditApartment";
import Settings from "./pages/Settings";
import CompleteProfile from "./pages/CompleteProfile";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Welcome from "./pages/Welcome";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminProperties from "./pages/admin/AdminProperties";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<Search />} />
              <Route path="/apartment/:id" element={<ApartmentDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route
                path="/subscription"
                element={
                  <ProtectedRoute>
                    <SubscriptionEntry />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/add-apartment"
                element={
                  <ProtectedRoute requiredType="landlord">
                    <AddApartment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-apartment/:id"
                element={
                  <ProtectedRoute requiredType="landlord">
                    <EditApartment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/complete-profile"
                element={
                  <ProtectedRoute>
                    <CompleteProfile />
                  </ProtectedRoute>
                }
              />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />

              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminUsers />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/properties"
                element={
                  <AdminRoute>
                    <AdminProperties />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/reviews"
                element={
                  <AdminRoute>
                    <AdminReviews />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/subscriptions"
                element={
                  <AdminRoute>
                    <AdminSubscriptions />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <AdminRoute>
                    <AdminSettingsPage />
                  </AdminRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SocketProvider>
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
);

export default App;


