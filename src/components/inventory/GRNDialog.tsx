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

interface GRNDialogProps {
  open: boolean;
  onClose: () => void;
  editingGRN?: any;
}

export function GRNDialog({ open, onClose, editingGRN }: GRNDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    grn_number: "",
    receipt_date: "",
    supplier: "",
    total_value: "",
    notes: "",
  });

  useEffect(() => {
    if (editingGRN) {
      setFormData({
        grn_number: editingGRN.grn_number || "",
        receipt_date: editingGRN.receipt_date || "",
        supplier: editingGRN.supplier || "",
        total_value: editingGRN.total_value?.toString() || "",
        notes: editingGRN.notes || "",
      });
    } else {
      resetForm();
    }
  }, [editingGRN, open]);

  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      grn_number: "",
      receipt_date: today,
      supplier: "",
      total_value: "",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.grn_number) {
      toast.error("Vui lòng nhập số phiếu");
      return;
    }

    try {
      const dataToSave = {
        grn_number: formData.grn_number,
        receipt_date: formData.receipt_date,
        supplier: formData.supplier,
        total_value: parseFloat(formData.total_value) || 0,
        notes: formData.notes,
        created_by: user?.id,
      };

      let error;
      if (editingGRN) {
        const { error: updateError } = await supabase
          .from("goods_receipt_notes")
          .update(dataToSave)
          .eq("id", editingGRN.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("goods_receipt_notes")
          .insert([dataToSave]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(
        editingGRN
          ? "Cập nhật phiếu nhập thành công"
          : "Tạo phiếu nhập thành công"
      );
      onClose();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingGRN ? "Chi tiết Phiếu Nhập Kho" : "Tạo Phiếu Nhập Kho mới"}
          </DialogTitle>
          <DialogDescription>
            Luồng 1: Nhập Tài sản & Kích hoạt (GRN)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grn_number">
              Số Phiếu Nhập <span className="text-red-500">*</span>
            </Label>
            <Input
              id="grn_number"
              value={formData.grn_number}
              onChange={(e) =>
                setFormData({ ...formData, grn_number: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_date">Ngày Nhập</Label>
            <Input
              id="receipt_date"
              type="date"
              value={formData.receipt_date}
              onChange={(e) =>
                setFormData({ ...formData, receipt_date: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Nhà Cung Cấp</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) =>
                setFormData({ ...formData, supplier: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_value">Tổng Giá Trị (₫)</Label>
            <Input
              id="total_value"
              type="number"
              value={formData.total_value}
              onChange={(e) =>
                setFormData({ ...formData, total_value: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi Chú</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            {!editingGRN && (
              <Button type="submit">Tạo Phiếu</Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
