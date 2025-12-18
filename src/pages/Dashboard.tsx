import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProjectsSection } from "@/components/dashboard/ProjectsSection";
import { AdminUsers } from "@/components/dashboard/AdminUsers";
import { TasksSection } from "@/components/dashboard/TasksSection";
import { HRSection } from "@/components/dashboard/HRSection";
import { AccountingSection } from "@/components/dashboard/AccountingSection";
import { InventorySection } from "@/components/dashboard/InventorySection";
import { OverviewSection } from "@/components/dashboard/OverviewSection";
import { ProjectDetailDialog } from "@/components/projects/ProjectDetailDialog";

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleSearchNavigate = (section: string, itemId?: string) => {
    setActiveSection(section);
    
    // Open detail dialog directly for projects
    if (section === "projects" && itemId) {
      setSelectedProjectId(itemId);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader onNavigate={handleSearchNavigate} />
          
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
              {activeSection === "projects" ? (
                <ProjectsSection />
              ) : activeSection === "tasks" ? (
                <TasksSection />
              ) : activeSection === "hr" ? (
                <HRSection />
              ) : activeSection === "accounting" ? (
                <AccountingSection />
              ) : activeSection === "inventory" ? (
                <InventorySection />
              ) : activeSection === "admin-users" ? (
                <AdminUsers />
              ) : activeSection === "overview" ? (
                <OverviewSection />
              ) : (
                <Card className="border-border">
                  <CardContent className="pt-6">
                    <div className="text-center py-8 sm:py-12">
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Tính năng đang phát triển</h2>
                      <p className="text-muted-foreground text-sm sm:text-base">Mục này sẽ sớm được ra mắt!</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Project Detail Dialog from search */}
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

export default Dashboard;