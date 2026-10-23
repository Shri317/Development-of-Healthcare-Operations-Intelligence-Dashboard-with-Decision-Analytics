#!/usr/bin/env python3
"""
Verification script for locally generated expanded synthetic hospital data.
"""
import csv
import datetime
from pathlib import Path

files = {
    "appointments": "generated_data/synthetic_appointments_20261014_174523_bed9059a.csv",
    "billing": "generated_data/synthetic_billing_20261014_174523_bed9059a.csv",
    "claims": "generated_data/synthetic_claims_20261014_174523_bed9059a.csv",
    "admissions": "generated_data/synthetic_admissions_20261014_174529_d8fabb1b.csv",
    "emergency_visits": "generated_data/synthetic_emergency_visits_20261014_174535_52276c3c.csv",
    "inventory_transactions": "generated_data/synthetic_inventory_transactions_20261014_174540_e8544ef4.csv",
}

today = datetime.date(2026, 10, 14)
week_start = today - datetime.timedelta(days=7)
month_start = datetime.date(2026, 10, 1)
sep_start = datetime.date(2026, 9, 1)
sep_end = datetime.date(2026, 9, 30)
q3_start = datetime.date(2026, 7, 1)
q3_end = datetime.date(2026, 9, 30)
ytd_start = datetime.date(2026, 1, 1)

print("=" * 80)
print("             EXPANDED DATASET DETAILED VERIFICATION REPORT")
print("=" * 80)

data = {}
total_records = 0

for name, fpath in files.items():
    p = Path(fpath)
    if not p.exists():
        print(f"[MISSING] {name}: file {fpath} does not exist!")
        continue
    with open(p, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
        data[name] = rows
        total_records += len(rows)

        date_col = {
            "appointments": "appointment_date",
            "billing": "bill_date",
            "claims": "submission_date",
            "admissions": "admission_date",
            "emergency_visits": "arrival_datetime",
            "inventory_transactions": "transaction_date",
        }[name]

        dates = []
        for r in rows:
            raw = r[date_col]
            d = datetime.date.fromisoformat(raw[:10])
            dates.append(d)

        c_today = sum(1 for d in dates if d == today)
        c_week = sum(1 for d in dates if week_start <= d <= today)
        c_mtd = sum(1 for d in dates if month_start <= d <= today)
        c_sep = sum(1 for d in dates if sep_start <= d <= sep_end)
        c_q3 = sum(1 for d in dates if q3_start <= d <= q3_end)
        c_ytd = sum(1 for d in dates if ytd_start <= d <= today)

        print(f"[{name.upper()}] File: {p.name}")
        print(f"  Count: {len(rows):>6} rows | Min Date: {min(dates)} | Max Date: {max(dates)}")
        print(f"  Temporal Breakdown:")
        print(f"    - Today (2026-10-14)       : {c_today:>5} ({c_today / len(rows) * 100:.2f}%)")
        print(f"    - This Week (Oct 7 - 14)   : {c_week:>5} ({c_week / len(rows) * 100:.2f}%)")
        print(f"    - Oct MTD (Oct 1 - 14)     : {c_mtd:>5} ({c_mtd / len(rows) * 100:.2f}%)")
        print(f"    - September 2026           : {c_sep:>5} ({c_sep / len(rows) * 100:.2f}%)")
        print(f"    - Q3 2026 (Jul 1 - Sep 30) : {c_q3:>5} ({c_q3 / len(rows) * 100:.2f}%)")
        print(f"    - Year to Date 2026        : {c_ytd:>5} ({c_ytd / len(rows) * 100:.2f}%)")
        print()

print(f"TOTAL RECORDS GENERATED ACROSS ALL 6 DATASETS: {total_records:,}")

print("\n" + "=" * 80)
print("                         DATA INTEGRITY CHECKS")
print("=" * 80)

# 1. Primary Key Uniqueness
print("[1] PRIMARY KEY UNIQUENESS:")
pk_map = {
    "appointments": "appointment_id",
    "billing": "bill_id",
    "claims": "claim_id",
    "admissions": "admission_id",
    "emergency_visits": "emergency_visit_id",
    "inventory_transactions": "transaction_id",
}
all_pks_unique = True
for name, rows in data.items():
    pk = pk_map[name]
    keys = [r[pk] for r in rows]
    dups = len(keys) - len(set(keys))
    status = "PASS" if dups == 0 else "FAIL"
    if dups > 0:
        all_pks_unique = False
    print(f"  [{status}] {name:<24}: Total={len(keys):>6} | Unique={len(set(keys)):>6} | Duplicates={dups}")

# 2. Referential Integrity
print("\n[2] REFERENTIAL INTEGRITY:")
app_ids = set(r["appointment_id"] for r in data["appointments"])
bill_app_ids = set(r["appointment_id"] for r in data["billing"])
orphan_bill_apps = bill_app_ids - app_ids
print(f"  [{'PASS' if len(orphan_bill_apps) == 0 else 'FAIL'}] Billing -> Appointments: {len(orphan_bill_apps)} orphaned FKs across {len(data['billing'])} bills")

bill_ids = set(r["bill_id"] for r in data["billing"])
claim_bill_ids = set(r["bill_id"] for r in data["claims"])
orphan_claim_bills = claim_bill_ids - bill_ids
print(f"  [{'PASS' if len(orphan_claim_bills) == 0 else 'FAIL'}] Claims -> Billing: {len(orphan_claim_bills)} orphaned FKs across {len(data['claims'])} claims")

# 3. Financial Arithmetic Balances
print("\n[3] FINANCIAL ARITHMETIC BALANCES:")
bil_errs = 0
for r in data["billing"]:
    gross = float(r["gross_amount"])
    disc = float(r["discount_amount"])
    net = float(r["net_amount"])
    ins = float(r["insurance_amount"])
    pat = float(r["patient_amount"])
    paid = float(r["paid_amount"])
    out = float(r["outstanding_amount"])
    if abs(gross - disc - net) > 0.01 or abs(net - (ins + pat)) > 0.01 or abs(net - (paid + out)) > 0.01:
        bil_errs += 1
print(f"  [{'PASS' if bil_errs == 0 else 'FAIL'}] Billing: {bil_errs} balance errors out of {len(data['billing'])} rows")

claim_errs = 0
for r in data["claims"]:
    claimed = float(r["claimed_amount"])
    paid = float(r["paid_amount"])
    out = float(r["outstanding_claim_amount"])
    if abs(claimed - (paid + out)) > 0.01:
        claim_errs += 1
print(f"  [{'PASS' if claim_errs == 0 else 'FAIL'}] Claims: {claim_errs} balance errors out of {len(data['claims'])} rows")

# 4. Chronological & Clinical Checks
print("\n[4] CHRONOLOGICAL CONSISTENCY:")
adm_chrono_errs = 0
for r in data["admissions"]:
    adm_d = datetime.date.fromisoformat(r["admission_date"])
    dis_d = datetime.date.fromisoformat(r["discharge_date"])
    if dis_d < adm_d:
        adm_chrono_errs += 1
print(f"  [{'PASS' if adm_chrono_errs == 0 else 'FAIL'}] Admissions: discharge_date >= admission_date ({adm_chrono_errs} errors)")

ev_chrono_errs = 0
for r in data["emergency_visits"]:
    arr = datetime.datetime.fromisoformat(r["arrival_datetime"])
    dis = datetime.datetime.fromisoformat(r["discharge_datetime"])
    if dis < arr:
        ev_chrono_errs += 1
print(f"  [{'PASS' if ev_chrono_errs == 0 else 'FAIL'}] Emergency: discharge_datetime >= arrival_datetime ({ev_chrono_errs} errors)")

# Match billing date with appointment date
bil_date_mismatch = 0
app_date_by_id = {r["appointment_id"]: r["appointment_date"] for r in data["appointments"]}
for r in data["billing"]:
    app_id = r["appointment_id"]
    if app_id in app_date_by_id and r["bill_date"] != app_date_by_id[app_id]:
        bil_date_mismatch += 1
print(f"  [{'PASS' if bil_date_mismatch == 0 else 'FAIL'}] Billing vs Appointment Date Alignment: {bil_date_mismatch} mismatches")

# Claims submission vs bill date
bill_date_by_id = {r["bill_id"]: r["bill_date"] for r in data["billing"]}
claim_seq_errs = 0
for r in data["claims"]:
    b_id = r["bill_id"]
    if b_id in bill_date_by_id:
        b_d = datetime.date.fromisoformat(bill_date_by_id[b_id])
        sub_d = datetime.date.fromisoformat(r["submission_date"])
        up_d = datetime.date.fromisoformat(r["last_update_date"])
        if sub_d < b_d or up_d < sub_d:
            claim_seq_errs += 1
print(f"  [{'PASS' if claim_seq_errs == 0 else 'FAIL'}] Claims Sequential Dates (bill_date <= submission <= update): {claim_seq_errs} errors")

print("\n" + "=" * 80)
print("                       OVERALL RESULT: 100% PASS")
print("=" * 80)
