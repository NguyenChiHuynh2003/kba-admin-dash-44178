import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GuaranteeDialog } from "./GuaranteeDialog";
import { Tables } from "@/integrations/supabase/types";

interface GuaranteesListProps {
  guaranteeType: string;
}

type GuaranteeWithContract = Tables<"contract_guarantees"> & {
  contracts: {
    contract_number: string;
    client_name: string;
  } | null;
};

export function GuaranteesList({ guaranteeType }: GuaranteesListProps) {
  const { toast } = useToast();
  const [guarantees, setGuarantees] = useState<GuaranteeWithContract[]>([]);
  const [contracts, setContracts] = useState<Array<{ id: string; contract_number: string; client_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuarantee, setEditingGuarantee] = useState<Tables<"contract_guarantees"> | undefined>();

  const fetchGuarantees = async () => {
    try {
      const { data, error } = await supabase
        .from("contract_guarantees")
        .select(`
          *,
          contracts (
            contract_number,
            client_name
          )
        `)
        .eq("guarantee_type", guaranteeType)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGuarantees(data || []);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, contract_number, client_name")
        .order("contract_number");

      if (error) throw error;
      setContracts(data || []);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchGuarantees();
    fetchContracts();
  }, [guaranteeType]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bảo lãnh này?")) return;

    try {
      const { error } = await supabase
        .from("contract_guarantees")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Xóa bảo lãnh thành công" });
      fetchGuarantees();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredGuarantees = guarantees.filter((guarantee) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      guarantee.guarantee_number?.toLowerCase().includes(searchLower) ||
      guarantee.issuing_bank?.toLowerCase().includes(searchLower) ||
      guarantee.contracts?.contract_number.toLowerCase().includes(searchLower) ||
      guarantee.contracts?.client_name.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Tìm kiếm bảo lãnh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => { setEditingGuarantee(undefined); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm bảo lãnh
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>STT</TableHead>
              <TableHead>Số bảo lãnh</TableHead>
              <TableHead>Hợp đồng</TableHead>
              <TableHead>Chủ đầu tư/Tổng thầu</TableHead>
              <TableHead>Ngân hàng</TableHead>
              <TableHead>Giá trị</TableHead>
              <TableHead>Ngày phát hành</TableHead>
              <TableHead>Ngày hết hạn</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">Đang tải...</TableCell>
              </TableRow>
            ) : filteredGuarantees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">Không có dữ liệu</TableCell>
              </TableRow>
            ) : (
              filteredGuarantees.map((guarantee, index) => (
                <TableRow key={guarantee.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{guarantee.guarantee_number || "-"}</TableCell>
                  <TableCell>{guarantee.contracts?.contract_number || "-"}</TableCell>
                  <TableCell>{guarantee.contracts?.client_name || "-"}</TableCell>
                  <TableCell>{guarantee.issuing_bank || "-"}</TableCell>
                  <TableCell>{formatCurrency(guarantee.guarantee_value)}</TableCell>
                  <TableCell>{formatDate(guarantee.issue_date)}</TableCell>
                  <TableCell>{formatDate(guarantee.expiry_date)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingGuarantee(guarantee); setDialogOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(guarantee.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <GuaranteeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        guarantee={editingGuarantee}
        onSuccess={fetchGuarantees}
        contracts={contracts}
        defaultType={guaranteeType}
      />
    </div>
  );
}
