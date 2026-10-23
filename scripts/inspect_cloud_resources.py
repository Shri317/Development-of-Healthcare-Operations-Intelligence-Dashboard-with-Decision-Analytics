#!/usr/bin/env python3
"""
Inspect live AWS Glue tables, Athena execution, and existing S3 dataset configuration.
"""
import urllib.request
import json

base_url = "https://development-of-healthcare-operation.vercel.app"

# 1. Fetch Glue Tables
glue_url = f"{base_url}/api/glue/tables"
try:
    with urllib.request.urlopen(glue_url) as resp:
        glue_data = json.loads(resp.read().decode("utf-8"))
except Exception as e:
    print(f"Error fetching Glue tables: {e}")
    glue_data = {}

target_tables = ["admissions", "appointments", "billing", "claims", "emergency_visits", "inventory_transactions"]
tables = {t["name"]: t for t in glue_data.get("tables", [])}

print("=" * 80)
print("              AWS GLUE DATA CATALOG CONFIGURATION (ap-south-2)")
print("=" * 80)
for name in target_tables:
    t = tables.get(name)
    if t:
        print(f"Table: {name}")
        print(f"  S3 Location : {t.get('s3Location')}")
        cols = t.get("cols", [])
        col_summary = [f"{c['name']}:{c['type']}" for c in cols]
        print(f"  Columns ({len(cols)}): {', '.join(col_summary)}")
    else:
        print(f"Table: {name} NOT FOUND in Glue!")
    print()

# 2. Check Record Counts in Athena
print("=" * 80)
print("                   CURRENT ATHENA TABLE COUNTS & DATES")
print("=" * 80)

def run_athena_query(sql):
    url = f"{base_url}/api/athena/execute"
    payload = json.dumps({"sqlQuery": sql, "maxResults": 100}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"status": "FAILED", "error": str(e)}

date_cols = {
    "admissions": "admission_date",
    "appointments": "appointment_date",
    "billing": "bill_date",
    "claims": "submission_date",
    "emergency_visits": "arrival_datetime",
    "inventory_transactions": "transaction_date",
}

for name in target_tables:
    d_col = date_cols[name]
    sql = f'SELECT COUNT(*) as row_count, MIN({d_col}) as min_date, MAX({d_col}) as max_date FROM "{name}"'
    res = run_athena_query(sql)
    if res.get("status") == "SUCCEEDED" and res.get("rows"):
        row = res["rows"][0]
        print(f"Table: {name:<24} | Current Count: {row.get('row_count'):>6} | Min: {row.get('min_date')} | Max: {row.get('max_date')}")
    else:
        print(f"Table: {name:<24} | Query failed: {res.get('error') or res.get('status')}")

print("\n" + "=" * 80)
