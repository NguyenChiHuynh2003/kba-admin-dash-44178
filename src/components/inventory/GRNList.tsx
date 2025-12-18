import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Plus, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { GRNDialog } from "./GRNDialog";

interface GRN {
  id: string;
  grn_number: string;
  receipt_date: string;
  supplier: string;
  total_value: number;
  notes: string;
}

export function GRNList() {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGRN, setEditingGRN] = useState<GRN | null>(null);

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("goods_receipt_notes")
        .select("*")
        .order("receipt_date", { ascending: false });

      if (error) throw error;
      setGrns(data || []);
    } catch (error: any) {
      toast.error("Lỗi tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGRNs();
  }, []);

  const filteredGRNs = grns.filter((grn) =>
    Object.values(grn).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGRN(null);
    fetchGRNs();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <Input
            placeholder="Tìm kiếm phiếu nhập kho..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchGRNs}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tạo Phiếu Nhập
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số Phiếu</TableHead>
              <TableHead>Ngày Nhập</TableHead>
              <TableHead>Nhà Cung Cấp</TableHead>
              <TableHead className="text-right">Tổng Giá Trị</TableHead>
              <TableHead>Ghi Chú</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredGRNs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Chưa có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              filteredGRNs.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell className="font-medium">{grn.grn_number}</TableCell>
                  <TableCell>
                    {format(new Date(grn.receipt_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>{grn.supplier || "-"}</TableCell>
                  <TableCell className="text-right">
                    {Number(grn.total_value).toLocaleString("vi-VN")} ₫
                  </TableCell>
                  <TableCell>{grn.notes || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingGRN(grn);
                        setDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <GRNDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        editingGRN={editingGRN}
      />
    </div>
  );
}
