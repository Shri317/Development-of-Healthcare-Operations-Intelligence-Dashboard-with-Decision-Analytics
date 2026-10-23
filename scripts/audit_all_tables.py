#!/usr/bin/env python3
"""
Audits all registered AWS Glue tables and queries Athena counts and schemas.
"""
import urllib.request
import json
import time

base_url = "https://development-of-healthcare-operation.vercel.app"
glue_url = f"{base_url}/api/glue/tables"

with urllib.request.urlopen(glue_url) as resp:
    glue_data = json.loads(resp.read().decode("utf-8"))

tables = glue_data.get("tables", [])
print(f"Total tables registered in AWS Glue Data Catalog: {len(tables)}\n")

def query_athena(sql):
    req = urllib.request.Request(
        f"{base_url}/api/athena/execute",
        data=json.dumps({"sqlQuery": sql, "maxResults": 100}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

table_info = {}
for t in sorted(tables, key=lambda x: x["name"]):
    name = t["name"]
    s3_loc = t.get("s3Location")
    cols = t.get("cols", [])
    
    # Query Athena count
    try:
        res = query_athena(f'SELECT COUNT(*) as cnt FROM "{name}"')
        if res.get("status") == "SUCCEEDED" and res.get("rows"):
            cnt = res["rows"][0]["cnt"]
        else:
            cnt = f"ERR: {res.get('error') or res.get('status')}"
    except Exception as e:
        cnt = f"EXC: {e}"
        
    print(f"Table: {name:<32} | Athena Rows: {str(cnt):>8} | Cols: {len(cols):>2} | S3: {s3_loc}")
    table_info[name] = {
        "s3_location": s3_loc,
        "cols": cols,
        "athena_rows": cnt
    }

with open("scripts/audit_table_info.json", "w", encoding="utf-8") as f:
    json.dump(table_info, f, indent=2)

print("\nAudit saved to scripts/audit_table_info.json")
