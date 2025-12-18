import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Plus, TrendingUp, TrendingDown, Wallet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TransactionDialog } from "@/components/accounting/TransactionDialog";
import { TransactionList } from "@/components/accounting/TransactionList";
import { ContractsSection } from "@/components/accounting/ContractsSection";
import { ExportButtons } from "@/components/ExportButtons";
import { exportToExcel, exportToPDF, transactionExportConfig } from "@/lib/exportUtils";

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: "income" | "expense";
  category: string;
  amount: number;
  description: string | null;
  project_id: string | null;
  projects: { name: string } | null;
}

export const AccountingSection = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    profit: 0,
  });

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("accounting_transactions")
        .select(`
          *,
          projects (
            name
          )
        `)
        .order("transaction_date", { ascending: false });

      if (error) throw error;

      setTransactions((data || []) as Transaction[]);
      calculateStats((data || []) as Transaction[]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Transaction[]) => {
    const income = data
      .filter((t) => t.transaction_type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expense = data
      .filter((t) => t.transaction_type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    setStats({
      totalIncome: income,
      totalExpense: expense,
      profit: income - expense,
    });
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    let filtered = transactions;

    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.transaction_type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.projects?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, filterType, searchTerm]);

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedTransaction(null);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    fetchTransactions();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  };

  const handleExportTransactions = async (format: "excel" | "pdf") => {
    const options = {
      title: "Báo cáo Giao dịch Kế toán",
      filename: "bao_cao_giao_dich",
      ...transactionExportConfig,
      data: filteredTransactions,
      summary: [
        { label: "Tổng thu", value: formatCurrency(stats.totalIncome) },
        { label: "Tổng chi", value: formatCurrency(stats.totalExpense) },
        { label: "Lợi nhuận", value: formatCurrency(stats.profit) },
      ],
    };
    if (format === "excel") {
      exportToExcel(options);
    } else {
      await exportToPDF(options);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-primary" />
          Quản lý kế toán
        </h2>
        <p className="text-muted-foreground">Theo dõi thu chi, báo cáo tài chính và hợp đồng</p>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList>
          <TabsTrigger value="transactions">
            <DollarSign className="w-4 h-4 mr-2" />
            Giao dịch
          </TabsTrigger>
          <TabsTrigger value="contracts">
            <FileText className="w-4 h-4 mr-2" />
            Hợp đồng
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>Giao dịch thu chi</CardTitle>
                  <CardDescription>Theo dõi các giao dịch tài chính</CardDescription>
                </div>
                <div className="flex gap-2">
                  <ExportButtons
                    onExportExcel={() => handleExportTransactions("excel")}
                    onExportPDF={() => handleExportTransactions("pdf")}
                    disabled={loading || filteredTransactions.length === 0}
                  />
                  <Button onClick={handleAddNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm giao dịch
                  </Button>
                </div>
              </div>
            </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Tổng thu</CardTitle>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalIncome)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Tổng chi</CardTitle>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.totalExpense)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Lợi nhuận</CardTitle>
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${stats.profit >= 0 ? "text-primary" : "text-red-600"}`}>
                  {formatCurrency(stats.profit)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Tìm kiếm theo danh mục, mô tả, dự án..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="income">Thu</SelectItem>
                <SelectItem value="expense">Chi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Đang tải...
            </div>
          ) : (
            <TransactionList
              transactions={filteredTransactions}
              onEdit={handleEdit}
              onDelete={handleSuccess}
            />
          )}
          </CardContent>
        </Card>

        <TransactionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          transaction={selectedTransaction}
          onSuccess={handleSuccess}
        />
      </TabsContent>

      <TabsContent value="contracts" className="mt-6">
        <ContractsSection />
      </TabsContent>
    </Tabs>
    </div>
  );
};
