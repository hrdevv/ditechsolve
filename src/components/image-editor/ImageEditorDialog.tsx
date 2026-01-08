import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Crop,
  Eraser,
  Palette,
  RotateCcw,
  Check,
  X,
  Loader2,
  ZoomIn,
  ZoomOut,
  Move,
} from "lucide-react";
import { loadImage, cropImage, canvasToBlob, blobToDataUrl, mergeCanvasWithBackground } from "@/lib/imageProcessing";

interface CropBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  imageSrc?: string;
  onSave: (blob: Blob, previewUrl: string) => void;
}

const PRESET_COLORS = [
  "#FFFFFF",
  "#F3F4F6",
  "#E5E7EB",
  "#000000",
  "#EF4444",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "transparent",
];

export const ImageEditorDialog = ({
  open,
  onOpenChange,
  imageFile,
  imageSrc,
  onSave,
}: ImageEditorDialogProps) => {
  const [activeTab, setActiveTab] = useState("crop");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [zoom, setZoom] = useState(100);
  
  // Crop state
  const [cropBounds, setCropBounds] = useState<CropBounds | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState<string>("free");
  
  // Background state
  const [bgRemovedCanvas, setBgRemovedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image when dialog opens
  useEffect(() => {
    if (open && (imageFile || imageSrc)) {
      loadOriginalImage();
    }
    return () => {
      setCropBounds(null);
      setBgRemovedCanvas(null);
      setZoom(100);
    };
  }, [open, imageFile, imageSrc]);

  const loadOriginalImage = async () => {
    try {
      let src = imageSrc;
      if (imageFile) {
        src = URL.createObjectURL(imageFile);
      }
      if (!src) return;

      const img = await loadImage(await fetch(src).then(r => r.blob()));
      originalImageRef.current = img;
      
      // Initialize crop bounds to full image
      setCropBounds({
        x: 0,
        y: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });

      drawCanvas();
    } catch (error) {
      console.error("Failed to load image:", error);
    }
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size based on image and zoom
    const scale = zoom / 100;
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;

    // Clear and draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw checkerboard pattern for transparency
    const patternSize = 10;
    for (let x = 0; x < canvas.width; x += patternSize) {
      for (let y = 0; y < canvas.height; y += patternSize) {
        ctx.fillStyle = (x + y) % (patternSize * 2) === 0 ? "#ccc" : "#fff";
        ctx.fillRect(x, y, patternSize, patternSize);
      }
    }

    // Draw the appropriate image
    if (bgRemovedCanvas && activeTab === "background") {
      // If we have bg removed, draw background color first then the image
      if (backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(bgRemovedCanvas, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    // Draw crop overlay if in crop mode
    if (activeTab === "crop" && cropBounds) {
      const scale = zoom / 100;
      
      // Semi-transparent overlay outside crop area
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      
      // Top
      ctx.fillRect(0, 0, canvas.width, cropBounds.y * scale);
      // Bottom
      ctx.fillRect(
        0,
        (cropBounds.y + cropBounds.height) * scale,
        canvas.width,
        canvas.height - (cropBounds.y + cropBounds.height) * scale
      );
      // Left
      ctx.fillRect(
        0,
        cropBounds.y * scale,
        cropBounds.x * scale,
        cropBounds.height * scale
      );
      // Right
      ctx.fillRect(
        (cropBounds.x + cropBounds.width) * scale,
        cropBounds.y * scale,
        canvas.width - (cropBounds.x + cropBounds.width) * scale,
        cropBounds.height * scale
      );

      // Crop border
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        cropBounds.x * scale,
        cropBounds.y * scale,
        cropBounds.width * scale,
        cropBounds.height * scale
      );

      // Corner handles
      const handleSize = 8;
      ctx.fillStyle = "#3B82F6";
      const corners = [
        { x: cropBounds.x * scale, y: cropBounds.y * scale },
        { x: (cropBounds.x + cropBounds.width) * scale, y: cropBounds.y * scale },
        { x: cropBounds.x * scale, y: (cropBounds.y + cropBounds.height) * scale },
        { x: (cropBounds.x + cropBounds.width) * scale, y: (cropBounds.y + cropBounds.height) * scale },
      ];
      corners.forEach(({ x, y }) => {
        ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      });
    }
  }, [zoom, cropBounds, activeTab, bgRemovedCanvas, backgroundColor]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleRemoveBackground = async () => {
    if (!originalImageRef.current) return;

    setIsProcessing(true);
    setProcessingMessage("Loading AI model (first time may take a moment)...");

    try {
      const { pipeline, env } = await import("@huggingface/transformers");
      
      // Configure for browser
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      setProcessingMessage("Analyzing image...");

      const segmenter = await pipeline(
        "image-segmentation",
        "Xenova/segformer-b0-finetuned-ade-512-512",
        { device: "webgpu" }
      );

      // Convert image to data URL
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx || !originalImageRef.current) return;

      // Resize for processing
      const maxDim = 512;
      let width = originalImageRef.current.naturalWidth;
      let height = originalImageRef.current.naturalHeight;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(originalImageRef.current, 0, 0, width, height);

      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      setProcessingMessage("Removing background...");

      const result = await segmenter(imageData);

      if (!result || !Array.isArray(result) || !result[0]?.mask) {
        throw new Error("Invalid segmentation result");
      }

      // Apply mask to original size image
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = originalImageRef.current.naturalWidth;
      outputCanvas.height = originalImageRef.current.naturalHeight;
      const outputCtx = outputCanvas.getContext("2d");
      
      if (!outputCtx) throw new Error("Could not get output canvas context");

      outputCtx.drawImage(originalImageRef.current, 0, 0);

      const outputImageData = outputCtx.getImageData(
        0,
        0,
        outputCanvas.width,
        outputCanvas.height
      );
      const data = outputImageData.data;

      // Scale mask to original image size
      const maskWidth = width;
      const maskHeight = height;
      const scaleX = originalImageRef.current.naturalWidth / maskWidth;
      const scaleY = originalImageRef.current.naturalHeight / maskHeight;

      for (let y = 0; y < outputCanvas.height; y++) {
        for (let x = 0; x < outputCanvas.width; x++) {
          const maskX = Math.floor(x / scaleX);
          const maskY = Math.floor(y / scaleY);
          const maskIdx = maskY * maskWidth + maskX;
          const alpha = Math.round((1 - result[0].mask.data[maskIdx]) * 255);
          
          const idx = (y * outputCanvas.width + x) * 4;
          data[idx + 3] = alpha;
        }
      }

      outputCtx.putImageData(outputImageData, 0, 0);
      setBgRemovedCanvas(outputCanvas);
      setActiveTab("background");
      setProcessingMessage("");
    } catch (error) {
      console.error("Background removal failed:", error);
      setProcessingMessage("Failed to remove background. Please try again.");
      setTimeout(() => setProcessingMessage(""), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCrop = () => {
    if (!originalImageRef.current || !cropBounds) return;

    const cropped = cropImage(originalImageRef.current, cropBounds);
    
    // Update original image ref to cropped version
    const img = new Image();
    img.onload = () => {
      originalImageRef.current = img;
      setCropBounds({
        x: 0,
        y: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      drawCanvas();
    };
    img.src = cropped.toDataURL();
  };

  const handleReset = () => {
    setBgRemovedCanvas(null);
    setBackgroundColor("#FFFFFF");
    loadOriginalImage();
  };

  const handleSave = async () => {
    setIsProcessing(true);
    
    try {
      let resultCanvas: HTMLCanvasElement;

      if (bgRemovedCanvas && backgroundColor !== "transparent") {
        resultCanvas = mergeCanvasWithBackground(bgRemovedCanvas, backgroundColor);
      } else if (bgRemovedCanvas) {
        resultCanvas = bgRemovedCanvas;
      } else if (originalImageRef.current && cropBounds) {
        resultCanvas = cropImage(originalImageRef.current, cropBounds);
      } else {
        throw new Error("No image to save");
      }

      const blob = await canvasToBlob(resultCanvas, "image/png", 1.0);
      const previewUrl = await blobToDataUrl(blob);
      
      onSave(blob, previewUrl);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== "crop" || !cropBounds) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scale = zoom / 100;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || activeTab !== "crop" || !cropBounds || !originalImageRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scale = zoom / 100;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    const newBounds = {
      x: Math.max(0, Math.min(cropBounds.x + dx, originalImageRef.current.naturalWidth - cropBounds.width)),
      y: Math.max(0, Math.min(cropBounds.y + dy, originalImageRef.current.naturalHeight - cropBounds.height)),
      width: cropBounds.width,
      height: cropBounds.height,
    };

    setCropBounds(newBounds);
    setDragStart({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="crop" className="gap-2">
              <Crop className="w-4 h-4" />
              Crop
            </TabsTrigger>
            <TabsTrigger value="remove-bg" className="gap-2">
              <Eraser className="w-4 h-4" />
              Remove BG
            </TabsTrigger>
            <TabsTrigger value="background" className="gap-2" disabled={!bgRemovedCanvas}>
              <Palette className="w-4 h-4" />
              Background
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <div className="flex gap-4 h-full">
              {/* Canvas Preview */}
              <div 
                ref={containerRef}
                className="flex-1 bg-secondary/30 rounded-lg overflow-auto flex items-center justify-center p-4"
              >
                {isProcessing ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{processingMessage}</p>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-[400px] object-contain cursor-move"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />
                )}
              </div>

              {/* Tools Panel */}
              <div className="w-56 space-y-4">
                {/* Zoom Control */}
                <div className="space-y-2">
                  <Label className="text-xs">Zoom: {zoom}%</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setZoom((z) => Math.max(25, z - 25))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Slider
                      value={[zoom]}
                      onValueChange={([v]) => setZoom(v)}
                      min={25}
                      max={200}
                      step={25}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setZoom((z) => Math.min(200, z + 25))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <TabsContent value="crop" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Aspect Ratio</Label>
                    <div className="grid grid-cols-3 gap-1">
                      {["free", "1:1", "4:3", "16:9"].map((ratio) => (
                        <Button
                          key={ratio}
                          variant={aspectRatio === ratio ? "default" : "outline"}
                          size="sm"
                          className="text-xs"
                          onClick={() => setAspectRatio(ratio)}
                        >
                          {ratio}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    Drag to adjust crop area
                  </p>

                  <Button className="w-full" onClick={handleApplyCrop}>
                    <Check className="w-4 h-4 mr-2" />
                    Apply Crop
                  </Button>
                </TabsContent>

                <TabsContent value="remove-bg" className="mt-0 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    AI-powered background removal. Works best with clear subjects.
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={handleRemoveBackground}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eraser className="w-4 h-4 mr-2" />
                    )}
                    Remove Background
                  </Button>
                  {bgRemovedCanvas && (
                    <p className="text-xs text-success">
                      ✓ Background removed. Switch to Background tab to change color.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="background" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Background Color</Label>
                    <div className="grid grid-cols-5 gap-1">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded border-2 ${
                            backgroundColor === color
                              ? "border-primary"
                              : "border-border"
                          } ${
                            color === "transparent"
                              ? "bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYlWNgYGCQwoKxgqGgcJA5h3yNAFwBCN6hVNYAAAAASUVORK5CYII=')] bg-repeat"
                              : ""
                          }`}
                          style={{ backgroundColor: color !== "transparent" ? color : undefined }}
                          onClick={() => setBackgroundColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Custom Color</Label>
                    <Input
                      type="color"
                      value={backgroundColor === "transparent" ? "#ffffff" : backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="h-8 p-1"
                    />
                  </div>
                </TabsContent>
              </div>
            </div>
          </div>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isProcessing}>
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
