import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Plus, FileText, Upload, Trash2, ChevronLeft, ChevronRight, Package, Wrench, Box, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AssetMasterDialog } from "./AssetMasterDialog";
import { AssetImportDialog } from "./AssetImportDialog";
import { ExportButtons } from "@/components/ExportButtons";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

const ITEMS_PER_PAGE = 20;

interface AssetMaster {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_type: string;
  brand: string | null;
  unit: string | null;
  sku: string;
  cost_center: string;
  cost_basis: number;
  accumulated_depreciation: number | null;
  nbv: number | null;
  current_status: string;
  depreciation_method: string | null;
  useful_life_months: number | null;
  activation_date: string | null;
  notes: string | null;
  created_at: string;
  stock_quantity: number;
  allocated_quantity: number;
}

export function AssetMasterList() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetMaster | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<AssetMaster | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("asset_master_data")
        .select("id, asset_id, asset_name, asset_type, brand, unit, sku, cost_center, cost_basis, accumulated_depreciation, nbv, current_status, depreciation_method, useful_life_months, activation_date, notes, created_at, stock_quantity, allocated_quantity")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      toast.error("Lỗi tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = Object.values(asset).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesStatus = statusFilter === "all" || asset.current_status === statusFilter;
    const matchesType = typeFilter === "all" || asset.asset_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  // Count statistics
  const countByStatus = {
    total: assets.length,
    in_stock: assets.filter(a => a.current_status === "in_stock").length,
    active: assets.filter(a => a.current_status === "active").length,
    allocated: assets.filter(a => a.current_status === "allocated").length,
    under_maintenance: assets.filter(a => a.current_status === "under_maintenance").length,
    disposed: assets.filter(a => a.current_status === "disposed").length,
  };

  const countByType = {
    equipment: assets.filter(a => a.asset_type === "equipment").length,
    tools: assets.filter(a => a.asset_type === "tools").length,
    materials: assets.filter(a => a.asset_type === "materials").length,
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

  const handleEdit = (asset: AssetMaster) => {
    setEditingAsset(asset);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAsset(null);
    fetchAssets();
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    fetchAssets();
  };

  const handleDelete = async () => {
    if (!deletingAsset) return;
    try {
      const { error } = await supabase
        .from("asset_master_data")
        .delete()
        .eq("id", deletingAsset.id);

      if (error) throw error;
      toast.success("Đã xóa tài sản thành công");
      fetchAssets();
    } catch (error: any) {
      toast.error("Lỗi xóa tài sản: " + error.message);
    } finally {
      setDeletingAsset(null);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      in_stock: "Trong kho",
      active: "Đang sử dụng",
      allocated: "Đã phân bổ",
      under_maintenance: "Đang bảo trì",
      ready_for_reallocation: "Sẵn sàng tái phân bổ",
      disposed: "Đã thanh lý",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      in_stock: "bg-blue-500",
      active: "bg-green-500",
      allocated: "bg-yellow-500",
      under_maintenance: "bg-orange-500",
      ready_for_reallocation: "bg-purple-500",
      disposed: "bg-gray-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      equipment: "Thiết bị",
      tools: "Công cụ",
      materials: "Vật liệu",
    };
    return labels[type] || type;
  };

  const formatCurrency = (value: number | null) => {
    if (value == null) return "-";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const handleExportAssets = async (format: "excel" | "pdf") => {
    const exportData = filteredAssets.map((asset, index) => ({
      STT: index + 1,
      "Mã tài sản": asset.asset_id,
      "Tên tài sản": asset.asset_name,
      "Loại tài sản": getTypeLabel(asset.asset_type),
      "Nhãn hiệu": asset.brand || "",
      "ĐVT": asset.unit || "",
      "SKU": asset.sku,
      "Trung tâm chi phí": asset.cost_center,
      "Nguyên giá": asset.cost_basis,
      "Khấu hao lũy kế": asset.accumulated_depreciation || 0,
      "Giá trị còn lại": asset.nbv || 0,
      "Trạng thái": getStatusLabel(asset.current_status),
      "Ghi chú": asset.notes || "",
    }));

    const options = {
      title: "Danh mục Tài sản",
      filename: "danh_muc_tai_san",
      columns: [
        { key: "STT", header: "STT" },
        { key: "Mã tài sản", header: "Mã tài sản" },
        { key: "Tên tài sản", header: "Tên tài sản" },
        { key: "Loại tài sản", header: "Loại tài sản" },
        { key: "Nhãn hiệu", header: "Nhãn hiệu" },
        { key: "ĐVT", header: "ĐVT" },
        { key: "Trung tâm chi phí", header: "Trung tâm CP" },
        { key: "Nguyên giá", header: "Nguyên giá" },
        { key: "Khấu hao lũy kế", header: "Khấu hao LK" },
        { key: "Giá trị còn lại", header: "Giá trị còn lại" },
        { key: "Trạng thái", header: "Trạng thái" },
      ],
      data: exportData,
      summary: [
        { label: "Tổng số tài sản", value: filteredAssets.length.toString() },
        { label: "Tổng nguyên giá", value: formatCurrency(filteredAssets.reduce((sum, a) => sum + (a.cost_basis || 0), 0)) },
        { label: "Tổng giá trị còn lại", value: formatCurrency(filteredAssets.reduce((sum, a) => sum + (a.nbv || 0), 0)) },
      ],
    };
    if (format === "excel") {
      exportToExcel(options);
    } else {
      await exportToPDF(options);
    }
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{countByStatus.total}</p>
                <p className="text-xs text-muted-foreground">Tổng tài sản</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Box className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{countByStatus.in_stock}</p>
                <p className="text-xs text-muted-foreground">Trong kho</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Wrench className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{countByStatus.allocated}</p>
                <p className="text-xs text-muted-foreground">Đã phân bổ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{countByStatus.under_maintenance}</p>
                <p className="text-xs text-muted-foreground">Đang bảo trì</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-lg font-semibold">{countByType.equipment}</p>
              <p className="text-xs text-muted-foreground">Thiết bị</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-lg font-semibold">{countByType.tools}</p>
              <p className="text-xs text-muted-foreground">Công cụ</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-1 gap-2 w-full sm:w-auto flex-wrap">
          <Input
            placeholder="Tìm kiếm tài sản..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="in_stock">Trong kho</SelectItem>
              <SelectItem value="active">Đang sử dụng</SelectItem>
              <SelectItem value="allocated">Đã phân bổ</SelectItem>
              <SelectItem value="under_maintenance">Đang bảo trì</SelectItem>
              <SelectItem value="ready_for_reallocation">Sẵn sàng tái phân bổ</SelectItem>
              <SelectItem value="disposed">Đã thanh lý</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Loại tài sản" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="equipment">Thiết bị</SelectItem>
              <SelectItem value="tools">Công cụ</SelectItem>
              <SelectItem value="materials">Vật liệu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButtons
            onExportExcel={() => handleExportAssets("excel")}
            onExportPDF={() => handleExportAssets("pdf")}
            disabled={loading || filteredAssets.length === 0}
          />
          <Button
            onClick={fetchAssets}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button
            onClick={() => setImportDialogOpen(true)}
            variant="outline"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Nhập Excel
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm Tài sản
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">STT</TableHead>
              <TableHead>Mã tài sản</TableHead>
              <TableHead className="min-w-[200px]">Tên tài sản</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Nhãn hiệu</TableHead>
              <TableHead>ĐVT</TableHead>
              <TableHead className="text-right">Tồn kho</TableHead>
              <TableHead className="text-right">Đã phân bổ</TableHead>
              <TableHead className="text-right">Nguyên giá</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-20">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8">
                  Chưa có dữ liệu tài sản
                </TableCell>
              </TableRow>
            ) : (
              paginatedAssets.map((asset, index) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{asset.asset_id}</TableCell>
                  <TableCell>{asset.asset_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTypeLabel(asset.asset_type)}</Badge>
                  </TableCell>
                  <TableCell>{asset.brand || "-"}</TableCell>
                  <TableCell>{asset.unit || "-"}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {asset.stock_quantity || 0}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-orange-600">
                    {asset.allocated_quantity || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(asset.cost_basis)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(asset.current_status)}>
                      {getStatusLabel(asset.current_status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(asset)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingAsset(asset)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredAssets.length)} trong tổng số {filteredAssets.length} tài sản
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, idx, arr) => (
                  <span key={page} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  </span>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AssetMasterDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        editingAsset={editingAsset}
      />

      <AssetImportDialog
        open={importDialogOpen}
        onClose={handleCloseImportDialog}
      />

      <AlertDialog open={!!deletingAsset} onOpenChange={() => setDeletingAsset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa tài sản</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tài sản "{deletingAsset?.asset_name}"? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
