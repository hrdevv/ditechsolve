import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCreateProduct } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { CreateProductDTO } from "@/lib/woocommerce/types";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WooFieldKey = keyof CreateProductDTO | "skip";

const WOOCOMMERCE_FIELDS: { value: WooFieldKey; label: string }[] = [
  { value: "skip", label: "Skip (Don't import)" },
  { value: "name", label: "Product Name" },
  { value: "sku", label: "SKU" },
  { value: "regular_price", label: "Regular Price" },
  { value: "sale_price", label: "Sale Price" },
  { value: "description", label: "Description" },
  { value: "short_description", label: "Short Description" },
  { value: "stock_quantity", label: "Stock Quantity" },
  { value: "stock_status", label: "Stock Status" },
  { value: "status", label: "Status" },
  { value: "catalog_visibility", label: "Catalog Visibility" },
];

interface ParsedRow {
  data: Record<string, string>;
  errors: string[];
  isValid: boolean;
}

interface CSVData {
  headers: string[];
  rows: ParsedRow[];
}

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing">("upload");
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, WooFieldKey>>({});
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const createProduct = useCreateProduct();
  const { toast } = useToast();

  const parseCSV = (text: string): CSVData => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row");
    }

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const data: Record<string, string> = {};
      headers.forEach((header, index) => {
        data[header] = values[index] || "";
      });
      rows.push({ data, errors: [], isValid: true });
    }

    return { headers, rows };
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        setCsvData(parsed);

        // Auto-map fields based on header names
        const autoMapping: Record<string, WooFieldKey> = {};
        parsed.headers.forEach((header) => {
          const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, "");
          const match = WOOCOMMERCE_FIELDS.find((field) => {
            const normalizedField = field.value.toLowerCase().replace(/_/g, "");
            return (
              normalizedHeader === normalizedField ||
              normalizedHeader.includes(normalizedField) ||
              normalizedField.includes(normalizedHeader)
            );
          });
          autoMapping[header] = match?.value || "skip";
        });
        setFieldMapping(autoMapping);
        setStep("mapping");
      } catch (error) {
        toast({
          title: "Error parsing CSV",
          description: error instanceof Error ? error.message : "Invalid CSV format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  }, [toast]);

  const validateRows = useMemo(() => {
    if (!csvData) return [];

    return csvData.rows.map((row) => {
      const errors: string[] = [];
      const mappedData: Partial<CreateProductDTO> = {};

      Object.entries(fieldMapping).forEach(([csvField, wooField]) => {
        if (wooField === "skip") return;
        const value = row.data[csvField];

        if (wooField === "name" && !value) {
          errors.push("Product name is required");
        }

        if ((wooField === "regular_price" || wooField === "sale_price") && value) {
          const numVal = parseFloat(value.replace(/[^0-9.-]/g, ""));
          if (isNaN(numVal) || numVal < 0) {
            errors.push(`Invalid ${wooField === "regular_price" ? "regular" : "sale"} price`);
          }
        }

        if (wooField === "stock_quantity" && value) {
          const numVal = parseInt(value, 10);
          if (isNaN(numVal) || numVal < 0) {
            errors.push("Invalid stock quantity");
          }
        }

        (mappedData as any)[wooField] = value;
      });

      // Check if name is mapped
      const hasNameMapping = Object.values(fieldMapping).includes("name");
      if (!hasNameMapping) {
        errors.push("Product name must be mapped");
      }

      return { ...row, errors, isValid: errors.length === 0 };
    });
  }, [csvData, fieldMapping]);

  const validRowCount = useMemo(() => {
    return validateRows.filter((r) => r.isValid).length;
  }, [validateRows]);

  const handleImport = async () => {
    if (!csvData) return;

    setStep("importing");
    const validRows = validateRows.filter((r) => r.isValid);
    setImportProgress({ current: 0, total: validRows.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const productData: Partial<CreateProductDTO> = {};

      Object.entries(fieldMapping).forEach(([csvField, wooField]) => {
        if (wooField === "skip") return;
        let value: any = row.data[csvField];

        // Type conversion
        if (wooField === "regular_price" || wooField === "sale_price") {
          value = value ? value.replace(/[^0-9.-]/g, "") : undefined;
        } else if (wooField === "stock_quantity") {
          value = value ? parseInt(value, 10) : undefined;
        }

        if (value !== undefined && value !== "") {
          (productData as any)[wooField] = value;
        }
      });

      try {
        await createProduct.mutateAsync(productData as CreateProductDTO);
        successCount++;
      } catch {
        errorCount++;
      }

      setImportProgress({ current: i + 1, total: validRows.length });
    }

    toast({
      title: "Import complete",
      description: `Successfully imported ${successCount} products. ${errorCount} failed.`,
    });

    handleClose();
  };

  const handleClose = () => {
    setStep("upload");
    setCsvData(null);
    setFieldMapping({});
    setImportProgress({ current: 0, total: 0 });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Products from CSV
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file to import products"}
            {step === "mapping" && "Map your CSV columns to WooCommerce fields"}
            {step === "preview" && "Review the data before importing"}
            {step === "importing" && "Importing products..."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <Upload className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="outline" asChild>
                  <span>Select CSV File</span>
                </Button>
              </Label>
            </div>
          )}

          {step === "mapping" && csvData && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found {csvData.headers.length} columns and {csvData.rows.length} rows
                </p>
                <div className="grid gap-3">
                  {csvData.headers.map((header) => (
                    <div key={header} className="flex items-center gap-4">
                      <div className="w-1/3">
                        <Label className="text-sm font-medium">{header}</Label>
                        <p className="text-xs text-muted-foreground truncate">
                          Sample: {csvData.rows[0]?.data[header] || "(empty)"}
                        </p>
                      </div>
                      <div className="w-8 text-center text-muted-foreground">→</div>
                      <div className="flex-1">
                        <Select
                          value={fieldMapping[header] || "skip"}
                          onValueChange={(value) =>
                            setFieldMapping((prev) => ({ ...prev, [header]: value as WooFieldKey }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WOOCOMMERCE_FIELDS.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}

          {step === "preview" && csvData && (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    {Object.entries(fieldMapping)
                      .filter(([, v]) => v !== "skip")
                      .map(([csvField, wooField]) => (
                        <TableHead key={csvField}>
                          {WOOCOMMERCE_FIELDS.find((f) => f.value === wooField)?.label || wooField}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validateRows.slice(0, 50).map((row, idx) => (
                    <TableRow key={idx} className={row.isValid ? "" : "bg-destructive/10"}>
                      <TableCell>
                        {row.isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                      </TableCell>
                      {Object.entries(fieldMapping)
                        .filter(([, v]) => v !== "skip")
                        .map(([csvField]) => (
                          <TableCell key={csvField} className="max-w-[200px] truncate">
                            {row.data[csvField] || "-"}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {validateRows.length > 50 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Showing first 50 of {validateRows.length} rows
                </p>
              )}
            </ScrollArea>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium mb-2">
                Importing products... {importProgress.current} / {importProgress.total}
              </p>
              <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(importProgress.current / importProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep("preview")}>
                Continue to Preview
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant={validRowCount > 0 ? "default" : "destructive"}>
                  {validRowCount} valid rows
                </Badge>
                {validateRows.length - validRowCount > 0 && (
                  <Badge variant="secondary">
                    {validateRows.length - validRowCount} with errors
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  Back to Mapping
                </Button>
                <Button onClick={handleImport} disabled={validRowCount === 0}>
                  Import {validRowCount} Products
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
