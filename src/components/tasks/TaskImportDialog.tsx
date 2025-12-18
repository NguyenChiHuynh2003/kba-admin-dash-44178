import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportRow {
  "Tiêu đề"?: string;
  "Dự án"?: string;
  "Người thực hiện"?: string;
  "Trạng thái"?: string;
  "Ưu tiên"?: string;
  "Ngày đến hạn"?: string;
  "Mô tả"?: string;
}

interface Project {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  full_name: string;
}

interface TaskImportDialogProps {
  onImportSuccess: () => void;
}

export const TaskImportDialog = ({ onImportSuccess }: TaskImportDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchLookupData = async () => {
    const [projectsRes, employeesRes] = await Promise.all([
      supabase.from("projects").select("id, name"),
      supabase.from("employees").select("id, full_name"),
    ]);

    if (projectsRes.data) setProjects(projectsRes.data);
    if (employeesRes.data) setEmployees(employeesRes.data);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrors([]);
    setPreviewData([]);

    await fetchLookupData();

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ImportRow>(worksheet);

        if (jsonData.length === 0) {
          setErrors(["File không có dữ liệu"]);
          return;
        }

        // Validate required columns
        const requiredColumns = ["Tiêu đề", "Dự án"];
        const firstRow = jsonData[0];
        const missingColumns = requiredColumns.filter(
          (col) => !(col in firstRow)
        );

        if (missingColumns.length > 0) {
          setErrors([`Thiếu cột bắt buộc: ${missingColumns.join(", ")}`]);
          return;
        }

        setPreviewData(jsonData);
      } catch (error) {
        setErrors(["Không thể đọc file Excel. Vui lòng kiểm tra định dạng file."]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const mapStatus = (status: string | undefined): "pending" | "in_progress" | "completed" | "overdue" => {
    if (!status) return "pending";
    const statusMap: Record<string, "pending" | "in_progress" | "completed" | "overdue"> = {
      "Chờ xử lý": "pending",
      "Đang thực hiện": "in_progress",
      "Hoàn thành": "completed",
      "Quá hạn": "overdue",
    };
    return statusMap[status] || "pending";
  };

  const mapPriority = (priority: string | undefined): string => {
    if (!priority) return "medium";
    const priorityMap: Record<string, string> = {
      "Thấp": "low",
      "Trung bình": "medium",
      "Cao": "high",
    };
    return priorityMap[priority] || "medium";
  };

  const parseDate = (dateStr: string | undefined): string | null => {
    if (!dateStr) return null;
    
    // Handle Excel serial date number
    if (typeof dateStr === "number") {
      const date = XLSX.SSF.parse_date_code(dateStr);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
      }
    }
    
    // Handle Vietnamese date format (dd/mm/yyyy)
    const parts = String(dateStr).split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    // Handle ISO format
    if (String(dateStr).includes("-")) {
      return String(dateStr).split("T")[0];
    }
    
    return null;
  };

  const handleImport = async () => {
    if (!user) {
      toast({
        title: "Lỗi",
        description: "Bạn cần đăng nhập để thực hiện thao tác này",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    const importErrors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < previewData.length; i++) {
      const row = previewData[i];
      const rowNum = i + 2; // Excel rows start at 1, plus header row

      // Find project by name
      const project = projects.find(
        (p) => p.name.toLowerCase() === row["Dự án"]?.toLowerCase()
      );

      if (!project) {
        importErrors.push(`Dòng ${rowNum}: Không tìm thấy dự án "${row["Dự án"]}"`);
        continue;
      }

      // Find employee by name (optional)
      let assignedTo: string | null = null;
      if (row["Người thực hiện"]) {
        const employee = employees.find(
          (e) => e.full_name.toLowerCase() === row["Người thực hiện"]?.toLowerCase()
        );
        if (employee) {
          assignedTo = employee.id;
        }
      }

      const taskData = {
        title: row["Tiêu đề"] || "",
        description: row["Mô tả"] || null,
        status: mapStatus(row["Trạng thái"]),
        priority: mapPriority(row["Ưu tiên"]),
        due_date: parseDate(row["Ngày đến hạn"]),
        project_id: project.id,
        assigned_to: assignedTo,
        created_by: user.id,
      };

      if (!taskData.title) {
        importErrors.push(`Dòng ${rowNum}: Thiếu tiêu đề nhiệm vụ`);
        continue;
      }

      const { error } = await supabase.from("tasks").insert([taskData]);

      if (error) {
        importErrors.push(`Dòng ${rowNum}: ${error.message}`);
      } else {
        successCount++;
      }
    }

    setImporting(false);
    setErrors(importErrors);

    if (successCount > 0) {
      toast({
        title: "Nhập dữ liệu thành công",
        description: `Đã tạo ${successCount} nhiệm vụ${importErrors.length > 0 ? `, ${importErrors.length} lỗi` : ""}`,
      });
      onImportSuccess();
      
      if (importErrors.length === 0) {
        setOpen(false);
        setPreviewData([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } else if (importErrors.length > 0) {
      toast({
        title: "Lỗi nhập dữ liệu",
        description: "Không thể tạo nhiệm vụ nào. Vui lòng kiểm tra chi tiết lỗi.",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setPreviewData([]);
      setErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Nhập Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nhập nhiệm vụ từ Excel</DialogTitle>
          <DialogDescription>
            Tải lên file Excel với các cột: Tiêu đề, Dự án, Người thực hiện, Trạng thái, Ưu tiên, Ngày đến hạn, Mô tả
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="task-import-file"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Chọn file Excel
            </Button>
            {previewData.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {previewData.length} dòng dữ liệu
              </span>
            )}
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {previewData.length > 0 && (
            <>
              <div className="text-sm font-medium">Xem trước dữ liệu:</div>
              <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Tiêu đề</th>
                        <th className="text-left p-2">Dự án</th>
                        <th className="text-left p-2">Người thực hiện</th>
                        <th className="text-left p-2">Trạng thái</th>
                        <th className="text-left p-2">Ưu tiên</th>
                        <th className="text-left p-2">Ngày đến hạn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">{row["Tiêu đề"]}</td>
                          <td className="p-2">{row["Dự án"]}</td>
                          <td className="p-2">{row["Người thực hiện"] || "-"}</td>
                          <td className="p-2">{row["Trạng thái"] || "Chờ xử lý"}</td>
                          <td className="p-2">{row["Ưu tiên"] || "Trung bình"}</td>
                          <td className="p-2">{row["Ngày đến hạn"] || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      ... và {previewData.length - 10} dòng khác
                    </p>
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Hủy
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? (
                    "Đang nhập..."
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Nhập {previewData.length} nhiệm vụ
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
