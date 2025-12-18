import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: "income" | "expense";
  category: string;
  amount: number;
  description: string | null;
  project_id: string | null;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSuccess: () => void;
}

const incomeCategories = [
  "Doanh thu dự án",
  "Thanh toán từ khách hàng",
  "Thu nhập khác",
];

const expenseCategories = [
  "Vật liệu xây dựng",
  "Lương nhân viên",
  "Thiết bị",
  "Vận chuyển",
  "Chi phí khác",
];

export const TransactionDialog = ({ open, onOpenChange, transaction, onSuccess }: TransactionDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  
  const [formData, setFormData] = useState({
    transaction_date: "",
    transaction_type: "expense" as "income" | "expense",
    category: "",
    amount: "",
    description: "",
    project_id: "",
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_date: transaction.transaction_date,
        transaction_type: transaction.transaction_type,
        category: transaction.category,
        amount: transaction.amount.toString(),
        description: transaction.description || "",
        project_id: transaction.project_id || "",
      });
    } else {
      setFormData({
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_type: "expense",
        category: "",
        amount: "",
        description: "",
        project_id: "",
      });
    }
  }, [transaction]);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      
      if (data) setProjects(data);
    };
    
    if (open) {
      fetchProjects();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const payload = {
        transaction_date: formData.transaction_date,
        transaction_type: formData.transaction_type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        project_id: formData.project_id || null,
        created_by: user.id,
      };

      if (transaction) {
        const { error } = await supabase
          .from("accounting_transactions")
          .update(payload)
          .eq("id", transaction.id);

        if (error) throw error;

        toast({
          title: "Thành công",
          description: "Đã cập nhật giao dịch",
        });
      } else {
        const { error } = await supabase
          .from("accounting_transactions")
          .insert(payload);

        if (error) throw error;

        toast({
          title: "Thành công",
          description: "Đã thêm giao dịch mới",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu giao dịch",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = formData.transaction_type === "income" ? incomeCategories : expenseCategories;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{transaction ? "Cập nhật giao dịch" : "Thêm giao dịch mới"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Ngày giao dịch *</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_type">Loại giao dịch *</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value: "income" | "expense") => 
                  setFormData({ ...formData, transaction_type: value, category: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Thu</SelectItem>
                  <SelectItem value="expense">Chi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Danh mục *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Số tiền (đ) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="1000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_id">Dự án (tùy chọn)</Label>
            <Select
              value={formData.project_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, project_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn dự án" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không liên kết</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : transaction ? "Cập nhật" : "Thêm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};