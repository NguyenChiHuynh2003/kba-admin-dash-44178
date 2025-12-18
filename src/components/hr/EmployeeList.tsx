import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EmployeeDialog } from "./EmployeeDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExportButtons } from "@/components/ExportButtons";
import { exportToExcel, exportToPDF, employeeExportConfig } from "@/lib/exportUtils";

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

export const EmployeeList = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewPhotosOpen, setViewPhotosOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
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

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa nhân viên này?")) return;

    try {
      const { error } = await supabase.from("employees").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã xóa nhân viên",
      });
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportEmployees = async (format: "excel" | "pdf") => {
    const options = {
      title: "Báo cáo Nhân sự",
      filename: "bao_cao_nhan_su",
      ...employeeExportConfig,
      data: filteredEmployees,
      summary: [
        { label: "Tổng số nhân viên", value: filteredEmployees.length.toString() },
      ],
    };
    if (format === "excel") {
      exportToExcel(options);
    } else {
      await exportToPDF(options);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Danh sách nhân viên ({filteredEmployees.length})</CardTitle>
            <div className="flex gap-2">
              <ExportButtons
                onExportExcel={() => handleExportEmployees("excel")}
                onExportPDF={() => handleExportEmployees("pdf")}
                disabled={loading || filteredEmployees.length === 0}
              />
              <Button onClick={() => { setSelectedEmployee(null); setDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm nhân viên
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm nhân viên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STT</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Tài khoản</TableHead>
                  <TableHead>Ngày sinh</TableHead>
                  <TableHead>Ngày vào làm</TableHead>
                  <TableHead>Chức vụ</TableHead>
                  <TableHead>Phòng ban</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Chưa có nhân viên
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee, index) => (
                    <TableRow key={employee.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{employee.full_name}</TableCell>
                      <TableCell>
                        {employee.user_id ? (
                          <Badge variant="default" className="gap-1">
                            <UserCheck className="w-3 h-3" />
                            Đã liên kết
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <UserX className="w-3 h-3" />
                            Chưa liên kết
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.date_of_birth
                          ? format(new Date(employee.date_of_birth), "dd/MM/yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(employee.date_joined), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{employee.position || "-"}</TableCell>
                      <TableCell>{employee.department || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setViewingEmployee(employee);
                              setViewPhotosOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(employee.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={selectedEmployee}
        onSuccess={fetchEmployees}
      />

      <Dialog open={viewPhotosOpen} onOpenChange={setViewPhotosOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ảnh nhân viên - {viewingEmployee?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold mb-2">Ảnh thẻ nhân viên</p>
              {viewingEmployee?.employee_card_photo_url ? (
                <img
                  src={viewingEmployee.employee_card_photo_url}
                  alt="Ảnh thẻ"
                  className="w-full rounded-lg border"
                />
              ) : (
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                  Chưa có ảnh
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold mb-2">Ảnh CMND/CCCD</p>
              {viewingEmployee?.id_card_photo_url ? (
                <img
                  src={viewingEmployee.id_card_photo_url}
                  alt="Ảnh CMND"
                  className="w-full rounded-lg border"
                />
              ) : (
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                  Chưa có ảnh
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
