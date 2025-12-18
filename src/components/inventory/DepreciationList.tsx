import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Calculator, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface DepreciationSchedule {
  id: string;
  asset_master_id: string;
  period_date: string;
  depreciation_amount: number;
  accumulated_depreciation: number;
  nbv: number;
  is_processed: boolean;
  asset_master_data?: {
    asset_id: string;
    asset_name: string;
    cost_basis: number;
    depreciation_method: string;
    useful_life_months: number;
  };
}

interface AssetSummary {
  total_assets: number;
  total_cost_basis: number;
  total_accumulated_depreciation: number;
  total_nbv: number;
}

export function DepreciationList() {
  const [schedules, setSchedules] = useState<DepreciationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [summary, setSummary] = useState<AssetSummary>({
    total_assets: 0,
    total_cost_basis: 0,
    total_accumulated_depreciation: 0,
    total_nbv: 0,
  });

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("depreciation_schedules")
        .select(`
          *,
          asset_master_data(asset_id, asset_name, cost_basis, depreciation_method, useful_life_months)
        `)
        .order("period_date", { ascending: false });

      if (error) throw error;
      setSchedules((data as any) || []);
    } catch (error: any) {
      toast.error("Lỗi tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const { data, error } = await supabase
        .from("asset_master_data")
        .select("cost_basis, accumulated_depreciation, nbv");

      if (error) throw error;

      const totals = (data || []).reduce(
        (acc, asset) => ({
          total_assets: acc.total_assets + 1,
          total_cost_basis: acc.total_cost_basis + Number(asset.cost_basis || 0),
          total_accumulated_depreciation:
            acc.total_accumulated_depreciation + Number(asset.accumulated_depreciation || 0),
          total_nbv: acc.total_nbv + Number(asset.nbv || 0),
        }),
        { total_assets: 0, total_cost_basis: 0, total_accumulated_depreciation: 0, total_nbv: 0 }
      );

      setSummary(totals);
    } catch (error: any) {
      console.error("Error fetching summary:", error);
    }
  };

  const generateDepreciation = async () => {
    try {
      // Lấy tất cả tài sản có phương pháp khấu hao
      const { data: assets, error: assetsError } = await supabase
        .from("asset_master_data")
        .select("*")
        .not("depreciation_method", "is", null)
        .not("useful_life_months", "is", null)
        .in("current_status", ["active", "allocated"]);

      if (assetsError) throw assetsError;

      const currentDate = new Date();
      const periodDate = format(currentDate, "yyyy-MM-01"); // Đầu tháng hiện tại

      let generatedCount = 0;

      for (const asset of assets || []) {
        // Kiểm tra xem đã có schedule cho kỳ này chưa
        const { data: existing } = await supabase
          .from("depreciation_schedules")
          .select("id")
          .eq("asset_master_id", asset.id)
          .eq("period_date", periodDate)
          .single();

        if (existing) continue;

        // Tính khấu hao theo phương pháp đường thẳng
        const monthlyDepreciation =
          asset.depreciation_method === "straight_line"
            ? Number(asset.cost_basis) / Number(asset.useful_life_months)
            : 0;

        const newAccumulatedDepreciation =
          Number(asset.accumulated_depreciation || 0) + monthlyDepreciation;
        const newNBV = Number(asset.cost_basis) - newAccumulatedDepreciation;

        // Tạo schedule mới
        const { error: insertError } = await supabase
          .from("depreciation_schedules")
          .insert({
            asset_master_id: asset.id,
            period_date: periodDate,
            depreciation_amount: monthlyDepreciation,
            accumulated_depreciation: newAccumulatedDepreciation,
            nbv: Math.max(0, newNBV),
          });

        if (insertError) throw insertError;

        // Cập nhật asset_master_data
        await supabase
          .from("asset_master_data")
          .update({
            accumulated_depreciation: newAccumulatedDepreciation,
            nbv: Math.max(0, newNBV),
          })
          .eq("id", asset.id);

        generatedCount++;
      }

      toast.success(`Đã tính khấu hao cho ${generatedCount} tài sản`);
      fetchSchedules();
      fetchSummary();
    } catch (error: any) {
      toast.error("Lỗi tính khấu hao: " + error.message);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchSummary();
  }, []);

  const filteredSchedules = schedules.filter((schedule) =>
    schedule.asset_master_data?.asset_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
    schedule.asset_master_data?.asset_id
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      straight_line: "Đường thẳng",
      declining_balance: "Số dư giảm dần",
      units_of_production: "Theo sản lượng",
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng Tài sản
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_assets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nguyên Giá (Cost Basis)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary.total_cost_basis.toLocaleString("vi-VN")} ₫
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Khấu hao Lũy kế
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summary.total_accumulated_depreciation.toLocaleString("vi-VN")} ₫
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Giá trị Còn lại (NBV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.total_nbv.toLocaleString("vi-VN")} ₫
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <Input
            placeholder="Tìm kiếm theo mã hoặc tên tài sản..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchSchedules} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button onClick={generateDepreciation} size="sm">
            <Calculator className="h-4 w-4 mr-2" />
            Tính Khấu hao Tháng này
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã Tài sản</TableHead>
              <TableHead>Tên Tài sản</TableHead>
              <TableHead>Phương pháp</TableHead>
              <TableHead>Kỳ</TableHead>
              <TableHead className="text-right">Khấu hao Kỳ</TableHead>
              <TableHead className="text-right">Khấu hao Lũy kế</TableHead>
              <TableHead className="text-right">NBV</TableHead>
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
            ) : filteredSchedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Chưa có dữ liệu khấu hao
                </TableCell>
              </TableRow>
            ) : (
              filteredSchedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">
                    {schedule.asset_master_data?.asset_id}
                  </TableCell>
                  <TableCell>{schedule.asset_master_data?.asset_name}</TableCell>
                  <TableCell>
                    {getMethodLabel(schedule.asset_master_data?.depreciation_method || "")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(schedule.period_date), "MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(schedule.depreciation_amount).toLocaleString("vi-VN")} ₫
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    {Number(schedule.accumulated_depreciation).toLocaleString("vi-VN")} ₫
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {Number(schedule.nbv).toLocaleString("vi-VN")} ₫
                  </TableCell>
                  <TableCell>
                    <Badge variant={schedule.is_processed ? "default" : "secondary"}>
                      {schedule.is_processed ? "Đã xử lý" : "Chờ xử lý"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
