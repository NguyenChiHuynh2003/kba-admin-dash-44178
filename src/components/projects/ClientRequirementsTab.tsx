import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ClientRequirement {
  id: string;
  requirement_title: string;
  requirement_description: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  completion_percentage: number;
  created_at: string;
}

interface ClientRequirementsTabProps {
  projectId: string;
}

export const ClientRequirementsTab = ({ projectId }: ClientRequirementsTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    requirement_title: "",
    requirement_description: "",
    priority: "medium",
    status: "pending",
    assigned_to: "",
    due_date: "",
    completion_percentage: 0,
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ["client-requirements", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_requirements")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClientRequirement[];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["all-users-for-selection"],
    queryFn: async () => {
      // Fetch employees
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, full_name, user_id")
        .order("full_name");
      if (empError) throw empError;

      // Fetch profiles (users with accounts)
      const { data: profiles, error: profError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url");
      if (profError) throw profError;

      // Combine: all employees + profiles that aren't already in employees
      const usersMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
      
      // Add all employees (use user_id if available, otherwise employee id)
      employees?.forEach(emp => {
        const userId = emp.user_id || emp.id;
        usersMap.set(userId, { id: userId, full_name: emp.full_name, avatar_url: null });
      });

      // Add profiles that aren't already in the map (or update avatar if exists)
      profiles?.forEach(prof => {
        if (usersMap.has(prof.id)) {
          const existing = usersMap.get(prof.id)!;
          existing.avatar_url = prof.avatar_url;
        } else {
          usersMap.set(prof.id, { id: prof.id, full_name: prof.full_name, avatar_url: prof.avatar_url });
        }
      });

      return Array.from(usersMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("client_requirements").insert({
        ...data,
        project_id: projectId,
        created_by: user.user?.id,
        assigned_to: data.assigned_to || null,
        due_date: data.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-requirements"] });
      toast({ title: "Đã thêm yêu cầu mới" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Lỗi khi thêm yêu cầu", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("client_requirements")
        .update({
          requirement_title: data.requirement_title,
          requirement_description: data.requirement_description,
          priority: data.priority,
          status: data.status,
          assigned_to: data.assigned_to || null,
          due_date: data.due_date || null,
          completion_percentage: data.completion_percentage,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-requirements"] });
      toast({ title: "Đã cập nhật yêu cầu" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Lỗi khi cập nhật", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_requirements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-requirements"] });
      toast({ title: "Đã xóa yêu cầu" });
    },
  });

  const resetForm = () => {
    setFormData({
      requirement_title: "",
      requirement_description: "",
      priority: "medium",
      status: "pending",
      assigned_to: "",
      due_date: "",
      completion_percentage: 0,
    });
    setEditingId(null);
    setOpen(false);
  };

  const handleEdit = (req: ClientRequirement) => {
    setFormData({
      requirement_title: req.requirement_title,
      requirement_description: req.requirement_description || "",
      priority: req.priority,
      status: req.status,
      assigned_to: req.assigned_to || "",
      due_date: req.due_date || "",
      completion_percentage: req.completion_percentage,
    });
    setEditingId(req.id);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ ...formData, id: editingId });
    } else {
      createMutation.mutate(formData);
    }
  };

  const statusLabels: Record<string, string> = {
    pending: "Chờ xử lý",
    in_progress: "Đang xử lý",
    completed: "Hoàn thành",
    cancelled: "Hủy bỏ",
  };

  const priorityLabels: Record<string, string> = {
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
    urgent: "Khẩn cấp",
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Yêu cầu chủ đầu tư</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm yêu cầu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Chỉnh sửa yêu cầu" : "Thêm yêu cầu mới"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tiêu đề yêu cầu</label>
                <Input
                  value={formData.requirement_title}
                  onChange={(e) => setFormData({ ...formData, requirement_title: e.target.value })}
                  placeholder="Nhập tiêu đề yêu cầu"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mô tả chi tiết</label>
                <Textarea
                  value={formData.requirement_description}
                  onChange={(e) => setFormData({ ...formData, requirement_description: e.target.value })}
                  placeholder="Mô tả chi tiết yêu cầu"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Mức độ ưu tiên</label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Thấp</SelectItem>
                      <SelectItem value="medium">Trung bình</SelectItem>
                      <SelectItem value="high">Cao</SelectItem>
                      <SelectItem value="urgent">Khẩn cấp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Trạng thái</label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Chờ xử lý</SelectItem>
                      <SelectItem value="in_progress">Đang xử lý</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                      <SelectItem value="cancelled">Hủy bỏ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Người xử lý</label>
                  <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn người xử lý" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Hạn xử lý</label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Mức độ hoàn thiện (%)</label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.completion_percentage}
                    onChange={(e) => setFormData({ ...formData, completion_percentage: Number(e.target.value) })}
                    className="w-24"
                  />
                  <Progress value={formData.completion_percentage} className="flex-1" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Hủy</Button>
                <Button onClick={handleSubmit}>
                  {editingId ? "Cập nhật" : "Thêm mới"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {requirements.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Chưa có yêu cầu nào</p>
        ) : (
          requirements.map((req) => {
            const assignedUser = users.find((u) => u.id === req.assigned_to);
            return (
              <div key={req.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold">{req.requirement_title}</h4>
                    {req.requirement_description && (
                      <p className="text-sm text-muted-foreground mt-1">{req.requirement_description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(req)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(req.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(req.status)}`}>
                    {statusLabels[req.status]}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(req.priority)}`}>
                    {priorityLabels[req.priority]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {assignedUser && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Người xử lý:</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={assignedUser.avatar_url || ""} />
                          <AvatarFallback>{assignedUser.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <span>{assignedUser.full_name}</span>
                      </div>
                    </div>
                  )}
                  {req.due_date && (
                    <div>
                      <span className="text-muted-foreground">Hạn xử lý: </span>
                      <span>{format(new Date(req.due_date), "dd/MM/yyyy", { locale: vi })}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Mức độ hoàn thiện</span>
                    <span className="font-semibold">{req.completion_percentage}%</span>
                  </div>
                  <Progress value={req.completion_percentage} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
