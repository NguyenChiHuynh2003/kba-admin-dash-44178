import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface AssetAllocationDialogProps {
  open: boolean;
  onClose: () => void;
  isReturn: boolean;
  allocation?: any;
}

export function AssetAllocationDialog({
  open,
  onClose,
  isReturn,
  allocation,
}: AssetAllocationDialogProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    asset_master_id: "",
    allocated_to: "",
    purpose: "",
    project_id: "",
    expected_return_date: "",
    return_condition: "",
    reusability_percentage: "",
    quantity: "1",
  });
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchAssets();
      fetchUsers();
      fetchProjects();
      fetchCurrentEmployee();
    }
  }, [open]);

  // Fetch current user's employee record
  const fetchCurrentEmployee = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    setCurrentEmployeeId(data?.id || null);
  };

  useEffect(() => {
    if (allocation && isReturn) {
      setFormData({
        asset_master_id: allocation.asset_master_id,
        allocated_to: allocation.allocated_to,
        purpose: allocation.purpose,
        project_id: allocation.project_id || "",
        expected_return_date: allocation.expected_return_date || "",
        return_condition: "",
        reusability_percentage: "",
        quantity: allocation.quantity?.toString() || "1",
      });
    } else {
      resetForm();
    }
  }, [allocation, isReturn, open]);

  const fetchAssets = async () => {
    const { data } = await supabase
      .from("asset_master_data")
      .select("id, asset_id, asset_name, current_status, stock_quantity, allocated_quantity, unit")
      .gt("stock_quantity", 0);
    setAssets(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, full_name, position, department")
      .order("full_name");
    setUsers(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, name");
    setProjects(data || []);
  };

  const resetForm = () => {
    setFormData({
      asset_master_id: "",
      allocated_to: "",
      purpose: "",
      project_id: "",
      expected_return_date: "",
      return_condition: "",
      reusability_percentage: "",
      quantity: "1",
    });
    setSelectedAsset(null);
  };

  const handleAssetChange = (assetId: string) => {
    setFormData({ ...formData, asset_master_id: assetId, quantity: "1" });
    const asset = assets.find(a => a.id === assetId);
    setSelectedAsset(asset || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReturn) {
      // Xử lý hoàn trả
      try {
        const returnQty = allocation.quantity || 1;
        
        const { error: updateAllocationError } = await supabase
          .from("asset_allocations")
          .update({
            status: "returned",
            actual_return_date: new Date().toISOString(),
            return_condition: formData.return_condition,
            reusability_percentage: formData.reusability_percentage
              ? parseFloat(formData.reusability_percentage)
              : null,
          })
          .eq("id", allocation.id);

        if (updateAllocationError) throw updateAllocationError;

        // Lấy thông tin tài sản hiện tại
        const { data: currentAsset } = await supabase
          .from("asset_master_data")
          .select("stock_quantity, allocated_quantity")
          .eq("id", allocation.asset_master_id)
          .single();

        // Cập nhật số lượng: cộng lại vào kho, trừ từ đã phân bổ
        const newStockQty = (currentAsset?.stock_quantity || 0) + returnQty;
        const newAllocatedQty = Math.max(0, (currentAsset?.allocated_quantity || 0) - returnQty);
        
        const newStatus =
          parseFloat(formData.reusability_percentage || "100") >= 80
            ? "in_stock"
            : "under_maintenance";

        const { error: updateAssetError } = await supabase
          .from("asset_master_data")
          .update({ 
            current_status: newStatus,
            stock_quantity: newStockQty,
            allocated_quantity: newAllocatedQty
          })
          .eq("id", allocation.asset_master_id);

        if (updateAssetError) throw updateAssetError;

        toast.success(`Hoàn trả ${returnQty} đơn vị thành công`);
        onClose();
      } catch (error: any) {
        toast.error("Lỗi: " + error.message);
      }
    } else {
      // Xử lý phân bổ mới
      if (!formData.asset_master_id || !formData.allocated_to || !formData.purpose) {
        toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
        return;
      }

      if (!currentEmployeeId) {
        toast.error("Không tìm thấy thông tin nhân viên của bạn. Vui lòng liên hệ admin.");
        return;
      }

      const allocationQty = parseFloat(formData.quantity) || 1;
      
      if (!selectedAsset || allocationQty > selectedAsset.stock_quantity) {
        toast.error(`Số lượng phân bổ vượt quá tồn kho (${selectedAsset?.stock_quantity || 0})`);
        return;
      }

      try {
        const { error: insertError } = await supabase
          .from("asset_allocations")
          .insert([
            {
              asset_master_id: formData.asset_master_id,
              allocated_to: formData.allocated_to,
              allocated_by: currentEmployeeId,
              purpose: formData.purpose,
              project_id: formData.project_id || null,
              expected_return_date: formData.expected_return_date || null,
              status: "active",
              quantity: allocationQty,
            },
          ]);

        if (insertError) throw insertError;

        // Cập nhật số lượng tồn kho và đã phân bổ
        const newStockQty = selectedAsset.stock_quantity - allocationQty;
        const newAllocatedQty = (selectedAsset.allocated_quantity || 0) + allocationQty;
        
        const { error: updateError } = await supabase
          .from("asset_master_data")
          .update({ 
            stock_quantity: newStockQty,
            allocated_quantity: newAllocatedQty,
            current_status: newStockQty === 0 ? "allocated" : "in_stock"
          })
          .eq("id", formData.asset_master_id);

        if (updateError) throw updateError;

        toast.success(`Phân bổ ${allocationQty} ${selectedAsset.unit || 'đơn vị'} thành công`);
        onClose();
      } catch (error: any) {
        toast.error("Lỗi: " + error.message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isReturn ? "Hoàn Trả Tài sản" : "Phân Bổ Tài sản"}
          </DialogTitle>
          <DialogDescription>
            {isReturn
              ? "Luồng 3: Hoàn Trả & Luân Chuyển Vốn"
              : "Luồng 2: Phân Bổ, Theo Dõi & Luân Chuyển"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isReturn && (
            <>
              <div className="space-y-2">
                <Label htmlFor="asset_master_id">
                  Tài sản <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.asset_master_id}
                  onValueChange={handleAssetChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tài sản" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.asset_id} - {asset.asset_name} (Tồn: {asset.stock_quantity} {asset.unit || ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAsset && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span>Tồn kho hiện tại:</span>
                    <span className="font-semibold text-green-600">{selectedAsset.stock_quantity} {selectedAsset.unit || 'đơn vị'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đã phân bổ:</span>
                    <span className="font-semibold text-orange-600">{selectedAsset.allocated_quantity || 0} {selectedAsset.unit || 'đơn vị'}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Số lượng phân bổ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedAsset?.stock_quantity || 1}
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  placeholder="Nhập số lượng"
                />
                {selectedAsset && (
                  <p className="text-xs text-muted-foreground">
                    Tối đa: {selectedAsset.stock_quantity} {selectedAsset.unit || 'đơn vị'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="allocated_to">
                  Người sử dụng <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.allocated_to}
                  onValueChange={(value) =>
                    setFormData({ ...formData, allocated_to: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn người sử dụng" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} {emp.position && `- ${emp.position}`} {emp.department && `(${emp.department})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">
                  Mục đích sử dụng <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData({ ...formData, purpose: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_id">Dự án (nếu có)</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, project_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dự án" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_return_date">Hạn hoàn trả dự kiến</Label>
                <Input
                  id="expected_return_date"
                  type="date"
                  value={formData.expected_return_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expected_return_date: e.target.value,
                    })
                  }
                />
              </div>
            </>
          )}

          {isReturn && (
            <>
              <div className="space-y-2">
                <Label htmlFor="return_condition">Tình trạng khi hoàn trả</Label>
                <Textarea
                  id="return_condition"
                  value={formData.return_condition}
                  onChange={(e) =>
                    setFormData({ ...formData, return_condition: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reusability_percentage">
                  Phần trăm Tái Sử dụng (%)
                </Label>
                <Input
                  id="reusability_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.reusability_percentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reusability_percentage: e.target.value,
                    })
                  }
                  placeholder="0-100"
                />
                <p className="text-sm text-muted-foreground">
                  Từ 80% trở lên: Sẵn sàng tái phân bổ. Dưới 80%: Cần bảo trì.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit">
              {isReturn ? "Xác nhận Hoàn trả" : "Phân Bổ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
