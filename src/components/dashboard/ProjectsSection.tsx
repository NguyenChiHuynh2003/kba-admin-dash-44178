import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectDetailDialog } from "@/components/projects/ProjectDetailDialog";
import { ExportButtons } from "@/components/ExportButtons";
import { exportToExcel, exportToPDF, projectExportConfig } from "@/lib/exportUtils";

type ProjectStatus = "planning" | "in_progress" | "completed" | "on_hold";
type ProjectPriority = "low" | "medium" | "high" | "urgent";

interface Project {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  created_at: string;
}

export const ProjectsSection = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    status: "planning" as ProjectStatus,
    priority: "medium" as ProjectPriority,
    start_date: "",
    end_date: "",
    budget: "",
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: projectsWithDetails } = useQuery({
    queryKey: ["projects-with-details"],
    queryFn: async () => {
      const projectIds = projects?.map((p) => p.id) || [];
      
      const [tasksData, membersData] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, project_id, status")
          .in("project_id", projectIds),
        supabase
          .from("team_members")
          .select("*")
          .in("project_id", projectIds),
      ]);

      return {
        tasks: tasksData.data || [],
        members: membersData.data || [],
      };
    },
    enabled: !!projects && projects.length > 0,
  });

  const getProjectStats = (projectId: string) => {
    const tasks = projectsWithDetails?.tasks.filter((t) => t.project_id === projectId) || [];
    const teamMembers = projectsWithDetails?.members.filter((m) => m.project_id === projectId) || [];
    
    const members = teamMembers.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      profiles: {
        full_name: "User",
        avatar_url: null,
      },
    }));
    
    const taskStats = {
      total: tasks.length,
      planning: tasks.filter((t) => t.status === "pending").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      on_hold: 0,
      completed: tasks.filter((t) => t.status === "completed").length,
      at_risk: 0,
      delayed: tasks.filter((t) => t.status === "overdue").length,
    };

    const progress = taskStats.total > 0
      ? Math.round((taskStats.completed / taskStats.total) * 100)
      : 0;

    return { taskStats, members, progress };
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("projects").insert({
        ...data,
        budget: data.budget ? parseFloat(data.budget) : null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Tạo dự án thành công!" });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi tạo dự án",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("projects")
        .update({
          ...data,
          budget: data.budget ? parseFloat(data.budget) : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Cập nhật dự án thành công!" });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi cập nhật dự án",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Xóa dự án thành công!" });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi xóa dự án",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      location: "",
      status: "planning",
      priority: "medium",
      start_date: "",
      end_date: "",
      budget: "",
    });
    setEditingProject(null);
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      location: project.location || "",
      status: project.status,
      priority: project.priority,
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      budget: project.budget?.toString() || "",
    });
    setIsOpen(true);
  };

  const statusLabels: Record<ProjectStatus, string> = {
    planning: "Đang lập kế hoạch",
    in_progress: "Đang thực hiện",
    completed: "Hoàn thành",
    on_hold: "Tạm dừng",
  };

  const handleExportProjects = async (format: "excel" | "pdf") => {
    const options = {
      title: "Báo cáo Dự án",
      filename: "bao_cao_du_an",
      ...projectExportConfig,
      data: projects || [],
    };
    if (format === "excel") {
      exportToExcel(options);
    } else {
      await exportToPDF(options);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Quản lý dự án</h2>
        <div className="flex gap-2">
          <ExportButtons
            onExportExcel={() => handleExportProjects("excel")}
            onExportPDF={() => handleExportProjects("pdf")}
            disabled={isLoading || !projects?.length}
          />
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingProject(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Tạo dự án mới
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? "Sửa dự án" : "Tạo dự án mới"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Tên dự án *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="location">Địa điểm</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Trạng thái</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: ProjectStatus) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Đang lập kế hoạch</SelectItem>
                      <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                      <SelectItem value="on_hold">Tạm dừng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Mức độ ưu tiên</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: ProjectPriority) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Ngày bắt đầu</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Ngày kết thúc</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="budget">Ngân sách (VNĐ)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProject ? "Cập nhật" : "Tạo mới"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Hủy
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : (
        <div className="space-y-4">
          {projects?.map((project) => {
            const { taskStats, members, progress } = getProjectStats(project.id);
            return (
              <ProjectCard
                key={project.id}
                project={project}
                taskStats={taskStats}
                teamMembers={members}
                progress={progress}
                onViewDetails={() => setSelectedProjectId(project.id)}
              />
            );
          })}
        </div>
      )}

      {selectedProjectId && (
        <ProjectDetailDialog
          projectId={selectedProjectId}
          open={!!selectedProjectId}
          onOpenChange={(open) => !open && setSelectedProjectId(null)}
        />
      )}
    </div>
  );
};
