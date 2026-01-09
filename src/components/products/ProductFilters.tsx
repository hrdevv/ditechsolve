import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, X } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

export interface ProductFiltersState {
  status?: string;
  category?: number;
  stockStatus?: string;
  minPrice?: string;
  maxPrice?: string;
}

interface ProductFiltersProps {
  filters: ProductFiltersState;
  onFiltersChange: (filters: ProductFiltersState) => void;
}

export const ProductFilters = ({ filters, onFiltersChange }: ProductFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: categories } = useCategories();

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleReset = () => {
    onFiltersChange({});
  };

  const updateFilter = (key: keyof ProductFiltersState, value: string | number | undefined) => {
    const newFilters = { ...filters };
    if (value === "" || value === undefined || value === "all") {
      delete newFilters[key];
    } else {
      (newFilters as any)[key] = value;
    }
    onFiltersChange(newFilters);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filters</h4>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="w-4 h-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => updateFilter("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="publish">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={filters.category?.toString() || "all"}
              onValueChange={(value) => updateFilter("category", value === "all" ? undefined : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name} ({cat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock Status Filter */}
          <div className="space-y-2">
            <Label>Stock Status</Label>
            <Select
              value={filters.stockStatus || "all"}
              onValueChange={(value) => updateFilter("stockStatus", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All stock levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stock levels</SelectItem>
                <SelectItem value="instock">In Stock</SelectItem>
                <SelectItem value="outofstock">Out of Stock</SelectItem>
                <SelectItem value="onbackorder">On Backorder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-2">
            <Label>Price Range</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ""}
                onChange={(e) => updateFilter("minPrice", e.target.value)}
                className="flex-1"
              />
              <span className="flex items-center text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ""}
                onChange={(e) => updateFilter("maxPrice", e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
