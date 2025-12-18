import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";

interface ProjectItemsTabProps {
  projectId: string;
}

interface ProjectItem {
  id: string;
  item_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  status: string;
  completion_percentage: number;
  start_date: string | null;
  end_date: string | null;
}

const statusLabels: Record<string, string> = {
  pending: "Chờ xử lý",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export const ProjectItemsTab = ({ projectId }: ProjectItemsTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    item_name: "",
    description: "",
    quantity: 1,
    unit: "cái",
    unit_price: 0,
    status: "pending",
    completion_percentage: 0,
    start_date: "",
    end_date: "",
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["project-items", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_items")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectItem[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_items").insert({
        project_id: projectId,
        item_name: formData.item_name,
        description: formData.description || null,
        quantity: formData.quantity,
        unit: formData.unit,
        unit_price: formData.unit_price,
        total_price: formData.quantity * formData.unit_price,
        status: formData.status,
        completion_percentage: formData.completion_percentage,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-items", projectId] });
      toast({ title: "Đã thêm hạng mục!" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_items")
        .update({
          item_name: formData.item_name,
          description: formData.description || null,
          quantity: formData.quantity,
          unit: formData.unit,
          unit_price: formData.unit_price,
          total_price: formData.quantity * formData.unit_price,
          status: formData.status,
          completion_percentage: formData.completion_percentage,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-items", projectId] });
      toast({ title: "Đã cập nhật hạng mục!" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-items", projectId] });
      toast({ title: "Đã xóa hạng mục!" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      item_name: "",
      description: "",
      quantity: 1,
      unit: "cái",
      unit_price: 0,
      status: "pending",
      completion_percentage: 0,
      start_date: "",
      end_date: "",
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (item: ProjectItem) => {
    setFormData({
      item_name: item.item_name,
      description: item.description || "",
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      status: item.status,
      completion_percentage: item.completion_percentage,
      start_date: item.start_date || "",
      end_date: item.end_date || "",
    });
    setEditingId(item.id);
    setIsAdding(false);
  };

  const handleSubmit = () => {
    if (!formData.item_name.trim()) {
      toast({ title: "Vui lòng nhập tên hạng mục", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateMutation.mutate(editingId);
    } else {
      createMutation.mutate();
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      {!isAdding && !editingId && (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Thêm hạng mục
        </Button>
      )}

      {(isAdding || editingId) && (
        <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Tên hạng mục *</Label>
              <Input
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                placeholder="Nhập tên hạng mục"
              />
            </div>
            <div className="col-span-2">
              <Label>Mô tả</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả chi tiết"
              />
            </div>
            <div>
              <Label>Số lượng</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Đơn vị</Label>
              <Input
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
            <div>
              <Label>Đơn giá (VND)</Label>
              <Input
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Trạng thái</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tiến độ (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.completion_percentage}
                onChange={(e) =>
                  setFormData({ ...formData, completion_percentage: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Ngày bắt đầu</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Ngày kết thúc</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetForm}>
              <X className="w-4 h-4 mr-2" />
              Hủy
            </Button>
            <Button onClick={handleSubmit}>
              <Check className="w-4 h-4 mr-2" />
              {editingId ? "Cập nhật" : "Thêm"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items && items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{item.item_name}</h4>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">SL:</span> {item.quantity} {item.unit}
                </div>
                <div>
                  <span className="text-muted-foreground">Đơn giá:</span>{" "}
                  {new Intl.NumberFormat("vi-VN").format(item.unit_price)} đ
                </div>
                <div>
                  <span className="text-muted-foreground">Thành tiền:</span>{" "}
                  {new Intl.NumberFormat("vi-VN").format(item.total_price)} đ
                </div>
                <div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      item.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : item.status === "in_progress"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiến độ</span>
                  <span>{item.completion_percentage}%</span>
                </div>
                <Progress value={item.completion_percentage} className="h-2" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">Chưa có hạng mục nào</div>
        )}
      </div>
    </div>
  );
};
