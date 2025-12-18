import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { X, UserPlus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClientRequirementsTab } from "./ClientRequirementsTab";
import { ProjectFollowersTab } from "./ProjectFollowersTab";
import { ProjectItemsTab } from "./ProjectItemsTab";
import { ProjectKPIsTab } from "./ProjectKPIsTab";

interface ProjectDetailDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectDetailDialog = ({
  projectId,
  open,
  onOpenChange,
}: ProjectDetailDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberRole, setMemberRole] = useState("");

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", projectId],
    queryFn: async () => {
      // First get team members
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("project_id", projectId);
      if (membersError) throw membersError;
      
      if (!members || members.length === 0) return [];
      
      // Then get profiles for those members
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      if (profilesError) throw profilesError;
      
      // Combine the data
      return members.map(member => ({
        ...member,
        profiles: profiles?.find(p => p.id === member.user_id) || null
      }));
    },
    enabled: open,
  });

  const { data: allUsers } = useQuery({
    queryKey: ["all-users-combined"],
    queryFn: async () => {
      // Fetch profiles (users with accounts)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");
      if (profilesError) throw profilesError;

      // Fetch employees (including those without accounts)
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("id, full_name, user_id");
      if (employeesError) throw employeesError;

      // Combine: prioritize employees with user_id, then add remaining profiles
      const userMap = new Map<string, { id: string; full_name: string; type: string }>();
      
      // Add employees with user_id first (they can be added as team members)
      employees?.forEach(emp => {
        if (emp.user_id) {
          userMap.set(emp.user_id, { id: emp.user_id, full_name: emp.full_name, type: 'employee' });
        }
      });

      // Add profiles that aren't already in the map
      profiles?.forEach(profile => {
        if (!userMap.has(profile.id)) {
          userMap.set(profile.id, { id: profile.id, full_name: profile.full_name, type: 'profile' });
        }
      });

      return Array.from(userMap.values());
    },
    enabled: open,
  });


  const addMemberMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("team_members").insert({
        project_id: projectId,
        user_id: selectedUserId,
        role: memberRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", projectId] });
      toast({ title: "Đã thêm thành viên vào dự án!" });
      setSelectedUserId("");
      setMemberRole("");
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi thêm thành viên",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", projectId] });
      toast({ title: "Đã xóa thành viên khỏi dự án!" });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi xóa thành viên",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const statusLabels: Record<string, string> = {
    planning: "Kế hoạch",
    in_progress: "Đang thực hiện",
    completed: "Hoàn thành",
    on_hold: "Tạm dừng",
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{project.name}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="members">Thành viên</TabsTrigger>
            <TabsTrigger value="followers">Theo dõi</TabsTrigger>
            <TabsTrigger value="requirements">Yêu cầu CĐT</TabsTrigger>
            <TabsTrigger value="materials">Hạng mục</TabsTrigger>
            <TabsTrigger value="kpi">KPI</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Ngày bắt đầu dự án</Label>
                <div className="font-medium">
                  {project.start_date
                    ? new Date(project.start_date).toLocaleDateString("vi-VN")
                    : "-"}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Ngày kết thúc dự án</Label>
                <div className="font-medium">
                  {project.end_date
                    ? new Date(project.end_date).toLocaleDateString("vi-VN")
                    : "-"}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Ngân sách</Label>
                <div className="font-medium">
                  {project.budget
                    ? new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(project.budget)
                    : "-"}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Trạng thái</Label>
                <div className="font-medium">{statusLabels[project.status]}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Tình trạng</Label>
                <div className="font-medium">Bình thường</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Tiến độ</Label>
                <div className="font-medium">0%</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Số thành viên</Label>
                <div className="font-medium">{teamMembers?.length || 0}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Người tạo</Label>
                <div className="font-medium">-</div>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">Ngày tạo</Label>
                <div className="font-medium">
                  {new Date(project.created_at).toLocaleDateString("vi-VN")}
                </div>
              </div>
            </div>
            {project.description && (
              <div>
                <Label className="text-muted-foreground">Mô tả</Label>
                <div className="mt-2">{project.description}</div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="flex gap-2 p-4 bg-primary/10 rounded-lg">
              <div className="flex-1">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Thêm thành viên" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Vai trò"
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="w-40"
              />
              <Button
                onClick={() => addMemberMutation.mutate()}
                disabled={!selectedUserId || !memberRole}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Thêm
              </Button>
            </div>

            <div className="space-y-2">
              {teamMembers?.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.profiles?.avatar_url || ""} />
                      <AvatarFallback>
                        {member.profiles?.full_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.profiles?.full_name}</div>
                      <div className="text-sm text-muted-foreground">{member.role}</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMemberMutation.mutate(member.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="followers">
            <ProjectFollowersTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="requirements">
            <ClientRequirementsTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <ProjectItemsTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="kpi">
            <ProjectKPIsTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
