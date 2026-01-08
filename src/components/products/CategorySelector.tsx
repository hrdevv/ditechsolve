import { useCategories } from "@/hooks/useCategories";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen } from "lucide-react";

interface CategorySelectorProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export const CategorySelector = ({
  selectedIds,
  onChange,
}: CategorySelectorProps) => {
  const { data: categories, isLoading } = useCategories();

  const handleToggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (!categories?.length) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No categories available</p>
        <p className="text-xs">Create categories in the Categories page</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
      {categories.map((category) => (
        <div key={category.id} className="flex items-center space-x-3">
          <Checkbox
            id={`cat-${category.id}`}
            checked={selectedIds.includes(category.id)}
            onCheckedChange={() => handleToggle(category.id)}
          />
          <Label
            htmlFor={`cat-${category.id}`}
            className="flex-1 flex items-center justify-between cursor-pointer"
          >
            <span className="text-sm">{category.name}</span>
            <span className="text-xs text-muted-foreground">
              {category.count} products
            </span>
          </Label>
        </div>
      ))}
    </div>
  );
};
