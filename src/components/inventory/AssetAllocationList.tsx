import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Plus, Download, Upload, Users, Package, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AssetAllocationDialog } from "./AssetAllocationDialog";
import { AllocationImportDialog } from "./AllocationImportDialog";
import * as XLSX from "xlsx";

interface AssetAllocation {
  id: string;
  asset_master_id: string;
  allocated_to: string;
  purpose: string;
  allocation_date: string;
  expected_return_date: string | null;
  project_id: string | null;
  status: string;
  asset_master_data: {
    asset_id: string;
    asset_name: string;
  } | null;
  allocated_to_employee?: {
    full_name: string;
    position?: string;
  } | null;
  projects?: {
    name: string;
  } | null;
}

export function AssetAllocationList() {
  const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      
      const { data: allocationsData, error: allocationsError } = await supabase
        .from("asset_allocations")
        .select(`
          *,
          asset_master_data(asset_id, asset_name),
          projects(name)
        `)
        .eq("status", "active")
        .order("allocation_date", { ascending: false });

      if (allocationsError) throw allocationsError;

      const employeeIds = [...new Set((allocationsData || []).map(a => a.allocated_to))];
      
      let employeesMap: Record<string, { full_name: string; position?: string }> = {};
      if (employeeIds.length > 0) {
        const { data: employeesData } = await supabase
          .from("employees")
          .select("id, full_name, position")
          .in("id", employeeIds);
        
        employeesMap = (employeesData || []).reduce((acc, e) => {
          acc[e.id] = { full_name: e.full_name, position: e.position || undefined };
          return acc;
        }, {} as Record<string, { full_name: string; position?: string }>);
      }

      const allocationsWithEmployees = (allocationsData || []).map(allocation => ({
        ...allocation,
        allocated_to_employee: employeesMap[allocation.allocated_to] || null
      }));

      setAllocations(allocationsWithEmployees as any);
    } catch (error: any) {
      toast.error("Lỗi tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  const filteredAllocations = allocations.filter((allocation) => {
    return Object.values(allocation).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Count statistics
  const uniqueAssets = new Set(allocations.map(a => a.asset_master_id)).size;
  const uniqueEmployees = new Set(allocations.map(a => a.allocated_to)).size;
  const uniqueProjects = new Set(allocations.filter(a => a.project_id).map(a => a.project_id)).size;

  const exportToExcel = () => {
    const exportData = filteredAllocations.map((allocation) => ({
      "Mã Tài sản": allocation.asset_master_data?.asset_id || "",
      "Tên Tài sản": allocation.asset_master_data?.asset_name || "",
      "Người sử dụng": allocation.allocated_to_employee?.full_name || "",
      "Mục đích": allocation.purpose,
      "Dự án": allocation.projects?.name || "",
      "Ngày phân bổ": format(new Date(allocation.allocation_date), "dd/MM/yyyy"),
      "Hạn hoàn trả": allocation.expected_return_date
        ? format(new Date(allocation.expected_return_date), "dd/MM/yyyy")
        : "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Phân bổ tài sản");
    
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, `Phan_bo_tai_san_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("Xuất file Excel thành công!");
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    fetchAllocations();
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    fetchAllocations();
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{allocations.length}</p>
                <p className="text-xs text-muted-foreground">Đang phân bổ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueAssets}</p>
                <p className="text-xs text-muted-foreground">Tài sản</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueEmployees}</p>
                <p className="text-xs text-muted-foreground">Nhân viên</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueProjects}</p>
                <p className="text-xs text-muted-foreground">Dự án</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <Input
            placeholder="Tìm kiếm phân bổ tài sản..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            disabled={filteredAllocations.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
          <Button
            onClick={() => setImportDialogOpen(true)}
            variant="outline"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Nhập Excel
          </Button>
          <Button
            onClick={fetchAllocations}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Phân Bổ Tài sản
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã Tài sản</TableHead>
              <TableHead>Tên Tài sản</TableHead>
              <TableHead>Người sử dụng</TableHead>
              <TableHead>Mục đích</TableHead>
              <TableHead>Dự án</TableHead>
              <TableHead>Ngày phân bổ</TableHead>
              <TableHead>Hạn hoàn trả</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredAllocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Chưa có dữ liệu phân bổ
                </TableCell>
              </TableRow>
            ) : (
              filteredAllocations.map((allocation) => (
                <TableRow key={allocation.id}>
                  <TableCell className="font-medium">
                    {allocation.asset_master_data?.asset_id}
                  </TableCell>
                  <TableCell>{allocation.asset_master_data?.asset_name}</TableCell>
                  <TableCell>{allocation.allocated_to_employee?.full_name || "-"}</TableCell>
                  <TableCell>{allocation.purpose}</TableCell>
                  <TableCell>{allocation.projects?.name || "-"}</TableCell>
                  <TableCell>
                    {format(new Date(allocation.allocation_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {allocation.expected_return_date
                      ? format(new Date(allocation.expected_return_date), "dd/MM/yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-500">Đang sử dụng</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AssetAllocationDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        isReturn={false}
      />

      <AllocationImportDialog
        open={importDialogOpen}
        onClose={handleCloseImportDialog}
      />
    </div>
  );
}
