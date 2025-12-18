import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Users } from "lucide-react";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    status: string;
    priority: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
  };
  taskStats: {
    total: number;
    planning: number;
    in_progress: number;
    on_hold: number;
    completed: number;
    at_risk: number;
    delayed: number;
  };
  teamMembers: Array<{
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  }>;
  progress: number;
  onViewDetails: () => void;
}

export const ProjectCard = ({
  project,
  taskStats,
  teamMembers,
  progress,
  onViewDetails,
}: ProjectCardProps) => {
  const getDaysRemaining = () => {
    if (!project.end_date) return 0;
    const end = new Date(project.end_date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: "bg-blue-500",
      in_progress: "bg-green-500",
      on_hold: "bg-yellow-500",
      completed: "bg-emerald-500",
      at_risk: "bg-red-500",
      delayed: "bg-orange-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const statusLabels: Record<string, string> = {
    planning: "Kế hoạch",
    in_progress: "Đang làm",
    on_hold: "Tạm dừng",
    completed: "Hoàn thành",
    at_risk: "Rủi ro",
    delayed: "Chậm tiến độ",
  };

  const priorityLabels: Record<string, string> = {
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
    urgent: "Khẩn cấp",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const daysRemaining = getDaysRemaining();

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onViewDetails}
    >
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Circular Progress Chart */}
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">{daysRemaining}</div>
                  <div className="text-xs text-muted-foreground">ngày</div>
                </div>
              </div>
            </div>
            {/* Status Legend */}
            <div className="mt-3 space-y-1 text-xs">
              {Object.entries(taskStats)
                .filter(([key]) => key !== "total")
                .map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${getStatusColor(key)}`} />
                    <span className="flex-1">{statusLabels[key]}</span>
                    <span className="font-medium">{value}</span>
                    <span className="text-muted-foreground">
                      ({taskStats.total > 0 ? Math.round((value / taskStats.total) * 100) : 0}%)
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Project Details */}
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-xl font-bold mb-2">{project.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className={priorityColors[project.priority] || ""}>
                  {priorityLabels[project.priority] || project.priority}
                </Badge>
                <span>•</span>
                <span>Ngày tạo: {new Date(project.created_at).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Tình trạng</div>
                <Badge className={getStatusColor(project.status)}>
                  {statusLabels[project.status] || project.status}
                </Badge>
              </div>
              <div>
                <div className="text-muted-foreground">Tiến độ kế hoạch</div>
                <div className="font-medium">{progress}%</div>
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Tiến độ thực tế</div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Team Members */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {teamMembers.slice(0, 5).map((member) => (
                  <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                    <AvatarImage src={member.profiles.avatar_url || ""} />
                    <AvatarFallback>
                      {member.profiles.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {teamMembers.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    +{teamMembers.length - 5}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground ml-2">
                <Users className="w-4 h-4" />
                <span>{teamMembers.length} thành viên</span>
                <span className="text-muted-foreground/60">•</span>
                <span>{taskStats.total} công việc</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
