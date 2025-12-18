import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonsProps {
  onExportExcel: () => void;
  onExportPDF: () => void | Promise<void>;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
}

export const ExportButtons = ({
  onExportExcel,
  onExportPDF,
  disabled = false,
  size = "default",
}: ExportButtonsProps) => {
  const handleExportExcel = () => {
    try {
      onExportExcel();
      toast.success("Đã xuất file Excel thành công");
    } catch (error) {
      console.error("Export Excel error:", error);
      toast.error("Lỗi khi xuất file Excel");
    }
  };

  const handleExportPDF = async () => {
    try {
      await onExportPDF();
      toast.success("Đã xuất file PDF thành công");
    } catch (error) {
      console.error("Export PDF error:", error);
      toast.error("Lỗi khi xuất file PDF");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} disabled={disabled}>
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Xuất báo cáo</span>
          <span className="sm:hidden">Xuất</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          Xuất Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="h-4 w-4 mr-2 text-red-600" />
          Xuất PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
