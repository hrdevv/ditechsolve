import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Edit, Trash2, MoreVertical, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProducts, useDeleteProduct } from "@/hooks/useProducts";
import { ProductDialog } from "@/components/products/ProductDialog";
import { ProductFilters, ProductFiltersState } from "@/components/products/ProductFilters";
import { BulkActions } from "@/components/products/BulkActions";
import { WooCommerceProduct } from "@/lib/woocommerce/types";
import { useToast } from "@/hooks/use-toast";

const Products = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ProductFiltersState>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<WooCommerceProduct | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { toast } = useToast();

  const { data: products, isLoading } = useProducts({
    search: searchQuery || undefined,
    status: filters.status as any,
    category: filters.category,
  });
  const deleteProduct = useDeleteProduct();

  // Apply client-side filters for stock and price (API may not support all filters)
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter((product) => {
      // Stock filter
      if (filters.stockStatus && product.stock_status !== filters.stockStatus) {
        return false;
      }

      // Price filters
      const price = parseFloat(product.price) || 0;
      if (filters.minPrice && price < parseFloat(filters.minPrice)) {
        return false;
      }
      if (filters.maxPrice && price > parseFloat(filters.maxPrice)) {
        return false;
      }

      return true;
    });
  }, [products, filters]);

  const selectedProducts = useMemo(() => {
    return filteredProducts.filter((p) => selectedIds.includes(p.id));
  }, [filteredProducts, selectedIds]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, productId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== productId));
    }
  };

  const handleEdit = (product: WooCommerceProduct) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = async (product: WooCommerceProduct) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;
    
    try {
      await deleteProduct.mutateAsync({ id: product.id });
      toast({
        title: "Product deleted",
        description: `"${product.name}" has been removed.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const isAllSelected = filteredProducts.length > 0 && selectedIds.length === filteredProducts.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < filteredProducts.length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Products</h1>
        <p className="text-muted-foreground">Manage your WooCommerce product catalog</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <ProductFilters filters={filters} onFiltersChange={setFilters} />
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        <BulkActions 
          selectedProducts={selectedProducts} 
          onClearSelection={() => setSelectedIds([])} 
        />

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) (el as any).indeterminate = isSomeSelected;
                    }}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className={selectedIds.includes(product.id) ? "bg-muted/30" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(product.id)}
                        onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                        {product.images?.[0]?.src ? (
                          <img src={product.images[0].src} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">📦</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.sku || "-"}</TableCell>
                    <TableCell className="font-medium">${product.price}</TableCell>
                    <TableCell>
                      <Badge variant={product.stock_status === "instock" ? "default" : "destructive"}>
                        {product.stock_quantity !== null
                          ? `${product.stock_quantity} in stock`
                          : product.stock_status === "instock"
                          ? "In stock"
                          : "Out of stock"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.categories?.[0]?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === "publish" ? "default" : "secondary"}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
      />
    </div>
  );
};

export default Products;
