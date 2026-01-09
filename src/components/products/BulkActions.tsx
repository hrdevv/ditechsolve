import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Edit, Loader2 } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useBatchProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { WooCommerceProduct } from "@/lib/woocommerce/types";

interface BulkActionsProps {
  selectedProducts: WooCommerceProduct[];
  onClearSelection: () => void;
}

export const BulkActions = ({ selectedProducts, onClearSelection }: BulkActionsProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>("");
  const { data: categories } = useCategories();
  const batchProducts = useBatchProducts();
  const { toast } = useToast();

  const handleBulkAction = async () => {
    if (!bulkAction || selectedProducts.length === 0) return;

    const [action, value] = bulkAction.split(":");

    try {
      if (action === "status") {
        await batchProducts.mutateAsync({
          update: selectedProducts.map((p) => ({
            id: p.id,
            status: value as "publish" | "draft" | "pending" | "private",
          })),
        });
        toast({
          title: "Products updated",
          description: `Updated status of ${selectedProducts.length} products`,
        });
      } else if (action === "category") {
        await batchProducts.mutateAsync({
          update: selectedProducts.map((p) => ({
            id: p.id,
            categories: [{ id: parseInt(value) }],
          })),
        });
        toast({
          title: "Products updated",
          description: `Updated category of ${selectedProducts.length} products`,
        });
      }
      onClearSelection();
      setBulkAction("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update products",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await batchProducts.mutateAsync({
        delete: selectedProducts.map((p) => p.id),
      });
      toast({
        title: "Products deleted",
        description: `Deleted ${selectedProducts.length} products`,
      });
      onClearSelection();
      setShowDeleteDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete products",
        variant: "destructive",
      });
    }
  };

  if (selectedProducts.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg mb-4">
        <span className="text-sm font-medium">
          {selectedProducts.length} product{selectedProducts.length > 1 ? "s" : ""} selected
        </span>

        <div className="flex items-center gap-2 flex-1">
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Bulk action..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status:publish">Set to Published</SelectItem>
              <SelectItem value="status:draft">Set to Draft</SelectItem>
              <SelectItem value="status:pending">Set to Pending</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={`category:${cat.id}`}>
                  Move to {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleBulkAction}
            disabled={!bulkAction || batchProducts.isPending}
            size="sm"
          >
            {batchProducts.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Edit className="w-4 h-4 mr-2" />
            )}
            Apply
          </Button>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={batchProducts.isPending}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Selected
        </Button>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear Selection
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedProducts.length} products?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected products from your store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {batchProducts.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Delete Products
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
