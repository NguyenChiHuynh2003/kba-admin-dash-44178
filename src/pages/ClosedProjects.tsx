import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectDetailDialog } from "@/components/projects/ProjectDetailDialog";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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

const ClosedProjects = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("closed-projects");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "completed" | "on_hold">("all");

  const handleSectionChange = (section: string) => {
    if (section !== "closed-projects") {
      navigate("/dashboard");
      setTimeout(() => {
        setActiveSection(section);
      }, 0);
    }
  };

  const { data: projects, isLoading } = useQuery({
    queryKey: ["closed-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .in("status", ["completed", "on_hold"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: projectsWithDetails } = useQuery({
    queryKey: ["closed-projects-with-details"],
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

  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || project.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const completedCount = projects?.filter((p) => p.status === "completed").length || 0;
  const onHoldCount = projects?.filter((p) => p.status === "on_hold").length || 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex w-full">
        <Sidebar activeSection={activeSection} setActiveSection={handleSectionChange} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader onNavigate={(section) => handleSectionChange(section)} />
          
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Dự án đóng</h1>
                <p className="text-muted-foreground text-sm sm:text-base">Quản lý các dự án đã hoàn thành và tạm dừng</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm dự án..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">
                    <span className="hidden sm:inline">Tất cả</span>
                    <span className="sm:hidden">Tất cả</span>
                    <span className="ml-1">({projects?.length || 0})</span>
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs sm:text-sm">
                    <span className="hidden sm:inline">Hoàn thành</span>
                    <span className="sm:hidden">HT</span>
                    <span className="ml-1">({completedCount})</span>
                  </TabsTrigger>
                  <TabsTrigger value="on_hold" className="text-xs sm:text-sm">
                    <span className="hidden sm:inline">Tạm dừng</span>
                    <span className="sm:hidden">TD</span>
                    <span className="ml-1">({onHoldCount})</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4 sm:mt-6">
                  {isLoading ? (
                    <div className="text-center py-8 text-sm sm:text-base">Đang tải...</div>
                  ) : filteredProjects && filteredProjects.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {filteredProjects.map((project) => {
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
                  ) : (
                    <div className="text-center py-8 sm:py-12 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground text-sm sm:text-base">Không có dự án nào</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>

      {selectedProjectId && (
        <ProjectDetailDialog
          projectId={selectedProjectId}
          open={!!selectedProjectId}
          onOpenChange={(open) => !open && setSelectedProjectId(null)}
        />
      )}
    </ProtectedRoute>
  );
};

export default ClosedProjects;