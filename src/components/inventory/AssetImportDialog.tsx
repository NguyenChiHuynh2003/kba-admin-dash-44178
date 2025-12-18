import { useState, useRef } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Upload, FileSpreadsheet, Check, AlertCircle, Eye } from "lucide-react";
import * as XLSX from "xlsx";

interface AssetImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ParsedAsset {
  stt: number;
  asset_name: string;
  brand: string;
  unit: string;
  quantity_requested: number;
  installation_scope: string;
  notes: string;
  isValid: boolean;
}

interface ExcelMetadata {
  project_name: string;
  project_location: string;
  category: string;
}

export function AssetImportDialog({ open, onClose }: AssetImportDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedAsset[]>([]);
  const [metadata, setMetadata] = useState<ExcelMetadata>({
    project_name: "",
    project_location: "",
    category: "",
  });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const parseExcelFile = async (file: File) => {
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Extract metadata from header rows
      let projectName = "";
      let projectLocation = "";
      let categoryValue = "";
      
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (row) {
          const rowStr = row.join(" ").toLowerCase();
          if (rowStr.includes("tên công trình") || rowStr.includes("ten cong trinh")) {
            projectName = row.find((cell, idx) => idx > 0 && cell && typeof cell === "string" && !cell.toLowerCase().includes("tên công trình")) || "";
          }
          if (rowStr.includes("địa chỉ") || rowStr.includes("dia chi") || rowStr.includes("dự án")) {
            projectLocation = row.find((cell, idx) => idx > 0 && cell && typeof cell === "string" && !cell.toLowerCase().includes("địa chỉ") && !cell.toLowerCase().includes("dự án")) || "";
          }
          if (rowStr.includes("hạng mục") || rowStr.includes("hang muc")) {
            categoryValue = row.find((cell, idx) => idx > 0 && cell && typeof cell === "string" && !cell.toLowerCase().includes("hạng mục")) || "";
          }
        }
      }
      
      setMetadata({
        project_name: projectName.toString().trim(),
        project_location: projectLocation.toString().trim(),
        category: categoryValue.toString().trim(),
      });
      
      // Find the header row (contains "STT" and "Tên Vật tư")
      let headerRowIndex = -1;
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.some(cell => cell && cell.toString().toLowerCase().includes("stt"))) {
          headerRowIndex = i;
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        toast.error("Không tìm thấy dòng tiêu đề trong file Excel");
        return;
      }
      
      // Parse data rows
      const assets: ParsedAsset[] = [];
      for (let i = headerRowIndex + 2; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 2) continue;
        
        const stt = parseInt(row[0]?.toString() || "0");
        if (isNaN(stt) || stt <= 0) continue;
        
        const assetName = row[1]?.toString().trim() || "";
        if (!assetName || assetName.toLowerCase().includes("ghi chú")) continue;
        
        const brand = row[2]?.toString().trim() || "";
        const unit = row[3]?.toString().trim() || "Cái";
        const quantityRequested = parseFloat(row[5]?.toString() || "0") || 0;
        const installationScope = row[10]?.toString().trim() || "";
        const notes = row[11]?.toString().trim() || "";
        
        assets.push({
          stt,
          asset_name: assetName,
          brand,
          unit,
          quantity_requested: quantityRequested,
          installation_scope: installationScope,
          notes,
          isValid: assetName.length > 0,
        });
      }
      
      setParsedData(assets);
      
      if (assets.length === 0) {
        toast.warning("Không tìm thấy dữ liệu tài sản trong file");
      } else {
        toast.success(`Đã đọc ${assets.length} tài sản từ file Excel`);
      }
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

    const validAssets = parsedData.filter(a => a.isValid);
    if (validAssets.length === 0) {
      toast.error("Không có dữ liệu hợp lệ để nhập");
      return;
    }

    setImporting(true);
    try {
      // Build metadata string to include in notes
      const metadataStr = [
        metadata.project_name && `Công trình: ${metadata.project_name}`,
        metadata.project_location && `Địa chỉ: ${metadata.project_location}`,
        metadata.category && `Hạng mục: ${metadata.category}`,
      ].filter(Boolean).join(" | ");

      const assetsToInsert = validAssets.map((asset, index) => ({
        asset_id: `IMP-${Date.now()}-${index + 1}`,
        sku: `SKU-${Date.now()}-${index + 1}`,
        asset_name: asset.asset_name,
        asset_type: "equipment" as const,
        cost_center: metadata.project_name || "Imported",
        brand: asset.brand || null,
        unit: asset.unit,
        quantity_requested: asset.quantity_requested,
        installation_scope: asset.installation_scope || null,
        notes: [asset.notes, metadataStr].filter(Boolean).join(" | ") || null,
        created_by: user.id,
        current_status: "in_stock" as const,
        cost_basis: 0,
      }));

      const { error } = await supabase
        .from("asset_master_data")
        .insert(assetsToInsert);

      if (error) throw error;

      toast.success(`Đã nhập thành công ${validAssets.length} tài sản`);
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
    setMetadata({ project_name: "", project_location: "", category: "" });
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
            Nhập dữ liệu Tài sản từ Excel
          </DialogTitle>
          <DialogDescription>
            Tải lên file Excel chứa danh sách tài sản/vật tư để nhập vào hệ thống
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="excel-upload"
            />
            <Label
              htmlFor="excel-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm font-medium">
                {file ? file.name : "Chọn file Excel (.xlsx, .xls)"}
              </span>
              <span className="text-xs text-muted-foreground">
                Hoặc kéo thả file vào đây
              </span>
            </Label>
          </div>

          {/* Metadata */}
          {(metadata.project_name || metadata.project_location || metadata.category) && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Thông tin dự án:</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {metadata.project_name && (
                  <div>
                    <span className="text-muted-foreground">Công trình:</span>{" "}
                    <span className="font-medium">{metadata.project_name}</span>
                  </div>
                )}
                {metadata.project_location && (
                  <div>
                    <span className="text-muted-foreground">Địa chỉ:</span>{" "}
                    <span className="font-medium">{metadata.project_location}</span>
                  </div>
                )}
                {metadata.category && (
                  <div>
                    <span className="text-muted-foreground">Hạng mục:</span>{" "}
                    <span className="font-medium">{metadata.category}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  Xem trước dữ liệu ({parsedData.filter(a => a.isValid).length} tài sản hợp lệ)
                </h4>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Xóa và chọn file khác
                </Button>
              </div>
              <div className="border rounded-lg max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">STT</TableHead>
                      <TableHead>Tên Vật tư</TableHead>
                      <TableHead>Nhãn hiệu</TableHead>
                      <TableHead className="w-20">ĐVT</TableHead>
                      <TableHead className="w-20 text-right">SL</TableHead>
                      <TableHead>Phạm vi</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((asset, index) => (
                      <TableRow key={index} className={!asset.isValid ? "opacity-50" : ""}>
                        <TableCell>{asset.stt}</TableCell>
                        <TableCell className="font-medium">{asset.asset_name}</TableCell>
                        <TableCell>{asset.brand || "-"}</TableCell>
                        <TableCell>{asset.unit}</TableCell>
                        <TableCell className="text-right">{asset.quantity_requested}</TableCell>
                        <TableCell className="max-w-[120px]">
                          {asset.installation_scope ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="flex items-center gap-1 text-left hover:text-primary transition-colors">
                                  <span className="block max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap">{asset.installation_scope}</span>
                                  <Eye className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 max-h-48 overflow-auto">
                                <p className="text-sm whitespace-pre-wrap">{asset.installation_scope}</p>
                              </PopoverContent>
                            </Popover>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="max-w-[120px]">
                          {asset.notes ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="flex items-center gap-1 text-left hover:text-primary transition-colors">
                                  <span className="block max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap">{asset.notes}</span>
                                  <Eye className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 max-h-48 overflow-auto">
                                <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
                              </PopoverContent>
                            </Popover>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {asset.isValid ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
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
              disabled={loading || importing || parsedData.filter(a => a.isValid).length === 0}
            >
              {importing ? "Đang nhập..." : `Nhập ${parsedData.filter(a => a.isValid).length} tài sản`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}