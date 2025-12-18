import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface InventoryItemDialogProps {
  open: boolean;
  onClose: () => void;
  editingItem?: any;
}

export const InventoryItemDialog = ({ open, onClose, editingItem }: InventoryItemDialogProps) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [productGroups, setProductGroups] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    product_code: "",
    product_name: "",
    unit: "",
    category_id: "",
    brand_id: "",
    product_group_id: "",
    wholesale_price: "0",
    retail_price: "0",
    stock_quantity: "0",
    min_stock_level: "0",
    business_type: "both" as "both" | "wholesale" | "retail",
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchBrands();
      fetchProductGroups();
      
      if (editingItem) {
        setFormData({
          product_code: editingItem.product_code || "",
          product_name: editingItem.product_name || "",
          unit: editingItem.unit || "",
          category_id: editingItem.category_id || "",
          brand_id: editingItem.brand_id || "",
          product_group_id: editingItem.product_group_id || "",
          wholesale_price: editingItem.wholesale_price?.toString() || "0",
          retail_price: editingItem.retail_price?.toString() || "0",
          stock_quantity: editingItem.stock_quantity?.toString() || "0",
          min_stock_level: editingItem.min_stock_level?.toString() || "0",
          business_type: (editingItem.business_type || "both") as "both" | "wholesale" | "retail",
        });
      }
    } else {
      resetForm();
    }
  }, [open, editingItem]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("product_categories").select("*").order("name");
    setCategories(data || []);
  };

  const fetchBrands = async () => {
    const { data } = await supabase.from("brands").select("*").order("name");
    setBrands(data || []);
  };

  const fetchProductGroups = async () => {
    const { data } = await supabase.from("product_groups").select("*").order("name");
    setProductGroups(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const itemData = {
        product_code: formData.product_code,
        product_name: formData.product_name,
        unit: formData.unit,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        product_group_id: formData.product_group_id || null,
        wholesale_price: parseFloat(formData.wholesale_price),
        retail_price: parseFloat(formData.retail_price),
        stock_quantity: parseFloat(formData.stock_quantity),
        min_stock_level: parseFloat(formData.min_stock_level),
        business_type: formData.business_type,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("inventory_items")
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;

        toast({
          title: "Thành công",
          description: "Cập nhật hàng hóa thành công",
        });
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .insert([itemData]);

        if (error) throw error;

        toast({
          title: "Thành công",
          description: "Thêm hàng hóa mới thành công",
        });
      }

      onClose();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      product_code: "",
      product_name: "",
      unit: "",
      category_id: "",
      brand_id: "",
      product_group_id: "",
      wholesale_price: "0",
      retail_price: "0",
      stock_quantity: "0",
      min_stock_level: "0",
      business_type: "both" as "both" | "wholesale" | "retail",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Chỉnh sửa hàng hóa" : "Thêm hàng hóa mới"}</DialogTitle>
          <DialogDescription>
            {editingItem ? "Cập nhật thông tin hàng hóa" : "Nhập thông tin để thêm hàng hóa mới"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product_code">Mã hàng hóa *</Label>
              <Input
                id="product_code"
                value={formData.product_code}
                onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                required
                disabled={!!editingItem}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_name">Tên hàng hóa *</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Đơn vị tính *</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required
                placeholder="cái, bộ, kg..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Phân loại</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phân loại" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Thương hiệu</Label>
              <Select value={formData.brand_id} onValueChange={(value) => setFormData({ ...formData, brand_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn thương hiệu" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wholesale_price">Giá bán buôn</Label>
              <Input
                id="wholesale_price"
                type="number"
                value={formData.wholesale_price}
                onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retail_price">Giá bán lẻ</Label>
              <Input
                id="retail_price"
                type="number"
                value={formData.retail_price}
                onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Tồn kho</Label>
              <Input
                id="stock_quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_stock_level">Tồn kho tối thiểu</Label>
              <Input
                id="min_stock_level"
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit">
              {editingItem ? "Cập nhật" : "Thêm mới"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
