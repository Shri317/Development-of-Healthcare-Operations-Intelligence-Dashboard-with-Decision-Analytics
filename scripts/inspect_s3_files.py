#!/usr/bin/env python3
"""
Inspect live Athena underlying S3 object files via $path.
"""
import urllib.request
import json

base_url = "https://development-of-healthcare-operation.vercel.app"

def run_athena(sql):
    req = urllib.request.Request(
        f"{base_url}/api/athena/execute",
        data=json.dumps({"sqlQuery": sql, "maxResults": 50}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"status": "FAILED", "error": str(e)}

tables = ["admissions", "appointments", "billing", "claims", "emergency_visits", "inventory_transactions"]

print("=" * 80)
print("             UNDERLYING S3 FILES SCANNED BY AMAZON ATHENA")
print("=" * 80)

for t in tables:
    sql = f'SELECT DISTINCT "$path" as file_path FROM "{t}"'
    res = run_athena(sql)
    if res.get("status") == "SUCCEEDED":
        paths = [r.get("file_path") for r in res.get("rows", [])]
        print(f"Table: {t:<24} | {len(paths)} file(s):")
        for p in paths:
            print(f"   * {p}")
    else:
        print(f"Table: {t:<24} | query failed: {res.get('error') or res.get('status')}")
    print()
