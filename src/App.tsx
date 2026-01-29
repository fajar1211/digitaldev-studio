import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { OnboardingGate, OrientationGate } from "@/components/auth/OnboardingGates";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Packages from "./pages/Packages";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentPending from "./pages/payment/PaymentPending";
import PaymentError from "./pages/payment/PaymentError";
import UserDashboard from "./pages/dashboard/UserDashboard";
import AssistDashboard from "./pages/dashboard/AssistDashboard";
import SuperAdminLogin from "./pages/super-admin/SuperAdminLogin";
import SuperAdminImpersonate from "./pages/super-admin/SuperAdminImpersonate";
import SuperAdminDashboard from "./pages/dashboard/SuperAdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import NotFound from "./pages/NotFound";
import Welcome from "./pages/onboarding/Welcome";
import GetStarted from "./pages/onboarding/GetStarted";
import BusinessStage from "./pages/onboarding/BusinessStage";
import BusinessBasics from "./pages/onboarding/BusinessBasics";
import OnlinePresence from "./pages/onboarding/OnlinePresence";
import SetupNew from "./pages/onboarding/SetupNew";
import SetupGrowing from "./pages/onboarding/SetupGrowing";
import RecommendedPackage from "./pages/onboarding/RecommendedPackage";
import SelectPackage from "./pages/onboarding/SelectPackage";
// Orientation (Assist onboarding)
import OrientationWelcome from "./pages/orientation/Welcome";
import OrientationProfile from "./pages/orientation/Profile";
import OrientationSkills from "./pages/orientation/Skills";
import OrientationPortfolio from "./pages/orientation/Portfolio";

// Order flow
import ChooseDomain from "./pages/order/ChooseDomain";
import ChooseDesign from "./pages/order/ChooseDesign";
import Details from "./pages/order/Details";
import SubscriptionPlan from "./pages/order/SubscriptionPlan";
import Payment from "./pages/order/Payment";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OrderProvider>
            <Routes>
              <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />

             {/* Midtrans redirect pages */}
             <Route path="/payment/success" element={<PaymentSuccess />} />
             <Route path="/payment/pending" element={<PaymentPending />} />
             <Route path="/payment/error" element={<PaymentError />} />

            {/* Super Admin */}
            <Route path="/super-admin/login" element={<SuperAdminLogin />} />
            <Route path="/super-admin/impersonate" element={<SuperAdminImpersonate />} />
            <Route path="/dashboard/super-admin/*" element={<SuperAdminDashboard />} />

            {/* Admin Operasional */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/dashboard/admin/*" element={<AdminDashboard />} />
            <Route
              path="/onboarding/welcome"
              element={
                <OnboardingGate>
                  <Welcome />
                </OnboardingGate>
              }
            />
            <Route
              path="/onboarding/get-started"
              element={
                <OnboardingGate>
                  <GetStarted />
                </OnboardingGate>
              }
            />
            <Route
              path="/onboarding/business-stage"
              element={
                <OnboardingGate>
                  <BusinessStage />
                </OnboardingGate>
              }
            />
            <Route
              path="/onboarding/business-basics"
              element={
                <OnboardingGate>
                  <BusinessBasics />
                </OnboardingGate>
              }
            />
            <Route
              path="/onboarding/online-presence"
              element={
                <OnboardingGate>
                  <OnlinePresence />
                </OnboardingGate>
              }
            />
            <Route
              path="/onboarding/setup-new"
              element={
                <OnboardingGate>
                  <SetupNew />
                </OnboardingGate>
              }
            />
            <Route
              path="/onboarding/setup-growing"
              element={
                <OnboardingGate>
                  <SetupGrowing />
                </OnboardingGate>
              }
            />
            <Route
              path="/onboarding/recommended-package"
              element={
                <OnboardingGate>
                  <RecommendedPackage />
                </OnboardingGate>
              }
            />
            <Route
              path="/onboarding/select-package"
              element={
                <OnboardingGate>
                  <SelectPackage />
                </OnboardingGate>
              }
            />
            {/* Orientation (Assist onboarding) */}
            <Route
              path="/orientation/welcome"
              element={
                <OrientationGate>
                  <OrientationWelcome />
                </OrientationGate>
              }
            />
            <Route
              path="/orientation/profile"
              element={
                <OrientationGate>
                  <OrientationProfile />
                </OrientationGate>
              }
            />
            <Route
              path="/orientation/skills"
              element={
                <OrientationGate>
                  <OrientationSkills />
                </OrientationGate>
              }
            />
            <Route
              path="/orientation/portfolio"
              element={
                <OrientationGate>
                  <OrientationPortfolio />
                </OrientationGate>
              }
            />
            <Route path="/dashboard/user/*" element={<UserDashboard />} />
            <Route path="/dashboard/assist/*" element={<AssistDashboard />} />

            {/* Order flow */}
            <Route path="/order/choose-domain" element={<ChooseDomain />} />
            <Route path="/order/choose-design" element={<ChooseDesign />} />
            <Route path="/order/details" element={<Details />} />
            <Route path="/order/subscription" element={<SubscriptionPlan />} />
            <Route path="/order/payment" element={<Payment />} />
            
            {/* Explicit 404 route (dipakai untuk redirect akses tanpa login) */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </OrderProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;