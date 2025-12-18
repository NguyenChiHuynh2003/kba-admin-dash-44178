import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, ArrowLeft, Download, Upload, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AssetAllocationDialog } from "./AssetAllocationDialog";
import { ReturnImportDialog } from "./ReturnImportDialog";
import * as XLSX from "xlsx";

interface AssetAllocation {
  id: string;
  asset_master_id: string;
  allocated_to: string;
  purpose: string;
  allocation_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: string;
  return_condition: string | null;
  reusability_percentage: number | null;
  asset_master_data: {
    asset_id: string;
    asset_name: string;
  } | null;
  allocated_to_employee?: {
    full_name: string;
    position?: string;
  } | null;
}

export function AssetReturnList() {
  const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<AssetAllocation | null>(null);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      
      const { data: allocationsData, error: allocationsError } = await supabase
        .from("asset_allocations")
        .select(`
          *,
          asset_master_data(asset_id, asset_name)
        `)
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
    const matchesSearch = Object.values(allocation).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesStatus = statusFilter === "all" || allocation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Count statistics
  const countByStatus = {
    active: allocations.filter(a => a.status === "active").length,
    returned: allocations.filter(a => a.status === "returned").length,
    overdue: allocations.filter(a => a.status === "overdue").length,
  };

  const exportToExcel = () => {
    const exportData = filteredAllocations.map((allocation) => ({
      "Mã Tài sản": allocation.asset_master_data?.asset_id || "",
      "Tên Tài sản": allocation.asset_master_data?.asset_name || "",
      "Người sử dụng": allocation.allocated_to_employee?.full_name || "",
      "Mục đích": allocation.purpose,
      "Ngày phân bổ": format(new Date(allocation.allocation_date), "dd/MM/yyyy"),
      "Hạn hoàn trả": allocation.expected_return_date
        ? format(new Date(allocation.expected_return_date), "dd/MM/yyyy")
        : "",
      "Ngày hoàn trả thực tế": allocation.actual_return_date
        ? format(new Date(allocation.actual_return_date), "dd/MM/yyyy")
        : "",
      "Trạng thái": getStatusLabel(allocation.status),
      "Tình trạng hoàn trả": allocation.return_condition || "",
      "% Tái sử dụng": allocation.reusability_percentage ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hoàn trả tài sản");
    
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, `Hoan_tra_tai_san_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("Xuất file Excel thành công!");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-500",
      returned: "bg-blue-500",
      overdue: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Đang sử dụng",
      returned: "Đã hoàn trả",
      overdue: "Quá hạn",
    };
    return labels[status] || status;
  };

  const handleReturn = (allocation: AssetAllocation) => {
    setSelectedAllocation(allocation);
    setReturnDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setReturnDialogOpen(false);
    setSelectedAllocation(null);
    fetchAllocations();
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    fetchAllocations();
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{countByStatus.active}</p>
                <p className="text-xs text-muted-foreground">Đang sử dụng</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{countByStatus.returned}</p>
                <p className="text-xs text-muted-foreground">Đã hoàn trả</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{countByStatus.overdue}</p>
                <p className="text-xs text-muted-foreground">Quá hạn</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <Input
            placeholder="Tìm kiếm tài sản cần hoàn trả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="active">Đang sử dụng</SelectItem>
              <SelectItem value="returned">Đã hoàn trả</SelectItem>
              <SelectItem value="overdue">Quá hạn</SelectItem>
            </SelectContent>
          </Select>
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
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã Tài sản</TableHead>
              <TableHead>Tên Tài sản</TableHead>
              <TableHead>Người sử dụng</TableHead>
              <TableHead>Ngày phân bổ</TableHead>
              <TableHead>Hạn hoàn trả</TableHead>
              <TableHead>Ngày hoàn trả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Tình trạng</TableHead>
              <TableHead>% Tái sử dụng</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredAllocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Chưa có dữ liệu
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
                  <TableCell>
                    {format(new Date(allocation.allocation_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {allocation.expected_return_date
                      ? format(new Date(allocation.expected_return_date), "dd/MM/yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {allocation.actual_return_date
                      ? format(new Date(allocation.actual_return_date), "dd/MM/yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(allocation.status)}>
                      {getStatusLabel(allocation.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{allocation.return_condition || "-"}</TableCell>
                  <TableCell>
                    {allocation.reusability_percentage != null 
                      ? `${allocation.reusability_percentage}%` 
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {allocation.status === "active" || allocation.status === "overdue" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReturn(allocation)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Hoàn trả
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AssetAllocationDialog
        open={returnDialogOpen}
        onClose={handleCloseDialog}
        isReturn={true}
        allocation={selectedAllocation}
      />

      <ReturnImportDialog
        open={importDialogOpen}
        onClose={handleCloseImportDialog}
      />
    </div>
  );
}
