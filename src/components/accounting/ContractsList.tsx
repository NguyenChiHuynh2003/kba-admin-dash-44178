import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContractDialog } from "./ContractDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ExportButtons } from "@/components/ExportButtons";
import { exportToExcel, exportToPDF, contractExportConfig } from "@/lib/exportUtils";

type Contract = Tables<"contracts"> & {
  projects?: { name: string } | null;
};

interface ContractsListProps {
  filterType?: string;
}

export function ContractsList({ filterType }: ContractsListProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Tables<"contracts"> | undefined>();
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchContracts();
    fetchProjects();
  }, [filterType]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .order("name");
    
    if (data) setProjects(data);
  };

  const fetchContracts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("contracts")
        .select("*, projects(name)")
        .order("created_at", { ascending: false });

      if (filterType === "appendix") {
        query = query.eq("is_appendix", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setContracts(data || []);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa hợp đồng này?")) return;

    try {
      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Xóa hợp đồng thành công" });
      fetchContracts();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (contract: Tables<"contracts">) => {
    setSelectedContract(contract);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedContract(undefined);
    setDialogOpen(true);
  };

  const filteredContracts = contracts.filter((contract) => {
    const searchLower = search.toLowerCase();
    return (
      contract.contract_number.toLowerCase().includes(searchLower) ||
      contract.client_name.toLowerCase().includes(searchLower) ||
      contract.projects?.name?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (contract: Contract) => {
    if (!contract.expiry_date) {
      return <Badge variant="outline">Còn hiệu lực</Badge>;
    }
    const expiryDate = new Date(contract.expiry_date);
    const today = new Date();
    if (expiryDate < today) {
      return <Badge variant="destructive">Hết hiệu lực</Badge>;
    }
    return <Badge variant="outline">Còn hiệu lực</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const handleExportContracts = async (format: "excel" | "pdf") => {
    const options = {
      title: filterType === "appendix" ? "Báo cáo Phụ lục Hợp đồng" : "Báo cáo Hợp đồng",
      filename: filterType === "appendix" ? "bao_cao_phu_luc" : "bao_cao_hop_dong",
      ...contractExportConfig,
      data: filteredContracts,
      summary: [
        { label: "Tổng số hợp đồng", value: filteredContracts.length.toString() },
        { label: "Tổng giá trị", value: formatCurrency(filteredContracts.reduce((s, c) => s + Number(c.contract_value || 0), 0)) + " đ" },
      ],
    };
    if (format === "excel") {
      exportToExcel(options);
    } else {
      await exportToPDF(options);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm hợp đồng"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <ExportButtons
            onExportExcel={() => handleExportContracts("excel")}
            onExportPDF={() => handleExportContracts("pdf")}
            disabled={loading || filteredContracts.length === 0}
          />
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm hợp đồng
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>STT</TableHead>
              <TableHead>Số hợp đồng</TableHead>
              <TableHead>Chủ đầu tư/Tổng thầu</TableHead>
              <TableHead>Là phụ lục</TableHead>
              <TableHead>Dự án</TableHead>
              <TableHead>Loại hợp đồng</TableHead>
              <TableHead>Giá trị hợp đồng</TableHead>
              <TableHead>Giá trị thanh toán</TableHead>
              <TableHead>Ngày hiệu lực</TableHead>
              <TableHead>Ngày hết hiệu lực</TableHead>
              <TableHead>Hiệu lực</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts.map((contract, index) => (
                <TableRow key={contract.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{contract.contract_number}</TableCell>
                  <TableCell>{contract.client_name}</TableCell>
                  <TableCell>{contract.is_appendix ? "✓" : ""}</TableCell>
                  <TableCell>{contract.projects?.name || ""}</TableCell>
                  <TableCell>{contract.contract_type}</TableCell>
                  <TableCell>{formatCurrency(contract.contract_value)}</TableCell>
                  <TableCell>{formatCurrency(contract.payment_value)}</TableCell>
                  <TableCell>
                    {contract.effective_date ? format(new Date(contract.effective_date), "dd/MM/yyyy") : ""}
                  </TableCell>
                  <TableCell>
                    {contract.expiry_date ? format(new Date(contract.expiry_date), "dd/MM/yyyy") : ""}
                  </TableCell>
                  <TableCell>{getStatusBadge(contract)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(contract)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(contract.id)}
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

      <ContractDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contract={selectedContract}
        onSuccess={fetchContracts}
        projects={projects}
      />
    </div>
  );
}