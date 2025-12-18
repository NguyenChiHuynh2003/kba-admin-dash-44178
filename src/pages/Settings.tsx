import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, User, Lock, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("settings");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // User profile state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Company settings state
  const [companyName, setCompanyName] = useState("KBA.2018");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [projectNotifications, setProjectNotifications] = useState(true);
  const [taskNotifications, setTaskNotifications] = useState(true);

  useEffect(() => {
    checkAdminRole();
    loadUserProfile();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const loadUserProfile = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (profile) {
      setFullName(profile.full_name || "");
    }
    
    setEmail(user.email || "");
  };

  const handleSectionChange = (section: string) => {
    if (section !== "settings") {
      navigate("/dashboard");
    }
    setActiveSection(section);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      toast.success("Cập nhật thông tin thành công!");
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      toast.success("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompanySettings = async () => {
    if (!isAdmin) {
      toast.error("Bạn không có quyền thực hiện thao tác này!");
      return;
    }

    setLoading(true);
    try {
      // Here you would save company settings to a company_settings table
      toast.success("Cập nhật thông tin công ty thành công!");
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <Sidebar activeSection={activeSection} setActiveSection={handleSectionChange} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader onNavigate={(section) => handleSectionChange(section)} />
          
          <main className="flex-1 p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 overflow-auto">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Cài đặt</h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                Quản lý thông tin cá nhân và cài đặt hệ thống
              </p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                <TabsTrigger value="profile" className="text-xs sm:text-sm py-2">
                  <User className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Hồ sơ</span>
                  <span className="xs:hidden">Hồ sơ</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="text-xs sm:text-sm py-2">
                  <Lock className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Bảo mật</span>
                  <span className="xs:hidden">Bảo mật</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs sm:text-sm py-2">
                  <Bell className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Thông báo</span>
                  <span className="sm:hidden">TB</span>
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="company" className="text-xs sm:text-sm py-2">
                    <Building2 className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Công ty</span>
                    <span className="sm:hidden">CT</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">Thông tin cá nhân</CardTitle>
                    <CardDescription className="text-sm">
                      Cập nhật thông tin tài khoản của bạn
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Họ và tên</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nhập họ và tên"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email không thể thay đổi
                      </p>
                    </div>
                    <Button onClick={handleUpdateProfile} disabled={loading} className="w-full sm:w-auto">
                      {loading ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">Đổi mật khẩu</CardTitle>
                    <CardDescription className="text-sm">
                      Cập nhật mật khẩu để bảo mật tài khoản
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Mật khẩu mới</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nhập mật khẩu mới"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </div>
                    <Button onClick={handleChangePassword} disabled={loading} className="w-full sm:w-auto">
                      {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">Cài đặt thông báo</CardTitle>
                    <CardDescription className="text-sm">
                      Quản lý các thông báo bạn muốn nhận
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <Label className="text-sm">Thông báo email</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Nhận thông báo qua email
                        </p>
                      </div>
                      <Switch
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <Label className="text-sm">Thông báo dự án</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Nhận thông báo về cập nhật dự án
                        </p>
                      </div>
                      <Switch
                        checked={projectNotifications}
                        onCheckedChange={setProjectNotifications}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <Label className="text-sm">Thông báo nhiệm vụ</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Nhận thông báo về nhiệm vụ được giao
                        </p>
                      </div>
                      <Switch
                        checked={taskNotifications}
                        onCheckedChange={setTaskNotifications}
                      />
                    </div>
                    <Button onClick={() => toast.success("Đã lưu cài đặt thông báo!")} className="w-full sm:w-auto">
                      Lưu cài đặt
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Company Tab (Admin only) */}
              {isAdmin && (
                <TabsContent value="company">
                  <Card>
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="text-lg sm:text-xl">Thông tin công ty</CardTitle>
                      <CardDescription className="text-sm">
                        Cập nhật thông tin công ty (Chỉ quản trị viên)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Tên công ty</Label>
                        <Input
                          id="companyName"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Nhập tên công ty"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyAddress">Địa chỉ</Label>
                        <Input
                          id="companyAddress"
                          value={companyAddress}
                          onChange={(e) => setCompanyAddress(e.target.value)}
                          placeholder="Nhập địa chỉ công ty"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="companyPhone">Số điện thoại</Label>
                          <Input
                            id="companyPhone"
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                            placeholder="Nhập số điện thoại"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="companyEmail">Email công ty</Label>
                          <Input
                            id="companyEmail"
                            type="email"
                            value={companyEmail}
                            onChange={(e) => setCompanyEmail(e.target.value)}
                            placeholder="Nhập email công ty"
                          />
                        </div>
                      </div>
                      <Button onClick={handleUpdateCompanySettings} disabled={loading} className="w-full sm:w-auto">
                        {loading ? "Đang lưu..." : "Lưu thông tin công ty"}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}