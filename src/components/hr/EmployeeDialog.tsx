import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Employee {
  id: string;
  user_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  date_joined: string;
  position: string | null;
  department: string | null;
  phone: string | null;
  employee_card_photo_url: string | null;
  id_card_photo_url: string | null;
  certificate_expiry_date: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
}

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSuccess: () => void;
}

export const EmployeeDialog = ({ open, onOpenChange, employee, onSuccess }: EmployeeDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    date_joined: new Date().toISOString().split("T")[0],
    position: "",
    department: "",
    phone: "",
    email: "",
    password: "",
    certificate_expiry_date: "",
  });
  const [employeeCardFile, setEmployeeCardFile] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Fetch available user accounts
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      if (data) setUsers(data);
    };
    if (open) fetchUsers();
  }, [open]);

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name,
        date_of_birth: employee.date_of_birth || "",
        date_joined: employee.date_joined,
        position: employee.position || "",
        department: employee.department || "",
        phone: employee.phone || "",
        email: "",
        password: "",
        certificate_expiry_date: employee.certificate_expiry_date || "",
      });
      setSelectedUserId(employee.user_id);
    } else {
      setFormData({
        full_name: "",
        date_of_birth: "",
        date_joined: new Date().toISOString().split("T")[0],
        position: "",
        department: "",
        phone: "",
        email: "",
        password: "",
        certificate_expiry_date: "",
      });
      setSelectedUserId(null);
    }
  }, [employee]);

  const uploadPhoto = async (file: File, path: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("employee-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("employee-photos").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let userId = employee?.user_id || null;

      // Create user account if email and password provided
      if (!employee && formData.email && formData.password) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) throw new Error("Không có quyền truy cập");

        const response = await supabase.functions.invoke("admin-create-user", {
          body: {
            email: formData.email,
            password: formData.password,
            fullName: formData.full_name,
          },
        });

        if (response.error) throw response.error;
        userId = response.data?.user?.user?.id || null;
      }

      // Upload photos
      let employeeCardUrl = employee?.employee_card_photo_url || null;
      let idCardUrl = employee?.id_card_photo_url || null;

      if (employeeCardFile) {
        employeeCardUrl = await uploadPhoto(employeeCardFile, "employee-cards");
      }

      if (idCardFile) {
        idCardUrl = await uploadPhoto(idCardFile, "id-cards");
      }

      // For editing, use selectedUserId; for new employee, use userId from account creation
      const finalUserId = employee ? selectedUserId : userId;

      const employeeData = {
        user_id: finalUserId,
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth || null,
        date_joined: formData.date_joined,
        position: formData.position || null,
        department: formData.department || null,
        phone: formData.phone || null,
        employee_card_photo_url: employeeCardUrl,
        id_card_photo_url: idCardUrl,
        certificate_expiry_date: formData.certificate_expiry_date || null,
      };

      if (employee) {
        const { error } = await supabase
          .from("employees")
          .update(employeeData)
          .eq("id", employee.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert(employeeData);

        if (error) throw error;
      }

      toast({
        title: "Thành công",
        description: employee ? "Đã cập nhật nhân viên" : "Đã thêm nhân viên mới",
      });

      onSuccess();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Họ tên *</Label>
              <Input
                id="full_name"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="date_of_birth">Ngày sinh</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="date_joined">Ngày vào làm *</Label>
              <Input
                id="date_joined"
                type="date"
                required
                value={formData.date_joined}
                onChange={(e) => setFormData({ ...formData, date_joined: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="position">Chức vụ</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="department">Phòng ban</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="certificate_expiry_date">Ngày hết hạn bằng cấp</Label>
              <Input
                id="certificate_expiry_date"
                type="date"
                value={formData.certificate_expiry_date}
                onChange={(e) => setFormData({ ...formData, certificate_expiry_date: e.target.value })}
              />
            </div>

            {employee ? (
              <div>
                <Label htmlFor="user_account">Liên kết tài khoản</Label>
                <Select
                  value={selectedUserId || "none"}
                  onValueChange={(value) => setSelectedUserId(value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tài khoản người dùng" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="none">-- Không liên kết --</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="email">Email đăng nhập</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Để trống nếu không cần tài khoản"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Để trống nếu không cần tài khoản"
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employee_card">Ảnh thẻ nhân viên</Label>
              <Input
                id="employee_card"
                type="file"
                accept="image/*"
                onChange={(e) => setEmployeeCardFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="id_card">Ảnh CMND/CCCD</Label>
              <Input
                id="id_card"
                type="file"
                accept="image/*"
                onChange={(e) => setIdCardFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {employee ? "Cập nhật" : "Thêm mới"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
