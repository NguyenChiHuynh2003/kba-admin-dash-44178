import { useState } from "react";
import { 
  Database, 
  FileText, 
  UserCog, 
  Package, 
  List, 
  Award, 
  Boxes,
  TrendingDown,
  Wrench,
  MapPin,
  Trash2,
  AlertTriangle,
  ArrowLeftRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryList } from "@/components/inventory/InventoryList";
import { CategoriesManager } from "@/components/inventory/CategoriesManager";
import { BrandsManager } from "@/components/inventory/BrandsManager";
import { ProductGroupsManager } from "@/components/inventory/ProductGroupsManager";
import { AssetMasterList } from "@/components/inventory/AssetMasterList";
import { GRNList } from "@/components/inventory/GRNList";
import { AssetAllocationList } from "@/components/inventory/AssetAllocationList";
import { AssetReturnList } from "@/components/inventory/AssetReturnList";
import { DepreciationList } from "@/components/inventory/DepreciationList";
import { MaintenanceList } from "@/components/inventory/MaintenanceList";
import { AssetLocationHistory } from "@/components/inventory/AssetLocationHistory";
import { AssetDisposalList } from "@/components/inventory/AssetDisposalList";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";
import { Badge } from "@/components/ui/badge";

export const InventorySection = () => {
  const [activeTab, setActiveTab] = useState("alerts");

  const menuItems = [
    { id: "alerts", label: "Cảnh báo", icon: AlertTriangle, flow: null, badge: "hot" },
    { id: "assets", label: "Tài sản Master", icon: Database, flow: 1 },
    { id: "grn", label: "Phiếu Nhập Kho", icon: FileText, flow: 1 },
    { id: "depreciation", label: "Khấu hao & NBV", icon: TrendingDown, flow: 1 },
    { id: "allocation", label: "Phân Bổ Tài sản", icon: UserCog, flow: 2 },
    { id: "return", label: "Hoàn Trả Tài sản", icon: ArrowLeftRight, flow: 3 },
    { id: "location", label: "Lịch sử Vị trí", icon: MapPin, flow: 2 },
    { id: "maintenance", label: "Bảo trì O&M", icon: Wrench, flow: 2 },
    { id: "disposal", label: "Thanh lý Tài sản", icon: Trash2, flow: 3 },
    { id: "inventory", label: "Tồn kho Vật tư", icon: Package, flow: null },
    { id: "categories", label: "Phân loại", icon: List, flow: null },
    { id: "brands", label: "Thương hiệu", icon: Award, flow: null },
    { id: "groups", label: "Nhóm hàng", icon: Boxes, flow: null },
  ];

  const getFlowBadge = (flow: number | null) => {
    if (!flow) return null;
    const colors: Record<number, string> = {
      1: "bg-blue-500",
      2: "bg-green-500",
      3: "bg-orange-500",
    };
    return (
      <Badge className={`${colors[flow]} text-[10px] px-1.5 py-0`}>
        L{flow}
      </Badge>
    );
  };

  return (
    <div>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle>Hệ thống RAT - Rosetta Assets Tracker</CardTitle>
          <CardDescription className="space-y-1">
            <span className="block">Quản lý tài sản theo 3 luồng chính:</span>
            <span className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-1">
                <Badge className="bg-blue-500">L1</Badge>
                <span className="text-xs">Nhập Kho & Khấu hao</span>
              </span>
              <span className="flex items-center gap-1">
                <Badge className="bg-green-500">L2</Badge>
                <span className="text-xs">Phân Bổ & Vận hành</span>
              </span>
              <span className="flex items-center gap-1">
                <Badge className="bg-orange-500">L3</Badge>
                <span className="text-xs">Hoàn Trả & Thanh lý</span>
              </span>
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex gap-4">
        <aside className="w-60 space-y-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Danh mục</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "secondary" : "ghost"}
                  className="w-full justify-start mb-1"
                  onClick={() => setActiveTab(item.id)}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge === "hot" && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      !
                    </Badge>
                  )}
                  {getFlowBadge(item.flow)}
                </Button>
              ))}
            </CardContent>
          </Card>
        </aside>

        <div className="flex-1">
          {activeTab === "alerts" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                  <div>
                    <CardTitle>Cảnh báo Hệ thống</CardTitle>
                    <CardDescription>
                      Theo dõi các cảnh báo quan trọng: tồn kho thấp, quá hạn, bảo lãnh
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <LowStockAlerts />
              </CardContent>
            </Card>
          )}

          {activeTab === "assets" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Dữ Liệu Tài Sản Master (Asset Master Data)</CardTitle>
                    <CardDescription>
                      Luồng 1: Tạo và quản lý thông tin gốc của tài sản
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AssetMasterList />
              </CardContent>
            </Card>
          )}

          {activeTab === "grn" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Phiếu Nhập Kho (GRN)</CardTitle>
                    <CardDescription>
                      Luồng 1: Ghi nhận việc nhập tài sản vào kho
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <GRNList />
              </CardContent>
            </Card>
          )}

          {activeTab === "depreciation" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <TrendingDown className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Khấu hao & Giá trị Còn lại (NBV)</CardTitle>
                    <CardDescription>
                      Luồng 1: Lịch khấu hao tự động, báo cáo NBV cuối kỳ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DepreciationList />
              </CardContent>
            </Card>
          )}

          {activeTab === "allocation" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <UserCog className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Phân Bổ Tài Sản</CardTitle>
                    <CardDescription>
                      Luồng 2: Bàn giao tài sản cho nhân viên sử dụng
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AssetAllocationList />
              </CardContent>
            </Card>
          )}

          {activeTab === "return" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <ArrowLeftRight className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Hoàn Trả Tài Sản</CardTitle>
                    <CardDescription>
                      Luồng 3: Quản lý việc hoàn trả tài sản và đánh giá tình trạng
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AssetReturnList />
              </CardContent>
            </Card>
          )}

          {activeTab === "location" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Lịch sử Vị trí Tài sản</CardTitle>
                    <CardDescription>
                      Luồng 2: Tracking thời gian thực với lịch sử vị trí
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AssetLocationHistory />
              </CardContent>
            </Card>
          )}

          {activeTab === "maintenance" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Wrench className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Chi phí Bảo trì O&M</CardTitle>
                    <CardDescription>
                      Luồng 2: Ghi nhận chi phí O&M để tính TCO (Total Cost of Ownership)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <MaintenanceList />
              </CardContent>
            </Card>
          )}

          {activeTab === "disposal" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Trash2 className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Thanh lý Tài sản</CardTitle>
                    <CardDescription>
                      Luồng 3: Quyết định thanh lý/hủy với tính toán lãi/lỗ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AssetDisposalList />
              </CardContent>
            </Card>
          )}

          {activeTab === "inventory" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Quản lý tồn kho Vật tư</CardTitle>
                    <CardDescription>Theo dõi và quản lý vật tư tiêu hao trong kho</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <InventoryList />
              </CardContent>
            </Card>
          )}

          {activeTab === "categories" && <CategoriesManager />}
          {activeTab === "brands" && <BrandsManager />}
          {activeTab === "groups" && <ProductGroupsManager />}
        </div>
      </div>
    </div>
  );
};
