import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

interface GuaranteeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guarantee?: Tables<"contract_guarantees">;
  onSuccess?: () => void;
  contracts: Array<{ id: string; contract_number: string; client_name: string }>;
  defaultType?: string;
}

export function GuaranteeDialog({ 
  open, 
  onOpenChange, 
  guarantee, 
  onSuccess, 
  contracts,
  defaultType 
}: GuaranteeDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    contract_id: guarantee?.contract_id || "",
    guarantee_type: guarantee?.guarantee_type || defaultType || "Bảo lãnh hợp đồng",
    guarantee_number: guarantee?.guarantee_number || "",
    guarantee_value: guarantee?.guarantee_value || 0,
    issuing_bank: guarantee?.issuing_bank || "",
    issue_date: guarantee?.issue_date || "",
    expiry_date: guarantee?.expiry_date || "",
    notes: guarantee?.notes || "",
  });

  useEffect(() => {
    if (guarantee) {
      setFormData({
        contract_id: guarantee.contract_id,
        guarantee_type: guarantee.guarantee_type,
        guarantee_number: guarantee.guarantee_number || "",
        guarantee_value: guarantee.guarantee_value,
        issuing_bank: guarantee.issuing_bank || "",
        issue_date: guarantee.issue_date || "",
        expiry_date: guarantee.expiry_date || "",
        notes: guarantee.notes || "",
      });
    } else if (defaultType) {
      setFormData(prev => ({ ...prev, guarantee_type: defaultType }));
    }
  }, [guarantee, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        guarantee_value: Number(formData.guarantee_value),
        issue_date: formData.issue_date || null,
        expiry_date: formData.expiry_date || null,
      };

      if (guarantee) {
        const { error } = await supabase
          .from("contract_guarantees")
          .update(data)
          .eq("id", guarantee.id);
        
        if (error) throw error;
        toast({ title: "Cập nhật bảo lãnh thành công" });
      } else {
        const { error } = await supabase
          .from("contract_guarantees")
          .insert([data]);
        
        if (error) throw error;
        toast({ title: "Thêm bảo lãnh thành công" });
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
          <DialogTitle>{guarantee ? "Sửa bảo lãnh" : "Thêm bảo lãnh mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_id">Hợp đồng *</Label>
              <Select 
                value={formData.contract_id} 
                onValueChange={(value) => setFormData({ ...formData, contract_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn hợp đồng" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.contract_number} - {contract.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guarantee_type">Loại bảo lãnh *</Label>
              <Select 
                value={formData.guarantee_type} 
                onValueChange={(value) => setFormData({ ...formData, guarantee_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bảo lãnh hợp đồng">Bảo lãnh hợp đồng</SelectItem>
                  <SelectItem value="Bảo lãnh tạm ứng">Bảo lãnh tạm ứng</SelectItem>
                  <SelectItem value="Bảo lãnh bảo hành">Bảo lãnh bảo hành</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guarantee_number">Số bảo lãnh</Label>
              <Input
                id="guarantee_number"
                value={formData.guarantee_number}
                onChange={(e) => setFormData({ ...formData, guarantee_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guarantee_value">Giá trị bảo lãnh *</Label>
              <Input
                id="guarantee_value"
                type="number"
                value={formData.guarantee_value}
                onChange={(e) => setFormData({ ...formData, guarantee_value: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuing_bank">Ngân hàng phát hành</Label>
            <Input
              id="issuing_bank"
              value={formData.issuing_bank}
              onChange={(e) => setFormData({ ...formData, issuing_bank: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Ngày phát hành</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Ngày hết hạn</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : guarantee ? "Cập nhật" : "Thêm mới"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
