import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Plus, MapPin, History } from "lucide-react";
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
import { format } from "date-fns";

interface LocationHistory {
  id: string;
  asset_master_id: string;
  location: string;
  timestamp: string;
  notes: string;
  asset_master_data?: {
    asset_id: string;
    asset_name: string;
  };
}

export function AssetLocationHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<LocationHistory[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    asset_master_id: "",
    location: "",
    notes: "",
  });

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("asset_location_history")
        .select(`
          *,
          asset_master_data(asset_id, asset_name)
        `)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setHistory((data as any) || []);
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
    fetchHistory();
    fetchAssets();
  }, []);

  const filteredHistory = history.filter(
    (h) =>
      h.asset_master_data?.asset_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      h.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      asset_master_id: "",
      location: "",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.asset_master_id || !formData.location) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      const { error } = await supabase.from("asset_location_history").insert({
        asset_master_id: formData.asset_master_id,
        location: formData.location,
        notes: formData.notes,
        moved_by: user?.id,
      });

      if (error) throw error;

      toast.success("Cập nhật vị trí thành công");
      setDialogOpen(false);
      resetForm();
      fetchHistory();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  // Group history by asset
  const groupedByAsset = filteredHistory.reduce((acc, item) => {
    const assetId = item.asset_master_data?.asset_id || "unknown";
    if (!acc[assetId]) {
      acc[assetId] = [];
    }
    acc[assetId].push(item);
    return acc;
  }, {} as Record<string, LocationHistory[]>);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <Input
            placeholder="Tìm kiếm theo tài sản hoặc vị trí..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchHistory} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Cập nhật Vị trí
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
              <TableHead>Vị trí</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Chưa có lịch sử vị trí
                </TableCell>
              </TableRow>
            ) : (
              filteredHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.asset_master_data?.asset_id}
                  </TableCell>
                  <TableCell>{item.asset_master_data?.asset_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {item.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(item.timestamp), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {item.notes || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Cập nhật Vị trí Tài sản
            </DialogTitle>
            <DialogDescription>
              Theo dõi vị trí thời gian thực của tài sản
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

            <div className="space-y-2">
              <Label>
                Vị trí mới <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="VD: Kho A, Công trình XYZ, Văn phòng..."
              />
            </div>

            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                placeholder="Lý do di chuyển, người chịu trách nhiệm..."
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
