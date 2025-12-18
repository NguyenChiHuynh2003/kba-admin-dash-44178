import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Plus, Wrench } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface MaintenanceRecord {
  id: string;
  asset_master_id: string;
  maintenance_type: string;
  maintenance_date: string;
  description: string;
  cost: number;
  vendor: string;
  performed_by: string;
  asset_master_data?: {
    asset_id: string;
    asset_name: string;
  };
}

export function MaintenanceList() {
  const { user } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [formData, setFormData] = useState({
    asset_master_id: "",
    maintenance_type: "",
    maintenance_date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    cost: "",
    vendor: "",
    performed_by: "",
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("maintenance_records")
        .select(`
          *,
          asset_master_data(asset_id, asset_name)
        `)
        .order("maintenance_date", { ascending: false });

      if (error) throw error;
      setRecords((data as any) || []);

      // Tính tổng chi phí
      const total = (data || []).reduce((acc, record) => acc + Number(record.cost || 0), 0);
      setTotalCost(total);
    } catch (error: any) {
      toast.error("Lỗi tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    const { data } = await supabase
      .from("asset_master_data")
      .select("id, asset_id, asset_name");
    setAssets(data || []);
  };

  useEffect(() => {
    fetchRecords();
    fetchAssets();
  }, []);

  const filteredRecords = records.filter((record) =>
    record.asset_master_data?.asset_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
    record.maintenance_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      asset_master_id: "",
      maintenance_type: "",
      maintenance_date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      cost: "",
      vendor: "",
      performed_by: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.asset_master_id || !formData.maintenance_type) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      const { error } = await supabase.from("maintenance_records").insert({
        asset_master_id: formData.asset_master_id,
        maintenance_type: formData.maintenance_type,
        maintenance_date: formData.maintenance_date,
        description: formData.description,
        cost: parseFloat(formData.cost) || 0,
        vendor: formData.vendor,
        performed_by: formData.performed_by,
        reported_by: user?.id,
      });

      if (error) throw error;

      // Cập nhật total_maintenance_cost trong asset_master_data
      const { data: asset } = await supabase
        .from("asset_master_data")
        .select("total_maintenance_cost")
        .eq("id", formData.asset_master_id)
        .single();

      const newTotalCost =
        Number(asset?.total_maintenance_cost || 0) + (parseFloat(formData.cost) || 0);

      await supabase
        .from("asset_master_data")
        .update({ total_maintenance_cost: newTotalCost })
        .eq("id", formData.asset_master_id);

      toast.success("Thêm ghi nhận bảo trì thành công");
      setDialogOpen(false);
      resetForm();
      fetchRecords();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      preventive: "Bảo trì định kỳ",
      corrective: "Sửa chữa",
      inspection: "Kiểm tra",
      upgrade: "Nâng cấp",
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      preventive: "bg-blue-500",
      corrective: "bg-red-500",
      inspection: "bg-yellow-500",
      upgrade: "bg-green-500",
    };
    return colors[type] || "bg-gray-500";
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Ghi nhận
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Chi phí O&M
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalCost.toLocaleString("vi-VN")} ₫
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chi phí TB/Tài sản
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {assets.length > 0
                ? Math.round(totalCost / assets.length).toLocaleString("vi-VN")
                : 0}{" "}
              ₫
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <Input
            placeholder="Tìm kiếm bảo trì..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchRecords} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Thêm Ghi nhận
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã Tài sản</TableHead>
              <TableHead>Tên Tài sản</TableHead>
              <TableHead>Loại Bảo trì</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead className="text-right">Chi phí</TableHead>
              <TableHead>Nhà cung cấp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Chưa có dữ liệu bảo trì
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.asset_master_data?.asset_id}
                  </TableCell>
                  <TableCell>{record.asset_master_data?.asset_name}</TableCell>
                  <TableCell>
                    <Badge className={getTypeBadgeColor(record.maintenance_type)}>
                      {getTypeLabel(record.maintenance_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(record.maintenance_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {record.description || "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(record.cost).toLocaleString("vi-VN")} ₫
                  </TableCell>
                  <TableCell>{record.vendor || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Thêm Ghi nhận Bảo trì
            </DialogTitle>
            <DialogDescription>
              Ghi nhận chi phí O&M để tính TCO (Total Cost of Ownership)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>
                Tài sản <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.asset_master_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, asset_master_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tài sản" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.asset_id} - {asset.asset_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Loại Bảo trì <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.maintenance_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, maintenance_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Bảo trì định kỳ</SelectItem>
                    <SelectItem value="corrective">Sửa chữa</SelectItem>
                    <SelectItem value="inspection">Kiểm tra</SelectItem>
                    <SelectItem value="upgrade">Nâng cấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ngày thực hiện</Label>
                <Input
                  type="date"
                  value={formData.maintenance_date}
                  onChange={(e) =>
                    setFormData({ ...formData, maintenance_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mô tả công việc</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chi phí (VNĐ)</Label>
                <Input
                  type="number"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Nhà cung cấp/Đơn vị thực hiện</Label>
                <Input
                  value={formData.vendor}
                  onChange={(e) =>
                    setFormData({ ...formData, vendor: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Người thực hiện</Label>
              <Input
                value={formData.performed_by}
                onChange={(e) =>
                  setFormData({ ...formData, performed_by: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                Hủy
              </Button>
              <Button type="submit">Lưu</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
