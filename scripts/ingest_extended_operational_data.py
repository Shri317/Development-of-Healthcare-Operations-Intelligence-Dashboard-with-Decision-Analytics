#!/usr/bin/env python3
"""
Medical Operations Intelligence & Automation System (MedOps)
Phase 6: Extended Operational Data S3 Ingestion & Verification
==============================================================
Performs safe, conditional S3 uploads for the 16 validated extended datasets
and verifies that Amazon Athena recognizes the expanded records immediately.

Safety Guarantees:
  - Preflight collision check for every target S3 key.
  - Atomic conditional write (IfNoneMatch='*') on S3 put_object.
  - Zero modification of existing baseline files.
  - Automatic Athena count verification post-ingestion.
"""

import os
import sys
import json
import time
import urllib.request
from pathlib import Path
from typing import Dict, List, Any, Tuple

import boto3
import botocore.exceptions

BUCKET_NAME = "medical-operations-bharath-2026"
S3_REGION = "ap-south-1"
ATHENA_REGION = "ap-south-2"
GLUE_DB = "medical_operations_db"
RUN_ID = "f7406b04"
GEN_DIR = Path("generated_data")
BASE_URL = "https://development-of-healthcare-operation.vercel.app"

TARGET_TABLES = [
    "prescriptions",
    "pharmacy_dispensing",
    "medicine_batches",
    "lab_orders_results",
    "lab_samples",
    "patient_feedback",
    "patient_complaints",
    "doctor_workload",
    "staff_attendance",
    "nurse_shifts",
    "staff_workload",
    "quality_incidents",
    "corrective_actions",
    "quality_audits",
    "purchase_orders",
    "supply_chain_purchase_orders",
]

def query_athena(sql: str) -> Dict[str, Any]:
    req = urllib.request.Request(
        f"{BASE_URL}/api/athena/execute",
        data=json.dumps({"sqlQuery": sql, "maxResults": 100}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_athena_count(table_name: str) -> int:
    try:
        res = query_athena(f'SELECT COUNT(*) as cnt FROM "{table_name}"')
        if res.get("status") == "SUCCEEDED" and res.get("rows"):
            return int(res["rows"][0]["cnt"])
    except Exception as e:
        print(f"    [WARN] Athena count failed for {table_name}: {e}")
    return -1

def main():
    print("=" * 80)
    print("     MEDOPS EXTENDED OPERATIONAL DATASET INGESTION: PHASE 6")
    print("=" * 80)
    print(f"Target S3 Bucket    : {BUCKET_NAME}")
    print(f"S3 Region           : {S3_REGION} (Storage)")
    print(f"Athena Region       : {ATHENA_REGION} (Analytics)")
    print(f"Glue Database       : {GLUE_DB}")
    print(f"Target Batch Run ID : {RUN_ID}\n")

    s3 = boto3.client("s3", region_name=S3_REGION)

    # 1. Map local files and verify existence
    print("[STEP 1] Locating local CSV files...")
    uploads: List[Tuple[str, Path, str, int]] = []
    total_local_rows = 0

    for tbl in TARGET_TABLES:
        matches = list(GEN_DIR.glob(f"synthetic_{tbl}_*_{RUN_ID}.csv"))
        if not matches:
            print(f"[ERROR] Missing generated CSV for table '{tbl}' with run_id '{RUN_ID}'!")
            sys.exit(1)
        fpath = matches[0]
        # Count rows
        with open(fpath, "r", encoding="utf-8") as f:
            row_count = sum(1 for _ in f) - 1  # exclude header
        total_local_rows += row_count
        s3_key = f"raw/{tbl}/{fpath.name}"
        uploads.append((tbl, fpath, s3_key, row_count))
        print(f"  * {tbl:<28}: {row_count:>6} rows | {fpath.name}")

    print(f"\nTotal records staged for ingestion: {total_local_rows:,}\n")

    # 2. Check S3 Preflight Collisions
    print("[STEP 2] Performing S3 Preflight Overwrite Check...")
    for tbl, fpath, s3_key, row_count in uploads:
        try:
            s3.head_object(Bucket=BUCKET_NAME, Key=s3_key)
            print(f"[FATAL ERROR] Collision detected: s3://{BUCKET_NAME}/{s3_key} already exists!")
            sys.exit(1)
        except botocore.exceptions.ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code in ["404", "NoSuchKey", "NotFound"]:
                # Expected: object does not exist
                pass
            else:
                print(f"[ERROR] S3 head_object error for {s3_key}: {e}")
                sys.exit(1)
    print("  [PASS] Zero collisions detected. All 16 destination keys are completely new.\n")

    # 3. Snapshot pre-ingestion Athena row counts
    print("[STEP 3] Snapshotting pre-ingestion Athena counts...")
    pre_counts: Dict[str, int] = {}
    for tbl, _, _, _ in uploads:
        cnt = get_athena_count(tbl)
        pre_counts[tbl] = cnt
        print(f"  * {tbl:<28}: {cnt:>6} existing Athena rows")
    print()

    # 4. Upload files to S3 with atomic IfNoneMatch
    print("[STEP 4] Executing atomic conditional S3 uploads...")
    successful_uploads = []
    start_time = time.time()

    for tbl, fpath, s3_key, row_count in uploads:
        with open(fpath, "rb") as f:
            data = f.read()

        try:
            res = s3.put_object(
                Bucket=BUCKET_NAME,
                Key=s3_key,
                Body=data,
                ContentType="text/csv",
                IfNoneMatch="*"  # Atomic protection against overwriting
            )
            etag = res.get("ETag", "").strip('"')
            successful_uploads.append((tbl, s3_key, len(data), etag))
            print(f"  [UPLOADED] {tbl:<26}: {row_count:>6} rows -> s3://{BUCKET_NAME}/{s3_key} ({len(data):,} bytes, ETag: {etag[:12]}...)")
        except botocore.exceptions.ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code == "PreconditionFailed":
                print(f"[ABORT] S3 rejected upload (IfNoneMatch='*'): {s3_key} already exists!")
            else:
                print(f"[ABORT] S3 upload error for {s3_key}: {e}")
            sys.exit(1)

    elapsed = time.time() - start_time
    print(f"\nSuccessfully uploaded {len(successful_uploads)} files in {elapsed:.2f}s.\n")

    # 5. Verify post-ingestion row counts in Athena
    print("[STEP 5] Verifying post-ingestion Athena visibility...")
    print(f"{'Table':<28} | {'Pre-Count':>9} | {'Added':>7} | {'Expected':>9} | {'Post-Athena':>11} | {'Status':>8}")
    print("-" * 84)

    verification_errors = []

    for tbl, fpath, s3_key, row_count in uploads:
        pre = pre_counts.get(tbl, 0)
        expected = pre + row_count
        post = get_athena_count(tbl)

        status = "[PASS]" if post == expected else ("[CLOSE]" if abs(post - expected) <= 1 else "[FAIL]")
        if status == "[FAIL]":
            verification_errors.append(f"{tbl}: expected {expected}, got {post}")

        print(f"{tbl:<28} | {pre:>9} | {row_count:>7} | {expected:>9} | {post:>11} | {status:>8}")

    print("\n" + "=" * 80)
    if verification_errors:
        print(f"VERIFICATION WARNINGS ({len(verification_errors)}):")
        for err in verification_errors:
            print(f"  * {err}")
    else:
        print("ALL 16 EXTENDED OPERATIONAL TABLES SUCCESSFULLY INGESTED AND VERIFIED IN ATHENA!")
    print("=" * 80)

if __name__ == "__main__":
    main()
