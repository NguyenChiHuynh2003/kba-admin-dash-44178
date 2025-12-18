import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, Check, AlertCircle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

interface AllocationImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ParsedAllocation {
  asset_id: string;
  asset_name: string;
  employee_name: string;
  purpose: string;
  allocation_date: string;
  expected_return_date: string;
  project_name: string;
  isValid: boolean;
  errors: string[];
  asset_master_id?: string;
  employee_id?: string;
  project_id?: string;
}

export function AllocationImportDialog({ open, onClose }: AllocationImportDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [assets, setAssets] = useState<{ id: string; asset_id: string; asset_name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      fetchReferenceData();
    }
  }, [open]);

  const fetchReferenceData = async () => {
    const [assetsRes, employeesRes, projectsRes] = await Promise.all([
      supabase.from("asset_master_data").select("id, asset_id, asset_name"),
      supabase.from("employees").select("id, full_name"),
      supabase.from("projects").select("id, name"),
    ]);
    setAssets(assetsRes.data || []);
    setEmployees(employeesRes.data || []);
    setProjects(projectsRes.data || []);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        "Mã tài sản": "TS-001",
        "Tên tài sản": "Máy tính xách tay Dell",
        "Tên nhân viên": "Nguyễn Văn A",
        "Mục đích sử dụng": "Công việc văn phòng",
        "Ngày phân bổ": format(new Date(), "dd/MM/yyyy"),
        "Ngày dự kiến hoàn trả": "",
        "Tên dự án": "Dự án ABC",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    
    ws["!cols"] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 25 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 25 },
    ];

    XLSX.writeFile(wb, "mau_phan_bo_tai_san.xlsx");
    toast.success("Đã tải mẫu file Excel!");
  };

  const parseDate = (value: any): string => {
    if (!value) return "";
    if (typeof value === "number") {
      // Excel date serial number
      const date = new Date((value - 25569) * 86400 * 1000);
      return format(date, "yyyy-MM-dd");
    }
    if (typeof value === "string") {
      // Try parsing dd/MM/yyyy
      const parts = value.split("/");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
    return value;
  };

  const parseExcelFile = async (file: File) => {
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const allocations: ParsedAllocation[] = jsonData.map((row) => {
        const errors: string[] = [];
        const assetId = row["Mã tài sản"]?.toString().trim() || "";
        const assetName = row["Tên tài sản"]?.toString().trim() || "";
        const employeeName = row["Tên nhân viên"]?.toString().trim() || "";
        const purpose = row["Mục đích sử dụng"]?.toString().trim() || "";
        const allocationDate = parseDate(row["Ngày phân bổ"]);
        const expectedReturnDate = parseDate(row["Ngày dự kiến hoàn trả"]);
        const projectName = row["Tên dự án"]?.toString().trim() || "";

        // Find matching asset
        const asset = assets.find(
          (a) => a.asset_id.toLowerCase() === assetId.toLowerCase() ||
                 a.asset_name.toLowerCase().includes(assetName.toLowerCase())
        );
        if (!asset) errors.push("Không tìm thấy tài sản");

        // Find matching employee
        const employee = employees.find(
          (e) => e.full_name.toLowerCase().includes(employeeName.toLowerCase())
        );
        if (!employee) errors.push("Không tìm thấy nhân viên");

        // Find matching project (optional)
        const project = projectName
          ? projects.find((p) => p.name.toLowerCase().includes(projectName.toLowerCase()))
          : null;

        if (!purpose) errors.push("Thiếu mục đích sử dụng");

        return {
          asset_id: assetId,
          asset_name: assetName || asset?.asset_name || "",
          employee_name: employeeName,
          purpose,
          allocation_date: allocationDate || format(new Date(), "yyyy-MM-dd"),
          expected_return_date: expectedReturnDate,
          project_name: projectName,
          isValid: errors.length === 0,
          errors,
          asset_master_id: asset?.id,
          employee_id: employee?.id,
          project_id: project?.id,
        };
      });

      setParsedData(allocations);
      const validCount = allocations.filter((a) => a.isValid).length;
      toast.success(`Đã đọc ${allocations.length} dòng, ${validCount} hợp lệ`);
    } catch (error: any) {
      toast.error("Lỗi đọc file Excel: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    const validAllocations = parsedData.filter((a) => a.isValid);
    if (validAllocations.length === 0) {
      toast.error("Không có dữ liệu hợp lệ để nhập");
      return;
    }

    setImporting(true);
    try {
      const allocationsToInsert = validAllocations.map((allocation) => ({
        asset_master_id: allocation.asset_master_id!,
        allocated_to: allocation.employee_id!,
        allocated_by: user.id,
        purpose: allocation.purpose,
        allocation_date: allocation.allocation_date,
        expected_return_date: allocation.expected_return_date || null,
        project_id: allocation.project_id || null,
        status: "active" as const,
      }));

      const { error } = await supabase
        .from("asset_allocations")
        .insert(allocationsToInsert);

      if (error) throw error;

      toast.success(`Đã nhập thành công ${validAllocations.length} phân bổ tài sản`);
      handleReset();
      onClose();
    } catch (error: any) {
      toast.error("Lỗi nhập dữ liệu: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Nhập phân bổ tài sản từ Excel
          </DialogTitle>
          <DialogDescription>
            Tải lên file Excel chứa danh sách phân bổ tài sản
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Tải mẫu file Excel</p>
              <p className="text-xs text-muted-foreground">
                Sử dụng mẫu này để đảm bảo định dạng đúng
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Tải mẫu
            </Button>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="allocation-excel-upload"
            />
            <Label
              htmlFor="allocation-excel-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm font-medium">
                {file ? file.name : "Chọn file Excel (.xlsx, .xls)"}
              </span>
            </Label>
          </div>

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  Xem trước dữ liệu ({parsedData.filter((a) => a.isValid).length}/{parsedData.length} hợp lệ)
                </h4>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Xóa và chọn file khác
                </Button>
              </div>
              <div className="border rounded-lg max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã tài sản</TableHead>
                      <TableHead>Tên tài sản</TableHead>
                      <TableHead>Nhân viên</TableHead>
                      <TableHead>Mục đích</TableHead>
                      <TableHead>Ngày phân bổ</TableHead>
                      <TableHead>Dự án</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((allocation, index) => (
                      <TableRow key={index} className={!allocation.isValid ? "bg-destructive/10" : ""}>
                        <TableCell>{allocation.asset_id}</TableCell>
                        <TableCell>{allocation.asset_name}</TableCell>
                        <TableCell>{allocation.employee_name}</TableCell>
                        <TableCell>{allocation.purpose}</TableCell>
                        <TableCell>{allocation.allocation_date}</TableCell>
                        <TableCell>{allocation.project_name || "-"}</TableCell>
                        <TableCell>
                          {allocation.isValid ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <span className="text-xs text-destructive">
                                {allocation.errors.join(", ")}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button
              onClick={handleImport}
              disabled={loading || importing || parsedData.filter((a) => a.isValid).length === 0}
            >
              {importing ? "Đang nhập..." : `Nhập ${parsedData.filter((a) => a.isValid).length} phân bổ`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
