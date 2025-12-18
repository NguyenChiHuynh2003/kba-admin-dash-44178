import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Check, X, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";

interface ProjectKPIsTabProps {
  projectId: string;
}

interface ProjectKPI {
  id: string;
  kpi_name: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string;
  weight: number;
  status: string;
  due_date: string | null;
}

const statusLabels: Record<string, string> = {
  pending: "Chờ xử lý",
  in_progress: "Đang thực hiện",
  achieved: "Đạt mục tiêu",
  not_achieved: "Không đạt",
};

export const ProjectKPIsTab = ({ projectId }: ProjectKPIsTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    kpi_name: "",
    description: "",
    target_value: 100,
    current_value: 0,
    unit: "%",
    weight: 1,
    status: "pending",
    due_date: "",
  });

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["project-kpis", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_kpis")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectKPI[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_kpis").insert({
        project_id: projectId,
        kpi_name: formData.kpi_name,
        description: formData.description || null,
        target_value: formData.target_value,
        current_value: formData.current_value,
        unit: formData.unit,
        weight: formData.weight,
        status: formData.status,
        due_date: formData.due_date || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-kpis", projectId] });
      toast({ title: "Đã thêm KPI!" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_kpis")
        .update({
          kpi_name: formData.kpi_name,
          description: formData.description || null,
          target_value: formData.target_value,
          current_value: formData.current_value,
          unit: formData.unit,
          weight: formData.weight,
          status: formData.status,
          due_date: formData.due_date || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-kpis", projectId] });
      toast({ title: "Đã cập nhật KPI!" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_kpis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-kpis", projectId] });
      toast({ title: "Đã xóa KPI!" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      kpi_name: "",
      description: "",
      target_value: 100,
      current_value: 0,
      unit: "%",
      weight: 1,
      status: "pending",
      due_date: "",
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (kpi: ProjectKPI) => {
    setFormData({
      kpi_name: kpi.kpi_name,
      description: kpi.description || "",
      target_value: kpi.target_value,
      current_value: kpi.current_value,
      unit: kpi.unit,
      weight: kpi.weight,
      status: kpi.status,
      due_date: kpi.due_date || "",
    });
    setEditingId(kpi.id);
    setIsAdding(false);
  };

  const handleSubmit = () => {
    if (!formData.kpi_name.trim()) {
      toast({ title: "Vui lòng nhập tên KPI", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateMutation.mutate(editingId);
    } else {
      createMutation.mutate();
    }
  };

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      {!isAdding && !editingId && (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Thêm KPI
        </Button>
      )}

      {(isAdding || editingId) && (
        <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Tên KPI *</Label>
              <Input
                value={formData.kpi_name}
                onChange={(e) => setFormData({ ...formData, kpi_name: e.target.value })}
                placeholder="Nhập tên KPI"
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
              <Label>Giá trị mục tiêu</Label>
              <Input
                type="number"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Giá trị hiện tại</Label>
              <Input
                type="number"
                value={formData.current_value}
                onChange={(e) => setFormData({ ...formData, current_value: Number(e.target.value) })}
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
              <Label>Trọng số</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
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
              <Label>Ngày đến hạn</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
        {kpis && kpis.length > 0 ? (
          kpis.map((kpi) => {
            const progress = calculateProgress(kpi.current_value, kpi.target_value);
            return (
              <div key={kpi.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="font-medium">{kpi.kpi_name}</h4>
                      {kpi.description && (
                        <p className="text-sm text-muted-foreground">{kpi.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(kpi)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(kpi.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Mục tiêu:</span>{" "}
                    {kpi.target_value} {kpi.unit}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hiện tại:</span>{" "}
                    {kpi.current_value} {kpi.unit}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Trọng số:</span> {kpi.weight}
                  </div>
                  <div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        kpi.status === "achieved"
                          ? "bg-green-100 text-green-800"
                          : kpi.status === "not_achieved"
                          ? "bg-red-100 text-red-800"
                          : kpi.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {statusLabels[kpi.status] || kpi.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tiến độ</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress
                    value={progress}
                    className={`h-2 ${
                      progress >= 100
                        ? "[&>div]:bg-green-500"
                        : progress >= 70
                        ? "[&>div]:bg-blue-500"
                        : progress >= 40
                        ? "[&>div]:bg-yellow-500"
                        : "[&>div]:bg-red-500"
                    }`}
                  />
                </div>

                {kpi.due_date && (
                  <div className="text-sm text-muted-foreground">
                    Đến hạn: {new Date(kpi.due_date).toLocaleDateString("vi-VN")}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">Chưa có KPI nào</div>
        )}
      </div>
    </div>
  );
};
