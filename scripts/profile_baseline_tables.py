#!/usr/bin/env python3
"""
Inspects baseline distributions and valid values for candidate expansion tables.
"""
import csv
from pathlib import Path
from collections import Counter

BASE_DIR = Path("dataset/medical_operations_core_v9_100k/medical_operations_core_v9_100k")

tables = [
    "doctor_workload.csv",
    "staff_workload.csv",
    "staff_attendance.csv",
    "nurse_shifts.csv",
    "lab_orders_results.csv",
    "lab_samples.csv",
    "prescriptions.csv",
    "pharmacy_dispensing.csv",
    "medicine_batches.csv",
    "quality_audits.csv",
    "quality_incidents.csv",
    "corrective_actions.csv",
    "patient_feedback.csv",
    "patient_complaints.csv",
    "purchase_orders.csv",
    "supply_chain_purchase_orders.csv",
]

print("=" * 80)
print("      BASELINE DATASET SCHEMA & CATEGORICAL VALUE PROFILING")
print("=" * 80)

profile = {}

for fname in tables:
    p = BASE_DIR / fname
    if not p.exists():
        print(f"[MISSING] {fname}")
        continue
    with open(p, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        if not rows:
            print(f"[EMPTY] {fname}")
            continue

        cols = list(rows[0].keys())
        table_name = fname.replace(".csv", "")
        print(f"\n--- {table_name.upper()} (rows={len(rows)}, cols={len(cols)}) ---")
        print(f"Columns: {', '.join(cols)}")

        # Profile categorical columns (unique count <= 15)
        cat_samples = {}
        for c in cols:
            vals = [r[c] for r in rows if r[c] is not None and r[c] != ""]
            unique_vals = set(vals)
            if 0 < len(unique_vals) <= 15:
                counts = Counter(vals)
                cat_samples[c] = dict(counts)
                print(f"  * {c} ({len(unique_vals)} unique): {dict(counts.most_common(5))}")
            elif "id" in c.lower():
                sample_id = vals[0] if vals else ""
                print(f"  * ID '{c}': sample='{sample_id}', prefix='{sample_id[:3]}'")
            elif "date" in c.lower():
                sample_date = vals[0] if vals else ""
                min_d = min(vals) if vals else ""
                max_d = max(vals) if vals else ""
                print(f"  * Date '{c}': min='{min_d}', max='{max_d}'")

        profile[table_name] = {
            "cols": cols,
            "row_count": len(rows),
            "categoricals": cat_samples
        }

print("\n" + "=" * 80)
