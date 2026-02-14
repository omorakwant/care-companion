/**
 * AI-like smart column mapper for Excel imports.
 * Uses multilingual keyword matching and fuzzy heuristics
 * to automatically detect which Excel columns map to bed fields.
 */

export type BedField = "bed_number" | "ward" | "status" | "notes" | "skip";

interface ColumnMatch {
  field: BedField;
  confidence: number; // 0-1
}

// Keyword dictionaries for each field (EN + FR + AR transliterations)
const FIELD_KEYWORDS: Record<Exclude<BedField, "skip">, string[]> = {
  bed_number: [
    "bed", "bed_number", "bed number", "bed no", "bed#", "bedno",
    "room", "room number", "room no", "room#",
    "lit", "numéro de lit", "numero de lit", "n° lit", "n°lit", "nlit",
    "chambre", "numéro", "numero", "num", "n°",
    "سرير", "رقم السرير",
    "code", "id", "ref", "reference",
  ],
  ward: [
    "ward", "department", "dept", "department name", "dept name",
    "service", "unit", "section", "wing", "block", "building", "floor",
    "service", "département", "departement", "unité", "unite", "aile",
    "bâtiment", "batiment", "étage", "etage", "bloc", "pavillon",
    "قسم", "جناح",
    "division", "area", "zone",
  ],
  status: [
    "status", "state", "availability", "available",
    "état", "etat", "statut", "disponibilité", "disponibilite",
    "حالة",
    "condition", "occupied", "maintenance",
  ],
  notes: [
    "notes", "note", "comment", "comments", "description", "details",
    "remarque", "remarques", "observation", "observations",
    "ملاحظات",
    "info", "information", "additional",
  ],
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[_\-\.]/g, " ")
    .replace(/\s+/g, " ");
}

function matchScore(header: string, keywords: string[]): number {
  const norm = normalize(header);

  // Exact match
  for (const kw of keywords) {
    if (norm === kw) return 1.0;
  }

  // Contains full keyword
  for (const kw of keywords) {
    if (norm.includes(kw) || kw.includes(norm)) return 0.8;
  }

  // Word-level overlap
  const headerWords = norm.split(" ");
  for (const kw of keywords) {
    const kwWords = kw.split(" ");
    const overlap = headerWords.filter((w) => kwWords.includes(w));
    if (overlap.length > 0) {
      return 0.5 + (overlap.length / Math.max(headerWords.length, kwWords.length)) * 0.3;
    }
  }

  // First 3 chars match (fuzzy)
  if (norm.length >= 3) {
    for (const kw of keywords) {
      if (kw.length >= 3 && norm.slice(0, 3) === kw.slice(0, 3)) return 0.3;
    }
  }

  return 0;
}

export function autoMapColumns(headers: string[]): Record<number, BedField> {
  const mapping: Record<number, BedField> = {};
  const usedFields = new Set<BedField>();

  // Score each header against each field
  const scores: { colIdx: number; field: BedField; score: number }[] = [];
  for (let i = 0; i < headers.length; i++) {
    for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
      const score = matchScore(headers[i], keywords);
      if (score > 0.2) {
        scores.push({ colIdx: i, field: field as BedField, score });
      }
    }
  }

  // Sort by score descending, greedily assign best matches
  scores.sort((a, b) => b.score - a.score);
  const usedCols = new Set<number>();

  for (const { colIdx, field, score } of scores) {
    // bed_number and ward can only be assigned once
    if (field === "bed_number" || field === "ward") {
      if (usedFields.has(field) || usedCols.has(colIdx)) continue;
      mapping[colIdx] = field;
      usedFields.add(field);
      usedCols.add(colIdx);
    } else if (field === "status") {
      if (usedFields.has(field) || usedCols.has(colIdx)) continue;
      mapping[colIdx] = field;
      usedFields.add(field);
      usedCols.add(colIdx);
    } else if (field === "notes") {
      if (usedFields.has(field) || usedCols.has(colIdx)) continue;
      mapping[colIdx] = field;
      usedFields.add(field);
      usedCols.add(colIdx);
    }
  }

  // If bed_number not detected, default first unmapped column to bed_number
  if (!usedFields.has("bed_number")) {
    for (let i = 0; i < headers.length; i++) {
      if (!usedCols.has(i)) {
        mapping[i] = "bed_number";
        usedCols.add(i);
        break;
      }
    }
  }

  // Mark remaining columns as skip
  for (let i = 0; i < headers.length; i++) {
    if (!(i in mapping)) {
      mapping[i] = "skip";
    }
  }

  return mapping;
}

export interface ParsedBed {
  bed_number: string;
  ward: string;
  status: string;
  notes: string;
}

export function applyMapping(
  rows: string[][],
  headers: string[],
  mapping: Record<number, BedField>
): ParsedBed[] {
  const beds: ParsedBed[] = [];

  for (const row of rows) {
    const bed: ParsedBed = {
      bed_number: "",
      ward: "",
      status: "available",
      notes: "",
    };

    for (let i = 0; i < headers.length; i++) {
      const field = mapping[i];
      const value = (row[i] ?? "").toString().trim();
      if (!field || field === "skip" || !value) continue;

      if (field === "status") {
        // Normalize status values
        const lower = value.toLowerCase();
        if (
          lower.includes("occupied") || lower.includes("occupé") ||
          lower.includes("occ") || lower.includes("مشغول")
        ) {
          bed.status = "occupied";
        } else if (
          lower.includes("maint") || lower.includes("repair") ||
          lower.includes("صيانة")
        ) {
          bed.status = "maintenance";
        } else {
          bed.status = "available";
        }
      } else {
        bed[field] = value;
      }
    }

    // Only include if we have at least a bed number
    if (bed.bed_number) {
      beds.push(bed);
    }
  }

  return beds;
}

/** Detect unique departments/wards from parsed beds */
export function extractDepartments(beds: ParsedBed[]): string[] {
  const depts = new Set<string>();
  for (const bed of beds) {
    if (bed.ward) depts.add(bed.ward);
  }
  return Array.from(depts).sort();
}
