import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadRobotoFont, arrayBufferToBase64 } from "./pdfFonts";
interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExportOptions {
  title: string;
  filename: string;
  columns: ExportColumn[];
  data: any[];
  summary?: { label: string; value: string }[];
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const formatDate = (date: string | null): string => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("vi-VN");
};

const formatValue = (value: any, key: string): string => {
  if (value === null || value === undefined) return "";
  
  // Format currency fields
  if (key.includes("price") || key.includes("cost") || key.includes("value") || 
      key.includes("amount") || key.includes("budget") || key.includes("salary")) {
    return formatCurrency(Number(value));
  }
  
  // Format date fields
  if (key.includes("date") || key.includes("_at")) {
    return formatDate(value);
  }
  
  // Format status
  if (key === "status") {
    const statusMap: Record<string, string> = {
      planning: "Lên kế hoạch",
      in_progress: "Đang thực hiện",
      completed: "Hoàn thành",
      on_hold: "Tạm dừng",
      pending: "Chờ xử lý",
      overdue: "Quá hạn",
      active: "Hoạt động",
      inactive: "Không hoạt động",
      in_stock: "Trong kho",
      allocated: "Đã cấp phát",
      under_maintenance: "Bảo trì",
      disposed: "Đã thanh lý",
    };
    return statusMap[value] || value;
  }
  
  return String(value);
};

export const exportToExcel = ({ title, filename, columns, data, summary }: ExportOptions): void => {
  // Prepare data rows
  const rows = data.map((item) =>
    columns.reduce((acc, col) => {
      acc[col.header] = formatValue(item[col.key], col.key);
      return acc;
    }, {} as Record<string, any>)
  );

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  const colWidths = columns.map((col) => ({
    wch: col.width || Math.max(col.header.length, 15),
  }));
  ws["!cols"] = colWidths;

  // Add summary if provided
  if (summary && summary.length > 0) {
    const lastRow = rows.length + 2;
    summary.forEach((item, index) => {
      XLSX.utils.sheet_add_aoa(ws, [[item.label, item.value]], {
        origin: `A${lastRow + index}`,
      });
    });
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));

  // Download
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
};

export const exportToPDF = async ({ title, filename, columns, data, summary }: ExportOptions): Promise<void> => {
  const doc = new jsPDF({
    orientation: columns.length > 5 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  // Load and add Roboto font with Vietnamese support
  try {
    const fonts = await loadRobotoFont();
    const normalBase64 = arrayBufferToBase64(fonts.normal);
    const boldBase64 = arrayBufferToBase64(fonts.bold);
    
    doc.addFileToVFS("Roboto-Regular.ttf", normalBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    
    doc.addFileToVFS("Roboto-Bold.ttf", boldBase64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    
    doc.setFont("Roboto");
  } catch (error) {
    console.warn("Could not load Roboto font, using default font:", error);
    doc.setFont("helvetica");
  }

  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 20);

  // Add date
  doc.setFontSize(10);
  doc.text(`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, 14, 28);

  // Prepare table data
  const headers = columns.map((col) => col.header);
  const tableData = data.map((item) =>
    columns.map((col) => formatValue(item[col.key], col.key))
  );

  // Add table
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 35,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: "Roboto",
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: columns.reduce((acc, col, index) => {
      if (col.key.includes("price") || col.key.includes("cost") || 
          col.key.includes("value") || col.key.includes("amount")) {
        acc[index] = { halign: "right" };
      }
      return acc;
    }, {} as Record<number, any>),
  });

  // Add summary if provided
  if (summary && summary.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    summary.forEach((item, index) => {
      doc.text(`${item.label}: ${item.value}`, 14, finalY + index * 6);
    });
  }

  // Download
  doc.save(`${filename}_${new Date().toISOString().split("T")[0]}.pdf`);
};

// Predefined export configurations for each module
export const projectExportConfig = {
  columns: [
    { header: "Tên dự án", key: "name", width: 30 },
    { header: "Trạng thái", key: "status", width: 15 },
    { header: "Ưu tiên", key: "priority", width: 10 },
    { header: "Ngân sách", key: "budget", width: 20 },
    { header: "Địa điểm", key: "location", width: 25 },
    { header: "Ngày bắt đầu", key: "start_date", width: 15 },
    { header: "Ngày kết thúc", key: "end_date", width: 15 },
  ],
};

export const employeeExportConfig = {
  columns: [
    { header: "Họ tên", key: "full_name", width: 25 },
    { header: "Phòng ban", key: "department", width: 20 },
    { header: "Chức vụ", key: "position", width: 20 },
    { header: "Số điện thoại", key: "phone", width: 15 },
    { header: "Ngày vào làm", key: "date_joined", width: 15 },
    { header: "Ngày sinh", key: "date_of_birth", width: 15 },
    { header: "Chứng chỉ hết hạn", key: "certificate_expiry_date", width: 18 },
  ],
};

export const transactionExportConfig = {
  columns: [
    { header: "Ngày giao dịch", key: "transaction_date", width: 15 },
    { header: "Loại", key: "transaction_type", width: 10 },
    { header: "Danh mục", key: "category", width: 20 },
    { header: "Mô tả", key: "description", width: 30 },
    { header: "Số tiền", key: "amount", width: 20 },
  ],
};

export const inventoryExportConfig = {
  columns: [
    { header: "Mã SP", key: "product_code", width: 15 },
    { header: "Tên sản phẩm", key: "product_name", width: 30 },
    { header: "Đơn vị", key: "unit", width: 10 },
    { header: "Tồn kho", key: "stock_quantity", width: 12 },
    { header: "Tồn tối thiểu", key: "min_stock_level", width: 12 },
    { header: "Giá bán lẻ", key: "retail_price", width: 18 },
    { header: "Giá sỉ", key: "wholesale_price", width: 18 },
  ],
};

export const contractExportConfig = {
  columns: [
    { header: "Số hợp đồng", key: "contract_number", width: 18 },
    { header: "Khách hàng", key: "client_name", width: 25 },
    { header: "Loại HĐ", key: "contract_type", width: 15 },
    { header: "Giá trị HĐ", key: "contract_value", width: 20 },
    { header: "Đã thanh toán", key: "payment_value", width: 20 },
    { header: "Ngày hiệu lực", key: "effective_date", width: 15 },
    { header: "Ngày hết hạn", key: "expiry_date", width: 15 },
    { header: "Trạng thái", key: "status", width: 12 },
  ],
};

export const assetExportConfig = {
  columns: [
    { header: "Mã tài sản", key: "asset_id", width: 15 },
    { header: "Tên tài sản", key: "asset_name", width: 30 },
    { header: "Loại", key: "asset_type", width: 12 },
    { header: "Nguyên giá", key: "cost_basis", width: 18 },
    { header: "Giá trị còn lại", key: "nbv", width: 18 },
    { header: "Trạng thái", key: "current_status", width: 15 },
    { header: "Trung tâm CP", key: "cost_center", width: 15 },
  ],
};

export const taskExportConfig = {
  columns: [
    { header: "Tiêu đề", key: "title", width: 30 },
    { header: "Dự án", key: "project_name", width: 25 },
    { header: "Người thực hiện", key: "assignee_name", width: 20 },
    { header: "Trạng thái", key: "status", width: 15 },
    { header: "Ưu tiên", key: "priority", width: 12 },
    { header: "Ngày đến hạn", key: "due_date", width: 15 },
    { header: "Mô tả", key: "description", width: 35 },
  ],
};
