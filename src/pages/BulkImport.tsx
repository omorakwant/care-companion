import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Brain,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Trash2,
  Download,
  Sparkles,
  Building2,
  BedDouble,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import {
  autoMapColumns,
  applyMapping,
  extractDepartments,
  type BedField,
  type ParsedBed,
} from "@/utils/excelColumnMapper";

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

export default function BulkImport() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, BedField>>({});
  const [parsedBeds, setParsedBeds] = useState<ParsedBed[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: number;
    duplicates: number;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // ─── Step 1: File Upload ───
  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: string[][] = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: "",
          raw: false,
        });

        if (json.length < 2) {
          toast.error(t("bulkImport.fileTooSmall"));
          return;
        }

        const hdrs = json[0].map((h) => String(h).trim());
        const rows = json.slice(1).filter((row) => row.some((cell) => String(cell).trim()));

        setHeaders(hdrs);
        setRawRows(rows);

        // AI-powered auto-mapping
        const mapping = autoMapColumns(hdrs);
        setColumnMapping(mapping);
        setStep("mapping");
        toast.success(t("bulkImport.fileLoaded", { rows: rows.length, cols: hdrs.length }));
      } catch {
        toast.error(t("bulkImport.parseError"));
      }
    };
    reader.readAsArrayBuffer(file);
  }, [t]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // ─── Step 2: Column Mapping ───
  const updateMapping = (colIdx: number, field: BedField) => {
    setColumnMapping((prev) => ({ ...prev, [colIdx]: field }));
  };

  const hasBedNumberMapping = Object.values(columnMapping).includes("bed_number");

  const proceedToPreview = () => {
    if (!hasBedNumberMapping) {
      toast.error(t("bulkImport.needBedNumber"));
      return;
    }
    const beds = applyMapping(rawRows, headers, columnMapping);
    setParsedBeds(beds);
    setDepartments(extractDepartments(beds));
    setStep("preview");
  };

  // ─── Step 3: Preview ───
  const removeBed = (index: number) => {
    setParsedBeds((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Step 4: Import ───
  const startImport = async () => {
    setStep("importing");
    setImporting(true);
    setImportProgress({ done: 0, total: parsedBeds.length });

    let success = 0;
    let errors = 0;
    let duplicates = 0;

    // Fetch existing bed numbers to detect duplicates
    const { data: existingBeds } = await supabase
      .from("beds")
      .select("bed_number");
    const existingSet = new Set(
      existingBeds?.map((b) => b.bed_number.toLowerCase()) ?? []
    );

    // Batch import in chunks of 20
    const BATCH_SIZE = 20;
    for (let i = 0; i < parsedBeds.length; i += BATCH_SIZE) {
      const batch = parsedBeds.slice(i, i + BATCH_SIZE);
      const toInsert: { bed_number: string; ward: string; status: string; notes: string }[] = [];

      for (const bed of batch) {
        if (existingSet.has(bed.bed_number.toLowerCase())) {
          duplicates++;
          continue;
        }
        toInsert.push({
          bed_number: bed.bed_number,
          ward: bed.ward || "General",
          status: bed.status as "available" | "occupied" | "maintenance",
          notes: bed.notes || "",
        });
        existingSet.add(bed.bed_number.toLowerCase());
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from("beds").insert(toInsert);
        if (error) {
          errors += toInsert.length;
        } else {
          success += toInsert.length;
        }
      }

      setImportProgress({ done: Math.min(i + BATCH_SIZE, parsedBeds.length), total: parsedBeds.length });
    }

    setImportResults({ success, errors, duplicates });
    setImporting(false);
    setStep("done");
  };

  // ─── Reset ───
  const reset = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setParsedBeds([]);
    setDepartments([]);
    setImportResults(null);
  };

  const fieldOptions: { value: BedField; label: string }[] = [
    { value: "bed_number", label: t("bulkImport.fieldBedNumber") },
    { value: "ward", label: t("bulkImport.fieldWard") },
    { value: "status", label: t("bulkImport.fieldStatus") },
    { value: "notes", label: t("bulkImport.fieldNotes") },
    { value: "skip", label: t("bulkImport.fieldSkip") },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-8 lg:px-10 h-full overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[28px] font-semibold text-foreground">
              {t("bulkImport.title")}
            </h2>
            <p className="text-xs text-[var(--c-text-muted)]">
              {t("bulkImport.subtitle")}
            </p>
          </div>
          {step !== "upload" && step !== "done" && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-[var(--c-text-secondary)] text-[12px] hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" /> {t("bulkImport.startOver")}
            </button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {(["upload", "mapping", "preview", "importing"] as Step[]).map((s, i) => {
            const labels = [
              t("bulkImport.stepUpload"),
              t("bulkImport.stepMapping"),
              t("bulkImport.stepPreview"),
              t("bulkImport.stepImport"),
            ];
            const stepOrder = ["upload", "mapping", "preview", "importing"];
            const currentIdx = stepOrder.indexOf(step === "done" ? "importing" : step);
            const isActive = stepOrder.indexOf(s) <= currentIdx;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={cn("w-8 h-px", isActive ? "bg-[var(--c-primary)]" : "bg-[var(--c-border)]")} />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                      isActive
                        ? "gradient-primary text-white"
                        : "bg-[var(--c-surface-alt)] text-[var(--c-text-muted)]"
                    )}
                  >
                    {step === "done" && s === "importing" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      isActive ? "text-foreground" : "text-[var(--c-text-muted)]"
                    )}
                  >
                    {labels[i]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Step 1: Upload ─── */}
        {step === "upload" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "glass-card rounded-2xl flex flex-col items-center justify-center py-20 px-8 transition-colors cursor-pointer",
              dragOver && "border-[var(--c-primary)] bg-primary/5"
            )}
            onClick={() => document.getElementById("excel-input")?.click()}
          >
            <input
              id="excel-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-5">
              <FileSpreadsheet className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">
              {t("bulkImport.dropTitle")}
            </h3>
            <p className="text-[13px] text-[var(--c-text-muted)] text-center max-w-md mb-5">
              {t("bulkImport.dropDescription")}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[var(--c-text-dim)]">
                {t("bulkImport.supportedFormats")}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Sparkles className="w-4 h-4 text-[var(--c-primary)]" />
              <span className="text-[12px] text-[var(--c-text-secondary)]">
                {t("bulkImport.aiPowered")}
              </span>
            </div>
          </div>
        )}

        {/* ─── Step 2: Column Mapping ─── */}
        {step === "mapping" && (
          <div className="flex flex-col gap-5">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-[10px] gradient-primary flex items-center justify-center">
                  <Brain className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {t("bulkImport.mappingTitle")}
                  </h3>
                  <p className="text-[11px] text-[var(--c-text-muted)]">
                    {t("bulkImport.mappingDescription", { file: fileName })}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {headers.map((header, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-3 rounded-xl bg-[var(--c-surface-alt)] border border-[var(--c-border)]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {header}
                      </p>
                      <p className="text-[11px] text-[var(--c-text-muted)]">
                        {t("bulkImport.sampleValues")}: {rawRows.slice(0, 3).map((r) => r[idx]).filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[var(--c-text-dim)] shrink-0" />
                    <div className="w-[180px] shrink-0">
                      <Select
                        value={columnMapping[idx] || "skip"}
                        onValueChange={(v) => updateMapping(idx, v as BedField)}
                      >
                        <SelectTrigger className="h-9 bg-[var(--c-surface)] border-[var(--c-border)] text-foreground text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--c-surface)] border-[var(--c-border)]">
                          {fieldOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {columnMapping[idx] && columnMapping[idx] !== "skip" && (
                      <CheckCircle2 className="w-4 h-4 text-[var(--c-accent)] shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {!hasBedNumberMapping && (
                <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-destructive/10 text-destructive text-[12px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {t("bulkImport.needBedNumber")}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={proceedToPreview}
                disabled={!hasBedNumberMapping}
                className="flex items-center gap-2 gradient-primary rounded-[10px] h-[38px] px-5 text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {t("bulkImport.reviewData")} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Preview ─── */}
        {step === "preview" && (
          <div className="flex flex-col gap-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-primary/10 flex items-center justify-center">
                  <BedDouble className="w-5 h-5 text-[var(--c-primary)]" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-foreground">{parsedBeds.length}</p>
                  <p className="text-[10px] text-[var(--c-text-muted)] uppercase tracking-wider">{t("bulkImport.totalBeds")}</p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-accent/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[var(--c-accent)]" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-foreground">{departments.length}</p>
                  <p className="text-[10px] text-[var(--c-text-muted)] uppercase tracking-wider">{t("bulkImport.departments")}</p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-warning/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-[var(--c-warning)]" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-foreground">{fileName}</p>
                  <p className="text-[10px] text-[var(--c-text-muted)] uppercase tracking-wider">{t("bulkImport.sourceFile")}</p>
                </div>
              </div>
            </div>

            {/* Departments breakdown */}
            {departments.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-display text-sm font-semibold text-foreground mb-3">
                  {t("bulkImport.detectedDepartments")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {departments.map((dept) => {
                    const count = parsedBeds.filter((b) => b.ward === dept).length;
                    return (
                      <span
                        key={dept}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-[var(--c-primary)] text-[11px] font-medium"
                      >
                        <Building2 className="w-3 h-3" />
                        {dept} ({count})
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bed Preview Table */}
            <div className="glass-card rounded-2xl overflow-hidden flex flex-col max-h-[400px]">
              <div className="flex items-center h-11 px-5 border-b border-[var(--c-border)]">
                <span className="flex-1 text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">{t("bulkImport.fieldBedNumber")}</span>
                <span className="w-[160px] text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">{t("bulkImport.fieldWard")}</span>
                <span className="w-[120px] text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">{t("bulkImport.fieldStatus")}</span>
                <span className="flex-1 text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">{t("bulkImport.fieldNotes")}</span>
                <span className="w-10" />
              </div>
              <div className="flex-1 overflow-auto">
                {parsedBeds.map((bed, i) => (
                  <div
                    key={i}
                    className="flex items-center h-[44px] px-5 border-b border-[var(--c-border)] hover:bg-[var(--c-surface-alt)]/50 transition-colors"
                  >
                    <span className="flex-1 text-[13px] font-medium text-foreground">{bed.bed_number}</span>
                    <span className="w-[160px] text-[13px] text-[var(--c-text-secondary)]">{bed.ward || "—"}</span>
                    <span className="w-[120px]">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          bed.status === "available" && "bg-accent/10 text-[var(--c-accent)]",
                          bed.status === "occupied" && "bg-primary/10 text-[var(--c-primary)]",
                          bed.status === "maintenance" && "bg-warning/10 text-[var(--c-warning)]"
                        )}
                      >
                        {bed.status}
                      </span>
                    </span>
                    <span className="flex-1 text-[13px] text-[var(--c-text-muted)] truncate">{bed.notes || "—"}</span>
                    <button
                      onClick={() => removeBed(i)}
                      className="w-10 flex items-center justify-center text-[var(--c-text-dim)] hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep("mapping")}
                className="flex items-center gap-2 h-9 px-3.5 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-[var(--c-text-secondary)] text-[12px] hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> {t("bulkImport.backToMapping")}
              </button>
              <button
                onClick={startImport}
                disabled={parsedBeds.length === 0}
                className="flex items-center gap-2 gradient-primary rounded-[10px] h-[38px] px-5 text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Upload className="w-3.5 h-3.5" />
                {t("bulkImport.importBeds", { count: parsedBeds.length })}
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 4: Importing ─── */}
        {step === "importing" && importing && (
          <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-[var(--c-primary)] animate-spin mb-4" />
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">
              {t("bulkImport.importingTitle")}
            </h3>
            <p className="text-[13px] text-[var(--c-text-muted)] mb-4">
              {t("bulkImport.importingProgress", {
                done: importProgress.done,
                total: importProgress.total,
              })}
            </p>
            <div className="w-64 h-2 rounded-full bg-[var(--c-surface-alt)] overflow-hidden">
              <div
                className="h-full gradient-primary rounded-full transition-all duration-300"
                style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* ─── Step 5: Done ─── */}
        {step === "done" && importResults && (
          <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-16 px-8">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-8 h-8 text-[var(--c-accent)]" />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              {t("bulkImport.doneTitle")}
            </h3>
            <p className="text-[13px] text-[var(--c-text-muted)] mb-6 text-center max-w-md">
              {t("bulkImport.doneDescription")}
            </p>

            <div className="flex gap-4 mb-8">
              <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl bg-accent/10">
                <span className="font-display text-2xl font-bold text-[var(--c-accent)]">{importResults.success}</span>
                <span className="text-[10px] text-[var(--c-text-muted)] uppercase">{t("bulkImport.imported")}</span>
              </div>
              {importResults.duplicates > 0 && (
                <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl bg-warning/10">
                  <span className="font-display text-2xl font-bold text-[var(--c-warning)]">{importResults.duplicates}</span>
                  <span className="text-[10px] text-[var(--c-text-muted)] uppercase">{t("bulkImport.duplicates")}</span>
                </div>
              )}
              {importResults.errors > 0 && (
                <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl bg-destructive/10">
                  <span className="font-display text-2xl font-bold text-destructive">{importResults.errors}</span>
                  <span className="text-[10px] text-[var(--c-text-muted)] uppercase">{t("bulkImport.errors")}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate("/beds")}
                className="flex items-center gap-2 gradient-primary rounded-[10px] h-[38px] px-5 text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
              >
                <BedDouble className="w-3.5 h-3.5" /> {t("bulkImport.viewBeds")}
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-2 h-[38px] px-5 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-[var(--c-text-secondary)] text-[12px] hover:text-foreground transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> {t("bulkImport.importMore")}
              </button>
            </div>
          </div>
        )}

        {/* Template download hint */}
        {step === "upload" && (
          <div className="flex items-center justify-center gap-2 text-[12px] text-[var(--c-text-muted)]">
            <Download className="w-3.5 h-3.5" />
            {t("bulkImport.templateHint")}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
