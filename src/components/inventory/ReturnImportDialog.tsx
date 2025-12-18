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

interface ReturnImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ParsedReturn {
  asset_id: string;
  asset_name: string;
  employee_name: string;
  return_date: string;
  return_condition: string;
  reusability_percentage: number | null;
  notes: string;
  isValid: boolean;
  errors: string[];
  allocation_id?: string;
}

interface ActiveAllocation {
  id: string;
  asset_master_id: string;
  allocated_to: string;
  asset_master_data: { asset_id: string; asset_name: string } | null;
  allocated_to_employee?: { full_name: string } | null;
}

export function ReturnImportDialog({ open, onClose }: ReturnImportDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeAllocations, setActiveAllocations] = useState<ActiveAllocation[]>([]);

  useEffect(() => {
    if (open) {
      fetchActiveAllocations();
    }
  }, [open]);

  const fetchActiveAllocations = async () => {
    const { data: allocationsData } = await supabase
      .from("asset_allocations")
      .select(`
        id,
        asset_master_id,
        allocated_to,
        asset_master_data(asset_id, asset_name)
      `)
      .in("status", ["active", "overdue"]);

    if (!allocationsData) {
      setActiveAllocations([]);
      return;
    }

    const employeeIds = [...new Set(allocationsData.map((a) => a.allocated_to))];
    const { data: employeesData } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", employeeIds);

    const employeesMap = (employeesData || []).reduce((acc, e) => {
      acc[e.id] = { full_name: e.full_name };
      return acc;
    }, {} as Record<string, { full_name: string }>);

    const allocationsWithEmployees = allocationsData.map((allocation) => ({
      ...allocation,
      allocated_to_employee: employeesMap[allocation.allocated_to] || null,
    }));

    setActiveAllocations(allocationsWithEmployees as any);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        "Mã tài sản": "TS-001",
        "Tên tài sản": "Máy tính xách tay Dell",
        "Tên nhân viên": "Nguyễn Văn A",
        "Ngày hoàn trả": format(new Date(), "dd/MM/yyyy"),
        "Tình trạng hoàn trả": "Tốt",
        "% Tái sử dụng": 90,
        "Ghi chú": "",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    
    ws["!cols"] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 30 },
    ];

    XLSX.writeFile(wb, "mau_hoan_tra_tai_san.xlsx");
    toast.success("Đã tải mẫu file Excel!");
  };

  const parseDate = (value: any): string => {
    if (!value) return format(new Date(), "yyyy-MM-dd");
    if (typeof value === "number") {
      const date = new Date((value - 25569) * 86400 * 1000);
      return format(date, "yyyy-MM-dd");
    }
    if (typeof value === "string") {
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

      const returns: ParsedReturn[] = jsonData.map((row) => {
        const errors: string[] = [];
        const assetId = row["Mã tài sản"]?.toString().trim() || "";
        const assetName = row["Tên tài sản"]?.toString().trim() || "";
        const employeeName = row["Tên nhân viên"]?.toString().trim() || "";
        const returnDate = parseDate(row["Ngày hoàn trả"]);
        const returnCondition = row["Tình trạng hoàn trả"]?.toString().trim() || "";
        const reusabilityPercentage = parseFloat(row["% Tái sử dụng"]) || null;
        const notes = row["Ghi chú"]?.toString().trim() || "";

        // Find matching active allocation
        const allocation = activeAllocations.find((a) => {
          const assetMatch =
            a.asset_master_data?.asset_id.toLowerCase() === assetId.toLowerCase() ||
            a.asset_master_data?.asset_name.toLowerCase().includes(assetName.toLowerCase());
          const employeeMatch = a.allocated_to_employee?.full_name
            .toLowerCase()
            .includes(employeeName.toLowerCase());
          return assetMatch && employeeMatch;
        });

        if (!allocation) {
          errors.push("Không tìm thấy phân bổ đang hoạt động cho tài sản và nhân viên này");
        }

        if (!returnCondition) errors.push("Thiếu tình trạng hoàn trả");

        return {
          asset_id: assetId,
          asset_name: assetName || allocation?.asset_master_data?.asset_name || "",
          employee_name: employeeName,
          return_date: returnDate,
          return_condition: returnCondition,
          reusability_percentage: reusabilityPercentage,
          notes,
          isValid: errors.length === 0,
          errors,
          allocation_id: allocation?.id,
        };
      });

      setParsedData(returns);
      const validCount = returns.filter((r) => r.isValid).length;
      toast.success(`Đã đọc ${returns.length} dòng, ${validCount} hợp lệ`);
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

    const validReturns = parsedData.filter((r) => r.isValid);
    if (validReturns.length === 0) {
      toast.error("Không có dữ liệu hợp lệ để nhập");
      return;
    }

    setImporting(true);
    try {
      // Update allocations to returned status
      for (const returnData of validReturns) {
        const { error } = await supabase
          .from("asset_allocations")
          .update({
            status: "returned",
            actual_return_date: returnData.return_date,
            return_condition: returnData.return_condition,
            reusability_percentage: returnData.reusability_percentage,
          })
          .eq("id", returnData.allocation_id);

        if (error) throw error;
      }

      toast.success(`Đã cập nhật thành công ${validReturns.length} hoàn trả tài sản`);
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
            Nhập hoàn trả tài sản từ Excel
          </DialogTitle>
          <DialogDescription>
            Tải lên file Excel chứa danh sách hoàn trả tài sản
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
              id="return-excel-upload"
            />
            <Label
              htmlFor="return-excel-upload"
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
                  Xem trước dữ liệu ({parsedData.filter((r) => r.isValid).length}/{parsedData.length} hợp lệ)
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
                      <TableHead>Ngày hoàn trả</TableHead>
                      <TableHead>Tình trạng</TableHead>
                      <TableHead>% Tái sử dụng</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((returnData, index) => (
                      <TableRow key={index} className={!returnData.isValid ? "bg-destructive/10" : ""}>
                        <TableCell>{returnData.asset_id}</TableCell>
                        <TableCell>{returnData.asset_name}</TableCell>
                        <TableCell>{returnData.employee_name}</TableCell>
                        <TableCell>{returnData.return_date}</TableCell>
                        <TableCell>{returnData.return_condition}</TableCell>
                        <TableCell>
                          {returnData.reusability_percentage != null
                            ? `${returnData.reusability_percentage}%`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {returnData.isValid ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <span className="text-xs text-destructive max-w-[150px] truncate">
                                {returnData.errors.join(", ")}
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
              disabled={loading || importing || parsedData.filter((r) => r.isValid).length === 0}
            >
              {importing ? "Đang nhập..." : `Nhập ${parsedData.filter((r) => r.isValid).length} hoàn trả`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
