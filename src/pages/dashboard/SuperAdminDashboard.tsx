import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BadgePercent,
  Bell,
  BookOpen,
  CreditCard,
  FileSearch,
  LayoutDashboard,
  Lock,
  LogOut,
  Package,
  Settings,
  Shield,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SuperAdminSidebar, type SuperAdminNavItem } from "@/components/super-admin/SuperAdminSidebar";

import SuperAdminOverview from "./super-admin/Overview";
import SuperAdminPlaceholder from "./super-admin/Placeholder";
import SuperAdminPackages from "./super-admin/Packages";
import SuperAdminPackageEdit from "./super-admin/PackageEdit";
import SuperAdminUsersAssists from "./super-admin/UsersAssists";
import SuperAdminAccessControl from "./super-admin/AccessControl";
import SuperAdminCms from "./super-admin/Cms";
import SuperAdminPromotions from "./super-admin/Promotions";
import SuperAdminSubscriptions from "./super-admin/Subscriptions";
import SuperAdminMyAccount from "./super-admin/MyAccount";
import SuperAdminPayments from "./super-admin/Payments";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingAccess, setCheckingAccess] = useState(true);

  const navItems: SuperAdminNavItem[] = useMemo(
    () => [
      { title: "Dashboard", url: "/dashboard/super-admin", icon: LayoutDashboard },
      { title: "Users & Assists", url: "/dashboard/super-admin/users-assists", icon: Users },
      { title: "Admin Management", url: "/dashboard/super-admin/admin-management", icon: Shield },
      { title: "Access Control", url: "/dashboard/super-admin/access-control", icon: Bell },
      { title: "Marketing Packages", url: "/dashboard/super-admin/marketing-packages", icon: Package },
      { title: "Payments", url: "/dashboard/super-admin/payments", icon: CreditCard },
      { title: "Website Packages", url: "/dashboard/super-admin/website-packages", icon: Activity },
      { title: "Promotions", url: "/dashboard/super-admin/promotions", icon: BadgePercent },
      { title: "Audit Logs (soon)", url: "/dashboard/super-admin/audit-logs", icon: FileSearch },
      { title: "Reports (soon)", url: "/dashboard/super-admin/reports", icon: BookOpen },
      { title: "Integrations", url: "/dashboard/super-admin/integrations", icon: BookOpen },
      { title: "System Settings (soon)", url: "/dashboard/super-admin/system-settings", icon: Settings },
      { title: "My Account", url: "/dashboard/super-admin/my-account", icon: Shield },
    ],
    []
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      // Requirement: sebelum login, halaman /dashboard/super-admin harus tampil 404
      if (!session?.user) {
        navigate("/404", { replace: true });
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // Type assertion: role enum tidak selalu sinkron dengan types.ts
      const isSuperAdmin = roleData?.role === ("super_admin" as any);

      if (!isSuperAdmin) {
        await supabase.auth.signOut();
        navigate("/404", { replace: true });
        return;
      }

      setCheckingAccess(false);
    })();
  }, [location.pathname, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/super-admin/login", { replace: true });
  };

  if (checkingAccess) return <LoadingScreen />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SuperAdminSidebar items={navItems} />

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 h-12 flex items-center gap-3 border-b border-border bg-background px-3">
            {/* Trigger SELALU terlihat */}
            <SidebarTrigger />

            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">Super Admin</div>
              <div className="text-xs text-muted-foreground truncate">Control Center</div>
            </div>

            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>

          <main className="p-6 bg-background overflow-auto">
            <Routes>
              <Route index element={<SuperAdminOverview />} />
              <Route
                path="admin-management"
                element={<SuperAdminPlaceholder title="Admin Management" />}
              />
              <Route
                path="users-assists"
                element={<SuperAdminUsersAssists />}
              />
              <Route path="marketing-packages" element={<SuperAdminPackages />} />
              <Route path="marketing-packages/:id" element={<SuperAdminPackageEdit />} />
              {/* Backward compatible redirect */}
              <Route path="packages" element={<Navigate to="/dashboard/super-admin/marketing-packages" replace />} />
              <Route path="packages/:id" element={<Navigate to="/dashboard/super-admin/marketing-packages" replace />} />
              <Route path="payments" element={<SuperAdminPayments />} />
              <Route path="website-packages" element={<SuperAdminSubscriptions />} />
              {/* Backward compatible redirect */}
              <Route path="subscriptions" element={<Navigate to="/dashboard/super-admin/website-packages" replace />} />
              <Route path="promotions" element={<SuperAdminPromotions />} />
              <Route path="access-control" element={<SuperAdminAccessControl />} />
              <Route path="audit-logs" element={<SuperAdminPlaceholder title="Audit Logs" />} />
              <Route path="system-settings" element={<SuperAdminPlaceholder title="System Settings" />} />
              <Route path="reports" element={<SuperAdminPlaceholder title="Reports" />} />
              <Route path="integrations" element={<SuperAdminCms />} />
              <Route path="my-account" element={<SuperAdminMyAccount />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
