import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImagePlus, X, Edit2, GripVertical } from "lucide-react";
import { ImageEditorDialog } from "@/components/image-editor/ImageEditorDialog";

export interface ProductImage {
  id: string;
  src: string;
  name?: string;
  alt?: string;
  file?: File;
}

interface ImageGalleryManagerProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxImages?: number;
}

export const ImageGalleryManager = ({
  images,
  onChange,
  maxImages = 10,
}: ImageGalleryManagerProps) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const remainingSlots = maxImages - images.length;
      const filesToAdd = files.slice(0, remainingSlots);

      const newImages: ProductImage[] = filesToAdd.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        src: URL.createObjectURL(file),
        name: file.name,
        file,
      }));

      onChange([...images, ...newImages]);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [images, maxImages, onChange]
  );

  const handleRemove = (id: string) => {
    const imageToRemove = images.find((img) => img.id === id);
    if (imageToRemove?.src.startsWith("blob:")) {
      URL.revokeObjectURL(imageToRemove.src);
    }
    onChange(images.filter((img) => img.id !== id));
  };

  const handleEdit = (image: ProductImage) => {
    setEditingImage(image);
    setEditorOpen(true);
  };

  const handleEditorSave = (blob: Blob, previewUrl: string) => {
    if (!editingImage) return;

    const updatedImages = images.map((img) =>
      img.id === editingImage.id
        ? {
            ...img,
            src: previewUrl,
            file: new File([blob], img.name || "edited-image.png", {
              type: "image/png",
            }),
          }
        : img
    );

    onChange(updatedImages);
    setEditingImage(null);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const [removed] = newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, removed);
    onChange(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const setAsFeatured = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const [removed] = newImages.splice(index, 1);
    newImages.unshift(removed);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Product Images ({images.length}/{maxImages})
        </Label>
        {images.length > 0 && (
          <span className="text-xs text-muted-foreground">
            First image is the featured image. Drag to reorder.
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((image, index) => (
          <div
            key={image.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`relative group aspect-square rounded-lg border-2 overflow-hidden ${
              index === 0
                ? "border-primary ring-2 ring-primary/20"
                : "border-border"
            } ${draggedIndex === index ? "opacity-50" : ""}`}
          >
            <img
              src={image.src}
              alt={image.alt || image.name || "Product image"}
              className="w-full h-full object-cover"
            />

            {/* Featured badge */}
            {index === 0 && (
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                Featured
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleEdit(image)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleRemove(image.id)}
              >
                <X className="w-4 h-4" />
              </Button>
              {index !== 0 && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setAsFeatured(index)}
                  title="Set as featured"
                >
                  ★
                </Button>
              )}
            </div>

            {/* Drag handle */}
            <div className="absolute top-1 right-1 p-1 bg-black/40 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
              <GripVertical className="w-3 h-3 text-white" />
            </div>
          </div>
        ))}

        {/* Add button */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2"
          >
            <ImagePlus className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Add Image</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Image Editor Dialog */}
      <ImageEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        imageFile={editingImage?.file || null}
        imageSrc={editingImage?.src}
        onSave={handleEditorSave}
      />
    </div>
  );
};
