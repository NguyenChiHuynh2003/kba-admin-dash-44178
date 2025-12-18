import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Tables<"contracts">;
  onSuccess?: () => void;
  projects: Array<{ id: string; name: string }>;
}

export function ContractDialog({ open, onOpenChange, contract, onSuccess, projects }: ContractDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    contract_number: contract?.contract_number || "",
    client_name: contract?.client_name || "",
    is_appendix: contract?.is_appendix || false,
    project_id: contract?.project_id || "",
    contract_type: contract?.contract_type || "Thi công",
    contract_value: contract?.contract_value || 0,
    payment_value: contract?.payment_value || 0,
    effective_date: contract?.effective_date || "",
    expiry_date: contract?.expiry_date || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const data = {
        ...formData,
        created_by: user.id,
        project_id: formData.project_id || null,
      };

      if (contract) {
        const { error } = await supabase
          .from("contracts")
          .update(data)
          .eq("id", contract.id);
        
        if (error) throw error;
        toast({ title: "Cập nhật hợp đồng thành công" });
      } else {
        const { error } = await supabase
          .from("contracts")
          .insert([data]);
        
        if (error) throw error;
        toast({ title: "Thêm hợp đồng thành công" });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract ? "Sửa hợp đồng" : "Thêm hợp đồng mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_number">Số hợp đồng *</Label>
              <Input
                id="contract_number"
                value={formData.contract_number}
                onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_name">Chủ đầu tư/Tổng thầu *</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_appendix"
              checked={formData.is_appendix}
              onCheckedChange={(checked) => setFormData({ ...formData, is_appendix: checked as boolean })}
            />
            <Label htmlFor="is_appendix">Là phụ lục hợp đồng</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Dự án</Label>
              <Select value={formData.project_id || "none"} onValueChange={(value) => setFormData({ ...formData, project_id: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn dự án" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không chọn</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract_type">Loại hợp đồng *</Label>
              <Select value={formData.contract_type} onValueChange={(value) => setFormData({ ...formData, contract_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Thi công">Thi công</SelectItem>
                  <SelectItem value="Tư vấn">Tư vấn</SelectItem>
                  <SelectItem value="Cung cấp vật tư">Cung cấp vật tư</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_value">Giá trị hợp đồng *</Label>
              <Input
                id="contract_value"
                type="number"
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_value">Giá trị thanh toán</Label>
              <Input
                id="payment_value"
                type="number"
                value={formData.payment_value}
                onChange={(e) => setFormData({ ...formData, payment_value: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effective_date">Ngày hiệu lực</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Ngày hết hiệu lực</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : contract ? "Cập nhật" : "Thêm mới"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}