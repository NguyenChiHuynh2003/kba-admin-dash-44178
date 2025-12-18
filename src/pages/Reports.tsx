import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useNavigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ExportButtons } from "@/components/ExportButtons";
import {
  exportToExcel,
  exportToPDF,
  projectExportConfig,
  employeeExportConfig,
  transactionExportConfig,
  inventoryExportConfig,
  contractExportConfig,
  assetExportConfig,
} from "@/lib/exportUtils";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Reports() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [projectStats, setProjectStats] = useState<any[]>([]);
  const [accountingData, setAccountingData] = useState<any[]>([]);
  const [employeeStats, setEmployeeStats] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    profit: 0,
  });

  // Raw data for export
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const [rawEmployees, setRawEmployees] = useState<any[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [rawInventory, setRawInventory] = useState<any[]>([]);
  const [rawContracts, setRawContracts] = useState<any[]>([]);
  const [rawAssets, setRawAssets] = useState<any[]>([]);

  const handleSectionChange = (section: string) => {
    if (section !== "reports") {
      navigate("/dashboard");
    }
    setActiveSection(section);
  };

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchProjectStats(),
      fetchAccountingData(),
      fetchEmployeeStats(),
      fetchInventoryStats(),
    ]);
    setLoading(false);
  };

  const fetchProjectStats = async () => {
    try {
      const { data: projects } = await supabase
        .from("projects")
        .select("*");

      if (!projects) return;

      setRawProjects(projects);

      const statusCounts = projects.reduce((acc: any, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(statusCounts).map(([status, count]) => ({
        name: status === "planning" ? "Lên kế hoạch" :
              status === "in_progress" ? "Đang thực hiện" :
              status === "on_hold" ? "Tạm dừng" :
              status === "completed" ? "Hoàn thành" : "Đã hủy",
        value: count,
      }));

      setProjectStats(chartData);
    } catch (error) {
      console.error("Error fetching project stats:", error);
    }
  };

  const fetchAccountingData = async () => {
    try {
      const now = new Date();
      let startDate: Date;

      if (timeRange === "week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      const { data: transactions } = await supabase
        .from("accounting_transactions")
        .select("*")
        .gte("transaction_date", startDate.toISOString().split("T")[0]);

      // Fetch contracts and assets for export
      const { data: contracts } = await supabase.from("contracts").select("*");
      const { data: assets } = await supabase.from("asset_master_data").select("*");
      
      if (contracts) setRawContracts(contracts);
      if (assets) setRawAssets(assets);

      if (!transactions) return;

      setRawTransactions(transactions);

      const income = transactions
        .filter((t) => t.transaction_type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = transactions
        .filter((t) => t.transaction_type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      setFinancialSummary({
        totalIncome: income,
        totalExpense: expense,
        profit: income - expense,
      });

      // Group by category
      const categoryData = transactions.reduce((acc: any, t) => {
        const key = t.category;
        if (!acc[key]) {
          acc[key] = { name: key, income: 0, expense: 0 };
        }
        if (t.transaction_type === "income") {
          acc[key].income += Number(t.amount);
        } else {
          acc[key].expense += Number(t.amount);
        }
        return acc;
      }, {});

      setAccountingData(Object.values(categoryData));
    } catch (error) {
      console.error("Error fetching accounting data:", error);
    }
  };

  const fetchEmployeeStats = async () => {
    try {
      const { data: employees } = await supabase
        .from("employees")
        .select("*");

      if (!employees) return;

      setRawEmployees(employees);

      const deptCounts = employees.reduce((acc: any, emp) => {
        const dept = emp.department || "Chưa phân loại";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(deptCounts).map(([name, value]) => ({
        name,
        value,
      }));

      setEmployeeStats(chartData);
    } catch (error) {
      console.error("Error fetching employee stats:", error);
    }
  };

  const fetchInventoryStats = async () => {
    try {
      const { data: items } = await supabase
        .from("inventory_items")
        .select("*");

      if (!items) return;

      setRawInventory(items);

      const topItems = items
        .sort((a, b) => Number(b.stock_quantity) - Number(a.stock_quantity))
        .slice(0, 10)
        .map((item) => ({
          name: item.product_name.length > 15 
            ? item.product_name.substring(0, 15) + "..." 
            : item.product_name,
          quantity: Number(item.stock_quantity),
          value: Number(item.stock_quantity) * Number(item.retail_price),
        }));

      setInventoryStats(topItems);
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + " tỷ";
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + " tr";
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(0) + "k";
    }
    return value.toString();
  };

  // Export handlers
  const handleExportProjects = async (format: "excel" | "pdf") => {
    const options = {
      title: "Báo cáo Dự án",
      filename: "bao_cao_du_an",
      ...projectExportConfig,
      data: rawProjects,
      summary: [
        { label: "Tổng số dự án", value: rawProjects.length.toString() },
        { label: "Tổng ngân sách", value: formatCurrency(rawProjects.reduce((s, p) => s + Number(p.budget || 0), 0)) },
      ],
    };
    if (format === "excel") {
      exportToExcel(options);
    } else {
      await exportToPDF(options);
    }
  };

  const handleExportEmployees = async (format: "excel" | "pdf") => {
    const options = {
      title: "Báo cáo Nhân sự",
      filename: "bao_cao_nhan_su",
      ...employeeExportConfig,
      data: rawEmployees,
      summary: [
        { label: "Tổng số nhân viên", value: rawEmployees.length.toString() },
      ],
    };
    if (format === "excel") {
      exportToExcel(options);
    } else {
      await exportToPDF(options);
    }
  };

  const handleExportTransactions = async (format: "excel" | "pdf") => {
    const options = {
      title: "Báo cáo Giao dịch Kế toán",
      filename: "bao_cao_ke_toan",
      ...transactionExportConfig,
      data: rawTransactions,
      summary: [
        { label: "Tổng thu", value: formatCurrency(financialSummary.totalIncome) },
        { label: "Tổng chi", value: formatCurrency(financialSummary.totalExpense) },
        { label: "Lợi nhuận", value: formatCurrency(financialSummary.profit) },
      ],
    };
    if (format === "excel") {
      exportToExcel(options);
    } else {
      await exportToPDF(options);
    }
  };

  const handleExportContracts = async (format: "excel" | "pdf") => {
    const options = {
      title: "Báo cáo Hợp đồng",
      filename: "bao_cao_hop_dong",
      ...contractExportConfig,
      data: rawContracts,
      summary: [
        { label: "Tổng số hợp đồng", value: rawContracts.length.toString() },
        { label: "Tổng giá trị", value: formatCurrency(rawContracts.reduce((s, c) => s + Number(c.contract_value || 0), 0)) },
      ],
    };
    if (format === "excel") {
      exportToExcel(options);
    } else {
      await exportToPDF(options);
    }
  };

  const handleExportInventory = async (format: "excel" | "pdf") => {
    const options = {
      title: "Báo cáo Tồn kho",
      filename: "bao_cao_ton_kho",
      ...inventoryExportConfig,
      data: rawInventory,
      summary: [
        { label: "Tổng sản phẩm", value: rawInventory.length.toString() },
        { label: "Tổng tồn kho", value: rawInventory.reduce((s, i) => s + Number(i.stock_quantity || 0), 0).toString() },
      ],
    };
    if (format === "excel") {
      exportToExcel(options);
    } else {
      await exportToPDF(options);
    }
  };

  const handleExportAssets = async (format: "excel" | "pdf") => {
    const options = {
      title: "Báo cáo Tài sản",
      filename: "bao_cao_tai_san",
      ...assetExportConfig,
      data: rawAssets,
      summary: [
        { label: "Tổng số tài sản", value: rawAssets.length.toString() },
        { label: "Tổng nguyên giá", value: formatCurrency(rawAssets.reduce((s, a) => s + Number(a.cost_basis || 0), 0)) },
        { label: "Tổng giá trị còn lại", value: formatCurrency(rawAssets.reduce((s, a) => s + Number(a.nbv || 0), 0)) },
      ],
    };
    if (format === "excel") {
      exportToExcel(options);
    } else {
      await exportToPDF(options);
    }
  };

  const handleExportAll = async (format: "excel" | "pdf") => {
    await handleExportProjects(format);
    await handleExportEmployees(format);
    await handleExportTransactions(format);
    await handleExportInventory(format);
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <Sidebar activeSection={activeSection} setActiveSection={handleSectionChange} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader onNavigate={(section) => handleSectionChange(section)} />
          
          <main className="flex-1 p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 overflow-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Báo cáo</h1>
                <p className="text-muted-foreground text-sm sm:text-base">Thống kê và phân tích dữ liệu</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">7 ngày qua</SelectItem>
                    <SelectItem value="month">Tháng này</SelectItem>
                    <SelectItem value="year">Năm nay</SelectItem>
                  </SelectContent>
                </Select>
                <ExportButtons
                  onExportExcel={() => handleExportAll("excel")}
                  onExportPDF={() => handleExportAll("pdf")}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs sm:text-sm font-medium">Tổng thu</CardTitle>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 break-all">
                    <span className="hidden sm:inline">{formatCurrency(financialSummary.totalIncome)}</span>
                    <span className="sm:hidden">{formatCurrencyShort(financialSummary.totalIncome)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs sm:text-sm font-medium">Tổng chi</CardTitle>
                    <DollarSign className="w-4 h-4 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 break-all">
                    <span className="hidden sm:inline">{formatCurrency(financialSummary.totalExpense)}</span>
                    <span className="sm:hidden">{formatCurrencyShort(financialSummary.totalExpense)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs sm:text-sm font-medium">Lợi nhuận</CardTitle>
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className={`text-lg sm:text-xl lg:text-2xl font-bold break-all ${financialSummary.profit >= 0 ? "text-primary" : "text-red-600"}`}>
                    <span className="hidden sm:inline">{formatCurrency(financialSummary.profit)}</span>
                    <span className="sm:hidden">{formatCurrencyShort(financialSummary.profit)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="projects" className="space-y-4">
              <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
                <TabsTrigger value="projects" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Dự án</span>
                  <span className="sm:hidden">DA</span>
                </TabsTrigger>
                <TabsTrigger value="accounting" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Kế toán</span>
                  <span className="sm:hidden">KT</span>
                </TabsTrigger>
                <TabsTrigger value="employees" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Nhân sự</span>
                  <span className="sm:hidden">NS</span>
                </TabsTrigger>
                <TabsTrigger value="inventory" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Tồn kho</span>
                  <span className="sm:hidden">TK</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="projects" className="space-y-4">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Trạng thái dự án</CardTitle>
                        <CardDescription className="text-sm">Phân bố dự án theo trạng thái</CardDescription>
                      </div>
                      <ExportButtons
                        onExportExcel={() => handleExportProjects("excel")}
                        onExportPDF={() => handleExportProjects("pdf")}
                        disabled={loading || rawProjects.length === 0}
                        size="sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
                    {loading ? (
                      <div className="h-60 sm:h-80 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Đang tải...</p>
                      </div>
                    ) : projectStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={projectStats}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {projectStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-60 sm:h-80 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="accounting" className="space-y-4">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Thu chi theo danh mục</CardTitle>
                        <CardDescription className="text-sm">So sánh thu và chi theo từng danh mục</CardDescription>
                      </div>
                      <ExportButtons
                        onExportExcel={() => handleExportTransactions("excel")}
                        onExportPDF={() => handleExportTransactions("pdf")}
                        disabled={loading || rawTransactions.length === 0}
                        size="sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
                    {loading ? (
                      <div className="h-60 sm:h-80 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Đang tải...</p>
                      </div>
                    ) : accountingData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={accountingData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={80} 
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="income" name="Thu" fill="#00C49F" />
                          <Bar dataKey="expense" name="Chi" fill="#FF8042" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-60 sm:h-80 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="employees" className="space-y-4">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Nhân sự theo phòng ban</CardTitle>
                        <CardDescription className="text-sm">Phân bố nhân viên theo từng phòng ban</CardDescription>
                      </div>
                      <ExportButtons
                        onExportExcel={() => handleExportEmployees("excel")}
                        onExportPDF={() => handleExportEmployees("pdf")}
                        disabled={loading || rawEmployees.length === 0}
                        size="sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
                    {loading ? (
                      <div className="h-60 sm:h-80 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Đang tải...</p>
                      </div>
                    ) : employeeStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={employeeStats}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {employeeStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-60 sm:h-80 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Top 10 sản phẩm tồn kho</CardTitle>
                        <CardDescription className="text-sm">Sản phẩm có số lượng tồn nhiều nhất</CardDescription>
                      </div>
                      <ExportButtons
                        onExportExcel={() => handleExportInventory("excel")}
                        onExportPDF={() => handleExportInventory("pdf")}
                        disabled={loading || rawInventory.length === 0}
                        size="sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
                    {loading ? (
                      <div className="h-60 sm:h-80 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Đang tải...</p>
                      </div>
                    ) : inventoryStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={inventoryStats} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="quantity" name="Số lượng" fill="#0088FE" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-60 sm:h-80 flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}