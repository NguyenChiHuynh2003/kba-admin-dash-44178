import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Key, Shield } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AppRole, roleLabels, availableModules, ModuleId } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role?: string;
  allowed_modules?: string[];
}

const roleBadgeColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 border-red-200",
  accountant: "bg-blue-100 text-blue-800 border-blue-200",
  hr_admin: "bg-green-100 text-green-800 border-green-200",
  project_manager: "bg-purple-100 text-purple-800 border-purple-200",
  user: "bg-gray-100 text-gray-800 border-gray-200",
};

export const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "user" as AppRole,
  });

  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      // Use edge function to get all users including newly created ones
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-get-users`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch users");
      }

      const { users: fetchedUsers } = await response.json();
      
      // Get permissions for all users
      const userIds = fetchedUsers.map((u: any) => u.id);
      let permissionsMap: Record<string, string[]> = {};
      
      if (userIds.length > 0) {
        const { data: permsData } = await supabase
          .from("user_permissions" as any)
          .select("user_id, allowed_modules")
          .in("user_id", userIds) as any;
        
        permissionsMap = (permsData || []).reduce((acc: Record<string, string[]>, p: any) => {
          acc[p.user_id] = p.allowed_modules || [];
          return acc;
        }, {} as Record<string, string[]>);
      }

      const usersWithPermissions = fetchedUsers.map((user: any) => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role || "user",
        allowed_modules: permissionsMap[user.id] || ["overview"],
      }));

      setUsers(usersWithPermissions);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newUserData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast({
        title: "Thành công",
        description: "Tạo tài khoản mới thành công",
      });

      setCreateDialogOpen(false);
      setNewUserData({ email: "", password: "", fullName: "", role: "user" });
      fetchUsers();
    } catch (error: any) {
      let errorMessage = error.message || "Không thể tạo tài khoản";
      
      if (error.message?.includes("email address has already been registered") || 
          error.message?.includes("email_exists")) {
        errorMessage = "Email này đã được đăng ký. Vui lòng sử dụng email khác.";
      }
      
      toast({
        title: "Lỗi tạo tài khoản",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUpdatePassword = async () => {
    if (!selectedUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-password`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            newPassword,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast({
        title: "Thành công",
        description: "Đổi mật khẩu thành công",
      });

      setPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedUser(null);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setSavingPermissions(true);
    try {
      // Upsert permissions - using type assertion until types are regenerated
      const { error } = await (supabase
        .from("user_permissions" as any)
        .upsert({
          user_id: selectedUser.id,
          allowed_modules: selectedModules,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" }) as any);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Cập nhật quyền truy cập thành công",
      });

      setPermissionDialogOpen(false);
      setSelectedUser(null);
      setSelectedModules([]);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: deleteUserId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast({
        title: "Thành công",
        description: "Xóa người dùng thành công",
      });

      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const selectAllModules = () => {
    setSelectedModules(availableModules.map(m => m.id));
  };

  const deselectAllModules = () => {
    setSelectedModules([]);
  };

  const openPermissionDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedModules(user.allowed_modules || ["overview"]);
    setPermissionDialogOpen(true);
  };

  const getModuleCount = (user: UserProfile) => {
    if (user.role === "admin") return availableModules.length;
    return user.allowed_modules?.length || 0;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Quản lý người dùng</CardTitle>
            <CardDescription>Tạo, chỉnh sửa và phân quyền tài khoản người dùng</CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Tạo tài khoản mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo tài khoản mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin để tạo tài khoản người dùng mới
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <Input
                    id="fullName"
                    value={newUserData.fullName}
                    onChange={(e) =>
                      setNewUserData({ ...newUserData, fullName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) =>
                      setNewUserData({ ...newUserData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserData.password}
                    onChange={(e) =>
                      setNewUserData({ ...newUserData, password: e.target.value })
                    }
                  />
                </div>
                <Button onClick={handleCreateUser} className="w-full">
                  Tạo tài khoản
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Quyền truy cập</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={roleBadgeColors[user.role || "user"]}
                    >
                      {roleLabels[user.role as AppRole] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {user.role === "admin" 
                        ? "Toàn quyền" 
                        : `${getModuleCount(user)}/${availableModules.length} module`
                      }
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {user.role !== "admin" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPermissionDialog(user)}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Phân quyền
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setPasswordDialogOpen(true);
                      }}
                    >
                      <Key className="w-4 h-4 mr-1" />
                      Đổi mật khẩu
                    </Button>
                    {user.role !== "admin" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteUserId(user.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Xóa
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Permission Dialog with Checkboxes */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Phân quyền truy cập</DialogTitle>
            <DialogDescription>
              Chọn các module mà <strong>{selectedUser?.full_name}</strong> được phép truy cập
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllModules}>
                Chọn tất cả
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllModules}>
                Bỏ chọn tất cả
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
              {availableModules.map((module) => (
                <div 
                  key={module.id} 
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={module.id}
                    checked={selectedModules.includes(module.id)}
                    onCheckedChange={() => toggleModule(module.id)}
                  />
                  <Label 
                    htmlFor={module.id} 
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {module.label}
                  </Label>
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Đã chọn: {selectedModules.length}/{availableModules.length} module
            </div>
            <Button 
              onClick={handleSavePermissions} 
              className="w-full"
              disabled={savingPermissions}
            >
              {savingPermissions ? "Đang lưu..." : "Lưu quyền truy cập"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>
              Đổi mật khẩu cho {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleUpdatePassword} className="w-full">
              Cập nhật mật khẩu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
