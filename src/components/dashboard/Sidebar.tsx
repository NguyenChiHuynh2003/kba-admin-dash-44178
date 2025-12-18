import { useState } from "react";
import { LayoutDashboard, FolderKanban, CheckSquare, FileText, Settings, LogOut, UserCog, Users, DollarSign, Package, Archive, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, roleLabels } from "@/hooks/useUserRole";
import logo2018 from "@/assets/logoKBA_1.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const allMenuItems = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "projects", label: "Dự án", icon: FolderKanban },
  { id: "closed-projects", label: "Dự án đóng", icon: Archive },
  { id: "tasks", label: "Nhiệm vụ", icon: CheckSquare },
  { id: "hr", label: "Nhân sự", icon: Users },
  { id: "accounting", label: "Kế toán", icon: DollarSign },
  { id: "inventory", label: "Quản lí kho", icon: Package },
  { id: "reports", label: "Báo cáo", icon: FileText },
  { id: "settings", label: "Cài đặt", icon: Settings },
  { id: "admin-users", label: "Quản lý người dùng", icon: UserCog },
];

const SidebarContent = ({ 
  activeSection, 
  setActiveSection, 
  menuItems, 
  role, 
  loading, 
  handleLogout,
  onItemClick
}: {
  activeSection: string;
  setActiveSection: (section: string) => void;
  menuItems: typeof allMenuItems;
  role: string;
  loading: boolean;
  handleLogout: () => void;
  onItemClick?: () => void;
}) => {
  const navigate = useNavigate();

  return (
    <>
      <div className="p-4 sm:p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={logo2018} alt="KBA 2018 Logo" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
          <div>
            <h2 className="text-base sm:text-lg font-bold">KBA.2018</h2>
            <p className="text-xs text-sidebar-foreground/70">Hệ thống quản lý</p>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="px-4 sm:px-6 py-2 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50">Vai trò: <span className="font-medium text-sidebar-foreground/70">{roleLabels[role as keyof typeof roleLabels]}</span></p>
        </div>
      )}

      <nav className="flex-1 p-3 sm:p-4 overflow-y-auto">
        <ul className="space-y-1 sm:space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  if (item.id === "reports") {
                    navigate("/reports");
                  } else if (item.id === "settings") {
                    navigate("/settings");
                  } else if (item.id === "closed-projects") {
                    navigate("/closed-projects");
                  } else {
                    setActiveSection(item.id);
                  }
                  onItemClick?.();
                }}
                className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-3 sm:p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-sidebar-accent/50 text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm sm:text-base">Đăng xuất</span>
        </button>
      </div>
    </>
  );
};

export const Sidebar = ({ activeSection, setActiveSection }: SidebarProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { role, hasAccess, loading } = useUserRole();

  const menuItems = allMenuItems.filter(item => hasAccess(item.id));

  const handleLogout = async () => {
    await signOut();
    toast.success("Đăng xuất thành công");
    navigate("/auth");
  };

  return (
    <>
      {/* Mobile Menu Button - Fixed at top */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-sidebar-background text-sidebar-foreground">
            <div className="flex flex-col h-full">
              <SidebarContent
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                menuItems={menuItems}
                role={role}
                loading={loading}
                handleLogout={handleLogout}
                onItemClick={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <img src={logo2018} alt="KBA 2018 Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-foreground">KBA.2018</span>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border flex-col h-screen sticky top-0">
        <SidebarContent
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          menuItems={menuItems}
          role={role}
          loading={loading}
          handleLogout={handleLogout}
        />
      </aside>
    </>
  );
};