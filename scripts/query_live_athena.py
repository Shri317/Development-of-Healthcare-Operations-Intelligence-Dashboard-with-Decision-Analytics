import urllib.request
import json

base_url = 'https://development-of-healthcare-operation.vercel.app'
exec_url = f'{base_url}/api/athena/execute'
headers = {'Content-Type': 'application/json'}

queries = [
    ("appointments (bed9059a)", "SELECT COUNT(*) as cnt FROM \"appointments\" WHERE appointment_id LIKE 'SYN-APP-bed9059a-%'"),
    ("admissions (d8fabb1b)", "SELECT COUNT(*) as cnt FROM \"admissions\" WHERE admission_id LIKE 'SYN-ADM-d8fabb1b-%'"),
    ("doctors", "SELECT COUNT(*) as cnt FROM \"doctors\""),
    ("staff", "SELECT COUNT(*) as cnt FROM \"staff\""),
    ("medicines", "SELECT COUNT(*) as cnt FROM \"medicines\""),
    ("lab_tests", "SELECT COUNT(*) as cnt FROM \"lab_tests\""),
    ("vendors", "SELECT COUNT(*) as cnt FROM \"vendors\""),
    ("facilities", "SELECT COUNT(*) as cnt FROM \"facilities\""),
    ("departments", "SELECT COUNT(*) as cnt FROM \"departments\""),
]

for label, q in queries:
    payload = json.dumps({"sqlQuery": q, "maxResults": 100}).encode('utf-8')
    req = urllib.request.Request(exec_url, data=payload, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            rows = data.get('rows', [])
            cnt = rows[0].get('cnt') if rows else 'N/A'
            status = data.get('status')
            print(f"  [LIVE ATHENA] {label:<28}: {cnt:>6} rows (Status: {status})")
    except Exception as e:
        print(f"  [FAIL] {label}: {e}")
