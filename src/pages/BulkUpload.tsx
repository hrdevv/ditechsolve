import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, Package, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StagedImage {
  id: string;
  file: File;
  preview: string;
  productName: string;
  category: string;
  price: string;
  status: "staged" | "converting" | "converted";
}

const BulkUpload = () => {
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith("image/")
    );
    
    if (files.length > 0) {
      addFiles(files);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files: File[]) => {
    const newImages: StagedImage[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      productName: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      category: "electronics",
      price: "0.00",
      status: "staged",
    }));
    
    setStagedImages(prev => [...prev, ...newImages]);
    toast({
      title: "Images staged",
      description: `${files.length} image(s) ready for conversion`,
    });
  };

  const removeImage = (id: string) => {
    setStagedImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) URL.revokeObjectURL(image.preview);
      return prev.filter(img => img.id !== id);
    });
  };

  const convertToProduct = (id: string) => {
    setStagedImages(prev =>
      prev.map(img =>
        img.id === id ? { ...img, status: "converting" as const } : img
      )
    );

    setTimeout(() => {
      setStagedImages(prev =>
        prev.map(img =>
          img.id === id ? { ...img, status: "converted" as const } : img
        )
      );
      toast({
        title: "Product created",
        description: "Image successfully converted to WooCommerce product",
      });
    }, 1500);
  };

  const convertAll = () => {
    const stagedOnly = stagedImages.filter(img => img.status === "staged");
    stagedOnly.forEach(img => convertToProduct(img.id));
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Bulk Upload</h1>
        <p className="text-muted-foreground">Upload multiple images and convert them to products</p>
      </div>

      {/* Upload Zone */}
      <Card
        className={`p-12 mb-8 border-2 border-dashed transition-all ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
      >
        <div className="text-center">
          <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Drop images here or click to upload
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Support for JPG, PNG, WEBP up to 10MB each
          </p>
          <label htmlFor="file-input">
            <Button asChild>
              <span>Browse Files</span>
            </Button>
          </label>
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      </Card>

      {/* Staged Images */}
      {stagedImages.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Staged Images ({stagedImages.filter(img => img.status === "staged").length})
            </h2>
            <Button
              onClick={convertAll}
              disabled={!stagedImages.some(img => img.status === "staged")}
            >
              Convert All to Products
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stagedImages.map((image) => (
              <Card key={image.id} className="p-4">
                <div className="relative mb-4">
                  <img
                    src={image.preview}
                    alt={image.productName}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {image.status !== "converted" && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => removeImage(image.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  <Badge
                    className="absolute bottom-2 right-2"
                    variant={
                      image.status === "converted"
                        ? "default"
                        : image.status === "converting"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {image.status === "converted" && <Check className="w-3 h-3 mr-1" />}
                    {image.status}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Product Name</Label>
                    <Input
                      value={image.productName}
                      onChange={(e) =>
                        setStagedImages(prev =>
                          prev.map(img =>
                            img.id === image.id
                              ? { ...img, productName: e.target.value }
                              : img
                          )
                        )
                      }
                      disabled={image.status !== "staged"}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={image.category}
                      onValueChange={(value) =>
                        setStagedImages(prev =>
                          prev.map(img =>
                            img.id === image.id ? { ...img, category: value } : img
                          )
                        )
                      }
                      disabled={image.status !== "staged"}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="wearables">Wearables</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="computer">Computer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Price ($)</Label>
                    <Input
                      type="number"
                      value={image.price}
                      onChange={(e) =>
                        setStagedImages(prev =>
                          prev.map(img =>
                            img.id === image.id ? { ...img, price: e.target.value } : img
                          )
                        )
                      }
                      disabled={image.status !== "staged"}
                      className="mt-1"
                    />
                  </div>

                  {image.status === "staged" && (
                    <Button
                      className="w-full"
                      onClick={() => convertToProduct(image.id)}
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Convert to Product
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;
