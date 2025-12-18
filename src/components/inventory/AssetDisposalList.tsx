import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
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

interface AssetDisposal {
  id: string;
  asset_master_id: string;
  disposal_date: string;
  disposal_reason: string;
  nbv_at_disposal: number;
  sale_price: number;
  gain_loss: number;
  notes: string;
  asset_master_data?: {
    asset_id: string;
    asset_name: string;
    cost_basis: number;
  };
}

export function AssetDisposalList() {
  const { user } = useAuth();
  const [disposals, setDisposals] = useState<AssetDisposal[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [formData, setFormData] = useState({
    asset_master_id: "",
    disposal_date: format(new Date(), "yyyy-MM-dd"),
    disposal_reason: "",
    sale_price: "",
    notes: "",
  });

  const fetchDisposals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("asset_disposals")
        .select(`
          *,
          asset_master_data(asset_id, asset_name, cost_basis)
        `)
        .order("disposal_date", { ascending: false });

      if (error) throw error;
      setDisposals((data as any) || []);
    } catch (error: any) {
      toast.error("Lỗi tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    const { data } = await supabase
      .from("asset_master_data")
      .select("id, asset_id, asset_name, nbv, cost_basis")
      .in("current_status", ["under_maintenance", "ready_for_reallocation", "in_stock"]);
    setAssets(data || []);
  };

  useEffect(() => {
    fetchDisposals();
    fetchAssets();
  }, []);

  const filteredDisposals = disposals.filter((disposal) =>
    disposal.asset_master_data?.asset_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
    disposal.disposal_reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalGainLoss = disposals.reduce(
    (acc, d) => acc + Number(d.gain_loss || 0),
    0
  );
  const totalDisposed = disposals.length;

  const resetForm = () => {
    setFormData({
      asset_master_id: "",
      disposal_date: format(new Date(), "yyyy-MM-dd"),
      disposal_reason: "",
      sale_price: "",
      notes: "",
    });
    setSelectedAsset(null);
  };

  const handleAssetSelect = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    setSelectedAsset(asset);
    setFormData({ ...formData, asset_master_id: assetId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.asset_master_id || !formData.disposal_reason) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    const nbvAtDisposal = Number(selectedAsset?.nbv || 0);
    const salePrice = parseFloat(formData.sale_price) || 0;
    const gainLoss = salePrice - nbvAtDisposal;

    try {
      const { error } = await supabase.from("asset_disposals").insert({
        asset_master_id: formData.asset_master_id,
        disposal_date: formData.disposal_date,
        disposal_reason: formData.disposal_reason,
        nbv_at_disposal: nbvAtDisposal,
        sale_price: salePrice,
        gain_loss: gainLoss,
        notes: formData.notes,
        approved_by: user?.id,
      });

      if (error) throw error;

      // Cập nhật trạng thái tài sản thành 'disposed'
      await supabase
        .from("asset_master_data")
        .update({ current_status: "disposed" })
        .eq("id", formData.asset_master_id);

      toast.success("Thanh lý tài sản thành công");
      setDialogOpen(false);
      resetForm();
      fetchDisposals();
      fetchAssets();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      obsolete: "Lỗi thời",
      damaged: "Hư hỏng",
      sold: "Bán thanh lý",
      donated: "Tặng/Quyên góp",
      lost: "Mất",
      other: "Khác",
    };
    return labels[reason] || reason;
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Tài sản Thanh lý
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDisposed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Lãi/Lỗ Thanh lý
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold flex items-center gap-2 ${
                totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {totalGainLoss >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              {totalGainLoss.toLocaleString("vi-VN")} ₫
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tài sản Sẵn sàng Thanh lý
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{assets.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <Input
            placeholder="Tìm kiếm thanh lý..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDisposals} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Thanh lý Tài sản
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
              <TableHead>Ngày Thanh lý</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead className="text-right">NBV tại TL</TableHead>
              <TableHead className="text-right">Giá bán</TableHead>
              <TableHead className="text-right">Lãi/Lỗ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredDisposals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Chưa có dữ liệu thanh lý
                </TableCell>
              </TableRow>
            ) : (
              filteredDisposals.map((disposal) => (
                <TableRow key={disposal.id}>
                  <TableCell className="font-medium">
                    {disposal.asset_master_data?.asset_id}
                  </TableCell>
                  <TableCell>{disposal.asset_master_data?.asset_name}</TableCell>
                  <TableCell>
                    {format(new Date(disposal.disposal_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getReasonLabel(disposal.disposal_reason)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(disposal.nbv_at_disposal).toLocaleString("vi-VN")} ₫
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(disposal.sale_price).toLocaleString("vi-VN")} ₫
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      Number(disposal.gain_loss) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {Number(disposal.gain_loss) >= 0 ? "+" : ""}
                    {Number(disposal.gain_loss).toLocaleString("vi-VN")} ₫
                  </TableCell>
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
              <Trash2 className="h-5 w-5" />
              Thanh lý Tài sản
            </DialogTitle>
            <DialogDescription>
              Luồng 3: Hoàn Trả & Luân Chuyển Vốn - Quyết định thanh lý
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>
                Tài sản <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.asset_master_id} onValueChange={handleAssetSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tài sản cần thanh lý" />
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

            {selectedAsset && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nguyên giá:</span>
                    <span className="font-medium">
                      {Number(selectedAsset.cost_basis).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Giá trị còn lại (NBV):</span>
                    <span className="font-medium text-green-600">
                      {Number(selectedAsset.nbv || 0).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Lý do Thanh lý <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.disposal_reason}
                  onValueChange={(value) =>
                    setFormData({ ...formData, disposal_reason: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn lý do" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="obsolete">Lỗi thời</SelectItem>
                    <SelectItem value="damaged">Hư hỏng</SelectItem>
                    <SelectItem value="sold">Bán thanh lý</SelectItem>
                    <SelectItem value="donated">Tặng/Quyên góp</SelectItem>
                    <SelectItem value="lost">Mất</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ngày Thanh lý</Label>
                <Input
                  type="date"
                  value={formData.disposal_date}
                  onChange={(e) =>
                    setFormData({ ...formData, disposal_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Giá bán (nếu có)</Label>
              <Input
                type="number"
                value={formData.sale_price}
                onChange={(e) =>
                  setFormData({ ...formData, sale_price: e.target.value })
                }
                placeholder="0"
              />
              {selectedAsset && formData.sale_price && (
                <p
                  className={`text-sm ${
                    parseFloat(formData.sale_price) - Number(selectedAsset.nbv || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  Lãi/Lỗ dự kiến:{" "}
                  {(
                    parseFloat(formData.sale_price) - Number(selectedAsset.nbv || 0)
                  ).toLocaleString("vi-VN")}{" "}
                  ₫
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
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
              <Button type="submit" variant="destructive">
                Xác nhận Thanh lý
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
