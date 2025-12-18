import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Package,
  FileText,
  TrendingDown,
  ArrowLeftRight,
  MapPin,
  Wrench,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface AssetMasterDialogProps {
  open: boolean;
  onClose: () => void;
  editingAsset?: any;
}

export function AssetMasterDialog({
  open,
  onClose,
  editingAsset,
}: AssetMasterDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    asset_name: "",
    brand: "",
    unit: "",
    stock_quantity: "",
    quantity_supplied_previous: "",
    quantity_requested: "",
    quantity_per_contract: "",
    installation_scope: "",
    notes: "",
  });

  // Related data states
  const [grnItems, setGrnItems] = useState<any[]>([]);
  const [depreciationSchedules, setDepreciationSchedules] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [disposals, setDisposals] = useState<any[]>([]);
  const [inventoryItem, setInventoryItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingAsset) {
      setFormData({
        asset_name: editingAsset.asset_name || "",
        brand: editingAsset.brand || "",
        unit: editingAsset.unit || "",
        stock_quantity: editingAsset.stock_quantity?.toString() || "0",
        quantity_supplied_previous: editingAsset.quantity_supplied_previous?.toString() || "",
        quantity_requested: editingAsset.quantity_requested?.toString() || "",
        quantity_per_contract: editingAsset.quantity_per_contract?.toString() || "",
        installation_scope: editingAsset.installation_scope || "",
        notes: editingAsset.notes || "",
      });
      fetchRelatedData(editingAsset.id);
    } else {
      resetForm();
      clearRelatedData();
    }
  }, [editingAsset, open]);

  const resetForm = () => {
    setFormData({
      asset_name: "",
      brand: "",
      unit: "",
      stock_quantity: "",
      quantity_supplied_previous: "",
      quantity_requested: "",
      quantity_per_contract: "",
      installation_scope: "",
      notes: "",
    });
  };

  const clearRelatedData = () => {
    setGrnItems([]);
    setDepreciationSchedules([]);
    setAllocations([]);
    setLocationHistory([]);
    setMaintenanceRecords([]);
    setDisposals([]);
    setInventoryItem(null);
  };

  const fetchRelatedData = async (assetId: string) => {
    setLoading(true);
    try {
      // Fetch all related data in parallel
      const [
        grnRes,
        depRes,
        allocRes,
        locRes,
        maintRes,
        dispRes,
      ] = await Promise.all([
        supabase
          .from("grn_items")
          .select("*, goods_receipt_notes(*)")
          .eq("asset_master_id", assetId),
        supabase
          .from("depreciation_schedules")
          .select("*")
          .eq("asset_master_id", assetId)
          .order("period_date", { ascending: false }),
        supabase
          .from("asset_allocations")
          .select("*, projects(name)")
          .eq("asset_master_id", assetId)
          .order("allocation_date", { ascending: false }),
        supabase
          .from("asset_location_history")
          .select("*")
          .eq("asset_master_id", assetId)
          .order("timestamp", { ascending: false }),
        supabase
          .from("maintenance_records")
          .select("*")
          .eq("asset_master_id", assetId)
          .order("maintenance_date", { ascending: false }),
        supabase
          .from("asset_disposals")
          .select("*")
          .eq("asset_master_id", assetId),
      ]);

      setGrnItems(grnRes.data || []);
      setDepreciationSchedules(depRes.data || []);
      setAllocations(allocRes.data || []);
      setLocationHistory(locRes.data || []);
      setMaintenanceRecords(maintRes.data || []);
      setDisposals(dispRes.data || []);

      // Fetch linked inventory item if exists
      if (editingAsset?.inventory_item_id) {
        const { data: invItem } = await supabase
          .from("inventory_items")
          .select("*, product_categories(name), brands(name), product_groups(name)")
          .eq("id", editingAsset.inventory_item_id)
          .single();
        setInventoryItem(invItem);
      }
    } catch (error) {
      console.error("Error fetching related data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate derived values
  const quantitySuppliedPrev = parseFloat(formData.quantity_supplied_previous) || 0;
  const quantityRequested = parseFloat(formData.quantity_requested) || 0;
  const quantityPerContract = parseFloat(formData.quantity_per_contract) || 0;
  const cumulativeQuantity = quantitySuppliedPrev + quantityRequested;
  const remainingQuantity = quantityPerContract - cumulativeQuantity;
  const percentageRequested = quantityPerContract > 0 
    ? ((cumulativeQuantity / quantityPerContract) * 100).toFixed(1) 
    : "0";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.asset_name) {
      toast.error("Vui lòng nhập tên vật tư");
      return;
    }

    try {
      const dataToSave = {
        asset_id: editingAsset?.asset_id || `VT-${Date.now()}`,
        sku: editingAsset?.sku || `SKU-${Date.now()}`,
        asset_name: formData.asset_name,
        brand: formData.brand || null,
        unit: formData.unit || null,
        stock_quantity: parseFloat(formData.stock_quantity) || 0,
        quantity_supplied_previous: parseFloat(formData.quantity_supplied_previous) || 0,
        quantity_requested: parseFloat(formData.quantity_requested) || 0,
        quantity_per_contract: parseFloat(formData.quantity_per_contract) || 0,
        installation_scope: formData.installation_scope || null,
        notes: formData.notes || null,
        asset_type: "materials" as const,
        cost_center: "default",
        created_by: user?.id,
      };

      let error;
      if (editingAsset) {
        const { error: updateError } = await supabase
          .from("asset_master_data")
          .update(dataToSave)
          .eq("id", editingAsset.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("asset_master_data")
          .insert([dataToSave]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(
        editingAsset ? "Cập nhật vật tư thành công" : "Thêm vật tư thành công"
      );
      onClose();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: vi });
  };

  const formatDateTime = (date: string) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: vi });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Đang phân bổ", variant: "default" },
      returned: { label: "Đã hoàn trả", variant: "secondary" },
      overdue: { label: "Quá hạn", variant: "destructive" },
    };
    const s = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingAsset ? "Chỉnh sửa Vật tư" : "Thêm Vật tư mới"}
          </DialogTitle>
          <DialogDescription>
            {editingAsset 
              ? `Mã tài sản: ${editingAsset.asset_id} | Vị trí hiện tại: ${editingAsset.current_location || "Kho"}`
              : "Nhập thông tin vật tư theo mẫu yêu cầu"
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="info" className="text-xs">
              <Package className="h-3 w-3 mr-1" />
              Thông tin
            </TabsTrigger>
            {editingAsset && (
              <>
                <TabsTrigger value="grn" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Nhập kho ({grnItems.length})
                </TabsTrigger>
                <TabsTrigger value="depreciation" className="text-xs">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Khấu hao ({depreciationSchedules.length})
                </TabsTrigger>
                <TabsTrigger value="allocation" className="text-xs">
                  <ArrowLeftRight className="h-3 w-3 mr-1" />
                  Phân bổ ({allocations.length})
                </TabsTrigger>
                <TabsTrigger value="location" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  Vị trí ({locationHistory.length})
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="text-xs">
                  <Wrench className="h-3 w-3 mr-1" />
                  Bảo trì ({maintenanceRecords.length})
                </TabsTrigger>
                <TabsTrigger value="disposal" className="text-xs">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Thanh lý ({disposals.length})
                </TabsTrigger>
                <TabsTrigger value="inventory" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Tồn kho
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Tab Thông tin chính */}
            <TabsContent value="info" className="m-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="asset_name">
                    Tên Vật tư, Quy cách <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="asset_name"
                    value={formData.asset_name}
                    onChange={(e) =>
                      setFormData({ ...formData, asset_name: e.target.value })
                    }
                    placeholder="VD: Nón bảo hộ công nhân-4 điểm neo (Vàng)"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Nhãn hiệu yêu cầu</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) =>
                        setFormData({ ...formData, brand: e.target.value })
                      }
                      placeholder="VD: 3M, Honeywell..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">ĐVT (Đơn vị tính)</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                      placeholder="VD: Cái, Bộ, M..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity">Số lượng tồn kho <span className="text-red-500">*</span></Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.stock_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, stock_quantity: e.target.value })
                      }
                      placeholder="VD: 50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity_supplied_previous">KL đã cấp đến kỳ trước</Label>
                    <Input
                      id="quantity_supplied_previous"
                      type="number"
                      step="0.01"
                      value={formData.quantity_supplied_previous}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity_supplied_previous: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity_requested">KL yêu cầu kỳ này</Label>
                    <Input
                      id="quantity_requested"
                      type="number"
                      step="0.01"
                      value={formData.quantity_requested}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity_requested: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity_per_contract">KL theo HĐ/PL/PS (Khối lượng theo hợp đồng)</Label>
                  <Input
                    id="quantity_per_contract"
                    type="number"
                    step="0.01"
                    value={formData.quantity_per_contract}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity_per_contract: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                {/* Calculated fields - read only */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">KL cộng dồn các kỳ</Label>
                    <div className="font-medium">{cumulativeQuantity}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Khối lượng còn lại</Label>
                    <div className="font-medium">{remainingQuantity}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">% khối lượng yêu cầu</Label>
                    <div className="font-medium">{percentageRequested}%</div>
                  </div>
                </div>

                {/* Asset Master Summary */}
                {editingAsset && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-primary/5 rounded-lg border">
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Giá trị</Label>
                      <div className="font-medium">{formatCurrency(editingAsset.cost_basis)}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Khấu hao lũy kế</Label>
                      <div className="font-medium">{formatCurrency(editingAsset.accumulated_depreciation)}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">NBV</Label>
                      <div className="font-medium">{formatCurrency(editingAsset.nbv)}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Chi phí bảo trì</Label>
                      <div className="font-medium">{formatCurrency(editingAsset.total_maintenance_cost)}</div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="installation_scope">Phạm vi lắp đặt</Label>
                  <Input
                    id="installation_scope"
                    value={formData.installation_scope}
                    onChange={(e) =>
                      setFormData({ ...formData, installation_scope: e.target.value })
                    }
                    placeholder="VD: Tầng 1, Khu A..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="VD: IPC cấp áo lưới..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Hủy
                  </Button>
                  <Button type="submit">
                    {editingAsset ? "Cập nhật" : "Thêm mới"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Tab Phiếu nhập kho */}
            <TabsContent value="grn" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lịch sử nhập kho</CardTitle>
                </CardHeader>
                <CardContent>
                  {grnItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Chưa có phiếu nhập kho</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Số phiếu</TableHead>
                          <TableHead>Ngày nhập</TableHead>
                          <TableHead>Nhà cung cấp</TableHead>
                          <TableHead className="text-right">SL</TableHead>
                          <TableHead className="text-right">Đơn giá</TableHead>
                          <TableHead className="text-right">Thành tiền</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grnItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.goods_receipt_notes?.grn_number}</TableCell>
                            <TableCell>{formatDate(item.goods_receipt_notes?.receipt_date)}</TableCell>
                            <TableCell>{item.goods_receipt_notes?.supplier || "-"}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.total_cost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Khấu hao */}
            <TabsContent value="depreciation" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lịch khấu hao</CardTitle>
                </CardHeader>
                <CardContent>
                  {depreciationSchedules.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Chưa có lịch khấu hao</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kỳ</TableHead>
                          <TableHead className="text-right">Khấu hao kỳ</TableHead>
                          <TableHead className="text-right">Khấu hao lũy kế</TableHead>
                          <TableHead className="text-right">NBV</TableHead>
                          <TableHead>Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {depreciationSchedules.map((schedule) => (
                          <TableRow key={schedule.id}>
                            <TableCell className="font-medium">{formatDate(schedule.period_date)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(schedule.depreciation_amount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(schedule.accumulated_depreciation)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(schedule.nbv)}</TableCell>
                            <TableCell>
                              <Badge variant={schedule.is_processed ? "default" : "secondary"}>
                                {schedule.is_processed ? "Đã xử lý" : "Chờ xử lý"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Phân bổ */}
            <TabsContent value="allocation" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lịch sử phân bổ & hoàn trả</CardTitle>
                </CardHeader>
                <CardContent>
                  {allocations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Chưa có phân bổ</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ngày phân bổ</TableHead>
                          <TableHead>Dự án</TableHead>
                          <TableHead>Mục đích</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Ngày trả dự kiến</TableHead>
                          <TableHead>Ngày trả thực tế</TableHead>
                          <TableHead>Tái sử dụng</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocations.map((alloc) => (
                          <TableRow key={alloc.id}>
                            <TableCell>{formatDateTime(alloc.allocation_date)}</TableCell>
                            <TableCell>{alloc.projects?.name || "-"}</TableCell>
                            <TableCell>{alloc.purpose}</TableCell>
                            <TableCell>{getStatusBadge(alloc.status)}</TableCell>
                            <TableCell>{formatDate(alloc.expected_return_date)}</TableCell>
                            <TableCell>{formatDateTime(alloc.actual_return_date)}</TableCell>
                            <TableCell>{alloc.reusability_percentage ? `${alloc.reusability_percentage}%` : "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Lịch sử vị trí */}
            <TabsContent value="location" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lịch sử di chuyển vị trí</CardTitle>
                </CardHeader>
                <CardContent>
                  {locationHistory.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Chưa có lịch sử vị trí</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Thời gian</TableHead>
                          <TableHead>Vị trí</TableHead>
                          <TableHead>Ghi chú</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {locationHistory.map((loc) => (
                          <TableRow key={loc.id}>
                            <TableCell>{formatDateTime(loc.timestamp)}</TableCell>
                            <TableCell className="font-medium">{loc.location}</TableCell>
                            <TableCell>{loc.notes || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Bảo trì */}
            <TabsContent value="maintenance" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lịch sử bảo trì O&M</CardTitle>
                </CardHeader>
                <CardContent>
                  {maintenanceRecords.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Chưa có bản ghi bảo trì</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ngày</TableHead>
                          <TableHead>Loại bảo trì</TableHead>
                          <TableHead>Mô tả</TableHead>
                          <TableHead>Nhà thầu</TableHead>
                          <TableHead className="text-right">Chi phí</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenanceRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{formatDate(record.maintenance_date)}</TableCell>
                            <TableCell className="font-medium">{record.maintenance_type}</TableCell>
                            <TableCell>{record.description || "-"}</TableCell>
                            <TableCell>{record.vendor || "-"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(record.cost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Thanh lý */}
            <TabsContent value="disposal" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thông tin thanh lý</CardTitle>
                </CardHeader>
                <CardContent>
                  {disposals.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Tài sản chưa được thanh lý</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ngày thanh lý</TableHead>
                          <TableHead>Lý do</TableHead>
                          <TableHead className="text-right">NBV lúc thanh lý</TableHead>
                          <TableHead className="text-right">Giá bán</TableHead>
                          <TableHead className="text-right">Lãi/Lỗ</TableHead>
                          <TableHead>Ghi chú</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disposals.map((disp) => (
                          <TableRow key={disp.id}>
                            <TableCell>{formatDate(disp.disposal_date)}</TableCell>
                            <TableCell>{disp.disposal_reason}</TableCell>
                            <TableCell className="text-right">{formatCurrency(disp.nbv_at_disposal)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(disp.sale_price)}</TableCell>
                            <TableCell className={`text-right ${(disp.gain_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(disp.gain_loss)}
                            </TableCell>
                            <TableCell>{disp.notes || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Tồn kho vật tư */}
            <TabsContent value="inventory" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thông tin tồn kho & phân loại</CardTitle>
                </CardHeader>
                <CardContent>
                  {!inventoryItem ? (
                    <p className="text-muted-foreground text-center py-4">Chưa liên kết với vật tư tồn kho</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Mã sản phẩm</Label>
                          <div className="font-medium">{inventoryItem.product_code}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Tên sản phẩm</Label>
                          <div className="font-medium">{inventoryItem.product_name}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Đơn vị</Label>
                          <div className="font-medium">{inventoryItem.unit}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Số lượng tồn</Label>
                          <div className="font-medium text-lg">{inventoryItem.stock_quantity || 0}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Tồn kho tối thiểu</Label>
                          <div className="font-medium">{inventoryItem.min_stock_level || 0}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Giá bán buôn</Label>
                          <div className="font-medium">{formatCurrency(inventoryItem.wholesale_price)}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Giá bán lẻ</Label>
                          <div className="font-medium">{formatCurrency(inventoryItem.retail_price)}</div>
                        </div>
                      </div>

                      {/* Cảnh báo tồn kho thấp */}
                      {inventoryItem.stock_quantity <= inventoryItem.min_stock_level && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          <span className="text-destructive font-medium">
                            Cảnh báo: Tồn kho thấp hơn mức tối thiểu!
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Phân loại</Label>
                          <div className="font-medium">
                            {inventoryItem.product_categories?.name || "-"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Thương hiệu</Label>
                          <div className="font-medium">
                            {inventoryItem.brands?.name || "-"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Nhóm hàng</Label>
                          <div className="font-medium">
                            {inventoryItem.product_groups?.name || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Loại kinh doanh</Label>
                        <div className="font-medium">
                          {inventoryItem.business_type === 'wholesale' ? 'Bán buôn' :
                           inventoryItem.business_type === 'retail' ? 'Bán lẻ' : 'Cả hai'}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
