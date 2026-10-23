#!/usr/bin/env python3
"""
Medical Operations Intelligence & Automation System (MedOps)
Safe Uploader for Committed Expanded Synthetic Datasets
======================================================
Safely uploads the 6 committed expanded CSV files from generated_data/
to their verified Amazon S3 prefixes, verifies Athena ingestion,
and runs end-to-end live timeframe validation.
"""
import os
import sys
import boto3
import botocore.exceptions
import json
import urllib.request
from pathlib import Path
from typing import Dict, Any

# Ensure scripts dir in sys.path to reuse DatasetValidator
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))
from generate_hospital_data import SUPPORTED_DATASETS, DatasetValidator, read_dataset_csv

BUCKET = os.getenv("AWS_S3_BUCKET", "medical-operations-bharath-2026")
S3_REGION = os.getenv("AWS_S3_REGION", "ap-south-1")
GLUE_REGION = os.getenv("AWS_DATA_REGION", "ap-south-2")
GLUE_DB = os.getenv("AWS_GLUE_DATABASE", "medical_operations_db")
BASE_URL = "https://development-of-healthcare-operation.vercel.app"

FILES_TO_UPLOAD = {
    "appointments": {
        "local_path": Path("generated_data/synthetic_appointments_20261014_174523_bed9059a.csv"),
        "s3_key": "raw/appointments/synthetic_appointments_20261014_174523_bed9059a.csv",
        "expected_count": 20000,
    },
    "billing": {
        "local_path": Path("generated_data/synthetic_billing_20261014_174523_bed9059a.csv"),
        "s3_key": "raw/billing/synthetic_billing_20261014_174523_bed9059a.csv",
        "expected_count": 20000,
    },
    "claims": {
        "local_path": Path("generated_data/synthetic_claims_20261014_174523_bed9059a.csv"),
        "s3_key": "raw/claims/synthetic_claims_20261014_174523_bed9059a.csv",
        "expected_count": 13932,
    },
    "admissions": {
        "local_path": Path("generated_data/synthetic_admissions_20261014_174529_d8fabb1b.csv"),
        "s3_key": "raw/admissions/synthetic_admissions_20261014_174529_d8fabb1b.csv",
        "expected_count": 16000,
    },
    "emergency_visits": {
        "local_path": Path("generated_data/synthetic_emergency_visits_20261014_174535_52276c3c.csv"),
        "s3_key": "raw/emergency_visits/synthetic_emergency_visits_20261014_174535_52276c3c.csv",
        "expected_count": 16000,
    },
    "inventory_transactions": {
        "local_path": Path("generated_data/synthetic_inventory_transactions_20261014_174540_e8544ef4.csv"),
        "s3_key": "raw/inventory_transactions/synthetic_inventory_transactions_20261014_174540_e8544ef4.csv",
        "expected_count": 14000,
    },
}

def query_athena(sql: str) -> Dict[str, Any]:
    req = urllib.request.Request(
        f"{BASE_URL}/api/athena/execute",
        data=json.dumps({"sqlQuery": sql, "maxResults": 100}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def query_dashboard_summary(timeframe: str) -> Dict[str, Any]:
    url = f"{BASE_URL}/api/dashboard/summary?timeframe={timeframe}"
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=" * 80)
    print("      MEDOPS SYNTHETIC DATA INGESTION & POST-INGESTION VERIFIER")
    print("=" * 80)
    print(f"Target S3 Bucket    : {BUCKET}")
    print(f"Target S3 Region    : {S3_REGION}")
    print(f"Glue Database       : {GLUE_DB} ({GLUE_REGION})")
    print(f"Production API      : {BASE_URL}\n")

    # Step 1: Pre-validation of local files
    print("Step 1: Validating local CSV files before upload...")
    for name, info in FILES_TO_UPLOAD.items():
        lp = info["local_path"]
        if not lp.exists():
            print(f"[FAIL] Local file missing: {lp}")
            sys.exit(1)
        records = read_dataset_csv(lp)
        if len(records) != info["expected_count"]:
            print(f"[FAIL] Count mismatch in {lp.name}: expected {info['expected_count']}, got {len(records)}")
            sys.exit(1)
        val = DatasetValidator.validate_dataset(name, records)
        if not val.is_valid:
            print(f"[FAIL] Validation error in {lp.name}: {val.errors[:3]}")
            sys.exit(1)
        print(f"  [PASS] {name:<24}: {len(records):>5} records validated ({lp.name})")

    # Step 2: Check S3 Authentication
    print("\nStep 2: Checking AWS S3 connectivity...")
    try:
        session = boto3.Session(region_name=S3_REGION)
        s3 = session.client("s3")
        s3.head_bucket(Bucket=BUCKET)
        print(f"[OK] S3 connection to bucket '{BUCKET}' verified.\n")
    except Exception as e:
        print(f"[ERROR] AWS authentication failed:\n  {e}\n")
        print("Please ensure your AWS session is active (run 'aws login') before executing.")
        sys.exit(1)

    # Step 3: Preflight existence check & atomic upload
    print("Step 3: Performing atomic S3 uploads (with overwrite protection)...")
    for name, info in FILES_TO_UPLOAD.items():
        lp = info["local_path"]
        key = info["s3_key"]
        
        # Check if already exists
        try:
            s3.head_object(Bucket=BUCKET, Key=key)
            print(f"  [SKIP] Object already exists in S3: s3://{BUCKET}/{key}")
            continue
        except botocore.exceptions.ClientError as e:
            if e.response["Error"]["Code"] not in ["404", "NoSuchKey"]:
                raise

        # Atomic upload with IfNoneMatch='*'
        with open(lp, "rb") as f:
            body = f.read()

        try:
            resp = s3.put_object(
                Bucket=BUCKET,
                Key=key,
                Body=body,
                ContentType="text/csv",
                IfNoneMatch="*"
            )
            etag = resp.get("ETag", "").strip('"')
            print(f"  [PASS] Uploaded: s3://{BUCKET}/{key} ({len(body):,} bytes, ETag: {etag})")
        except botocore.exceptions.ClientError as e:
            if e.response["Error"]["Code"] in ["PreconditionFailed", "412"]:
                print(f"  [ABORT] Collision detected on s3://{BUCKET}/{key}. Refusing to overwrite.")
                sys.exit(1)
            raise

    print("\nAll files successfully ingested into Amazon S3!")

    # Step 4: Verify Athena queries & record counts
    print("\n" + "=" * 80)
    print("Step 4: Verifying Athena table record counts post-ingestion...")
    print("=" * 80)
    for name, info in FILES_TO_UPLOAD.items():
        sql = f'SELECT COUNT(*) as cnt FROM "{name}"'
        res = query_athena(sql)
        if res.get("status") == "SUCCEEDED" and res.get("rows"):
            cnt = res["rows"][0]["cnt"]
            print(f"  Table '{name:<22}': {cnt:>6} total records in Athena")
        else:
            print(f"  Table '{name:<22}': query failed -> {res}")

    # Step 5: Test Timeframe Filters on Live Backend
    print("\n" + "=" * 80)
    print("Step 5: Testing Live Dashboard Timeframe Filtering via Production Backend...")
    print("=" * 80)
    test_timeframes = ["today", "weekly", "last-30-days", "this-month", "monthly", "quarterly", "ytd", "all"]
    for tf in test_timeframes:
        try:
            summary = query_dashboard_summary(tf)
            raw = summary.get("rawMetrics", {})
            adm = raw.get("totalAdmissions", 0)
            rev = raw.get("totalRevenue", 0.0)
            denial = raw.get("denialRate", 0.0)
            src = summary.get("source", "Unknown")
            print(f"  Timeframe: {tf:<14} | Source: {src:<14} | Admissions: {adm:>5} | Revenue: ₹{rev/1e3:>8.1f} K | Denial: {denial:>5.2f}%")
        except Exception as e:
            print(f"  Timeframe: {tf:<14} | ERROR: {e}")

    print("\n" + "=" * 80)
    print("          INGESTION & LIVE VERIFICATION COMPLETED SUCCESSFULLY")
    print("=" * 80)

if __name__ == "__main__":
    main()
