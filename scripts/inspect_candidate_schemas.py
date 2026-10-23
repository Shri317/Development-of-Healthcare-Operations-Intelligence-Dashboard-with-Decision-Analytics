#!/usr/bin/env python3
import json

with open("scripts/audit_table_info.json", "r") as f:
    info = json.load(f)

modules = {
    "A. Doctor & Staff Intelligence": ["doctors", "staff", "doctor_workload", "staff_workload", "staff_attendance", "nurse_shifts"],
    "B. Laboratory & Diagnostics": ["lab_tests", "lab_equipment", "lab_orders_results", "lab_samples"],
    "C. Pharmacy & Inventory": ["medicines", "medicine_batches", "inventory", "prescriptions", "pharmacy_dispensing"],
    "D. Quality & Compliance": ["quality_audits", "quality_incidents", "corrective_actions"],
    "E. Patient Experience": ["patient_feedback", "patient_complaints"],
    "F. Supply Chain & Vendors": ["vendors", "vendor_performance", "purchase_orders", "supply_chain_purchase_orders"]
}

for mod, tbls in modules.items():
    print("=" * 80)
    print(f"MODULE: {mod}")
    print("=" * 80)
    for t in tbls:
        d = info.get(t, {})
        cols = [f"{c['name']} ({c['type']})" for c in d.get("cols", [])]
        rows = d.get("athena_rows")
        s3 = d.get("s3_location")
        print(f"Table: {t} [Athena Rows: {rows}]")
        print(f"  S3: {s3}")
        print(f"  Cols ({len(cols)}): {', '.join(cols)}")
        print()
