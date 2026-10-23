# MedOps Synthetic Hospital Data Generator

A safe, manually executed CLI utility for generating validated synthetic hospital records that strictly conform to the **AWS Glue Data Catalog** and **Amazon Athena** schemas.

---

## 1. Multi-Region AWS Architecture

MedOps Intelligence operates on an intentional multi-region cloud architecture:

| Component | AWS Service | Configured Region | Configuration Variable |
| :--- | :--- | :--- | :--- |
| **Data Lake Storage** | Amazon S3 | **`ap-south-1`** (Mumbai) | `AWS_S3_REGION` (default: `ap-south-1`), `AWS_S3_BUCKET` (`medical-operations-bharath-2026`) |
| **Data Catalog** | AWS Glue | **`ap-south-2`** (Hyderabad) | `AWS_DATA_REGION` (default: `ap-south-2`), `AWS_GLUE_DATABASE` (`medical_operations_db`) |
| **Serverless SQL** | Amazon Athena | **`ap-south-2`** (Hyderabad) | `AWS_DATA_REGION` (default: `ap-south-2`), `AWS_ATHENA_WORKGROUP` (`primary`) |

The standalone generator respects this separation:
* **S3 upload and collision checks** connect exclusively to the S3 bucket in **`ap-south-1`**.
* **Glue table metadata verification** connects exclusively to the Glue Data Catalog in **`ap-south-2`**.
* **Amazon Athena queries** scan files from `ap-south-2` across the S3 data lake.

---

## 2. What the Generator Does

* **Standalone Developer Utility**: A self-contained script (`scripts/generate_hospital_data.py`) executed manually by developers from the command line.
* **Glue Table Location Verification**: Before uploading to S3, the generator queries AWS Glue in `ap-south-2`, reads `StorageDescriptor.Location` for each target dataset, and confirms the destination bucket and prefix match the catalog. If verification fails, the upload aborts immediately (no silent fallbacks).
* **Schema Parity**: Adheres strictly to the column names, column ordering, and data types registered in AWS Glue Data Catalog (`medical_operations_db`) and Amazon Athena.
* **Relational Consistency**: Generates interrelated batches where outpatient appointments link to patient IDs, corresponding billing records reference those appointment IDs, and insurance claims reference eligible billing records.
* **Domain Validation**: Enforces arithmetic balances (e.g., `gross - discount = net`, `net = insurance + patient`, `net = paid + outstanding`), chronological date sequences (discharge after admission), and valid categorical values.
* **Synthetic Identifiers**: Employs distinct synthetic prefixes (`SYN-ADM-*`, `SYN-APP-*`, `SYN-BIL-*`, `SYN-CLM-*`, `SYN-EV-*`, `SYN-TXN-*`, `SYN-PAT-*`) to prevent key collisions with baseline datasets and make synthetic rows immediately identifiable.
* **Three Explicit Modes**:
  * `local`: Generates records and writes CSV files to a separate local directory without any AWS calls or credentials.
  * `validate`: Audits generated CSV files against Glue schemas, data types, and arithmetic formulations.
  * `upload`: Verifies Glue table locations in `ap-south-2`, validates records, presents confirmation plan, checks destination keys via `head_object` in `ap-south-1` to prevent overwrites, and uploads new files to S3.

---

## 3. What the Generator Does NOT Do

* ❌ **NEVER Runs Automatically**: Contains no loops, background daemons, cron schedules, EventBridge rules, or Lambda triggers. Executes only when a developer explicitly runs it.
* ❌ **NEVER Modifies Existing Datasets**: Baseline data in `dataset/medical_operations_core_v9_100k/` is strictly read-only.
* ❌ **NEVER Overwrites Existing S3 Objects**: Enforces a two-tier defense: preflight `head_object` check and atomic `IfNoneMatch='*'` conditional write on S3 `put_object`. If an object key already exists or another writer creates it concurrently, the upload is safely refused without overwrite and never retried unconditionally.
* ❌ **NEVER Silently Falls Back on Verification Failure**: If AWS Glue is unreachable or table locations do not match, upload mode stops immediately.
* ❌ **NEVER Triggers Athena or Glue Crawlers Automatically**: The generator does not run queries or crawler jobs. Athena automatically discovers newly uploaded CSVs in the table folder on subsequent queries.
* ❌ **NEVER Exposes Credentials**: Relies on standard `boto3` authentication (AWS CLI profile, environment variables, or IAM role). Never hardcodes or logs secrets.
* ❌ **NEVER Fabricates Real Patient Information**: Uses purely algorithmic names, codes, and randomized identifiers.
* ❌ **Does NOT Generate Snapshot Tables**: Static state tables like `inventory` (which represents a 1,000-row fixed snapshot of 5 facilities × 200 medicines) are intentionally excluded from append generation to prevent duplicate primary keys in Athena. The transactional equivalent `inventory_transactions` is supported instead.

---

## 4. Required Dependencies

* **Python**: 3.10, 3.12, or 3.14.
* **Standard Library**: `csv`, `json`, `uuid`, `random`, `datetime`, `pathlib`, `argparse`.
* **AWS SDK (`boto3`)**: Required **only** for `--mode upload`. The `local` and `validate` modes run 100% offline with zero cloud dependencies.

To install optional cloud upload dependencies:
```bash
pip install boto3
```

---

## 5. How to Generate Synthetic Data Locally

### Basic Command (All Supported Datasets)
Generates 50 records per dataset (default) and writes CSV files to `generated_data/`:
```bash
python scripts/generate_hospital_data.py --mode local --batch-size 50
```

### Specifying Batch Size
Valid batch sizes range from `1` to `10000`:
```bash
python scripts/generate_hospital_data.py --mode local --batch-size 100
```

### Targeted Datasets
Generate records for specific tables only (comma-separated):
```bash
python scripts/generate_hospital_data.py --mode local --batch-size 50 --datasets admissions,billing,claims
```

### Custom Output Directory & Reproducible Seed
```bash
python scripts/generate_hospital_data.py --mode local --batch-size 25 --output-dir my_test_data --seed 42
```

---

## 6. How to Validate Generated Files

Run the validation engine against any directory of synthetic CSV files to verify schema conformity, data types, and arithmetic integrity:
```bash
python scripts/generate_hospital_data.py --mode validate --input-dir generated_data
```

Example validation output:
```text
======================================================================
     MEDOPS SYNTHETIC HOSPITAL DATA GENERATOR: VALIDATE MODE
======================================================================
Found 6 synthetic file(s) in generated_data

  [PASS] [admissions] synthetic_admissions_20261011_124248_d73a3361.csv: 10 records VALID
  [PASS] [appointments] synthetic_appointments_20261011_124248_d73a3361.csv: 10 records VALID
  [PASS] [billing] synthetic_billing_20261011_124248_d73a3361.csv: 10 records VALID
  [PASS] [claims] synthetic_claims_20261011_124248_d73a3361.csv: 7 records VALID
  [PASS] [emergency_visits] synthetic_emergency_visits_20261011_124248_d73a3361.csv: 10 records VALID
  [PASS] [inventory_transactions] synthetic_inventory_transactions_20261011_124248_d73a3361.csv: 10 records VALID

======================================================================
[SUCCESS] All inspected files passed schema and integrity validation.
```

---

## 7. How to Upload Data Explicitly to Amazon S3

### Interactive Execution (Recommended)
```bash
python scripts/generate_hospital_data.py --mode upload --batch-size 50
```

### Multi-Region CLI Flags:
* `--s3-region`: Target Amazon S3 bucket region (defaults to `AWS_S3_REGION` env or `'ap-south-1'`).
* `--glue-region`: AWS Glue Data Catalog & Amazon Athena region (defaults to `AWS_DATA_REGION` env or `'ap-south-2'`).
* `--glue-database`: AWS Glue database name (defaults to `AWS_GLUE_DATABASE` env or `'medical_operations_db'`).
* `--bucket`: Target S3 bucket name (defaults to `AWS_S3_BUCKET` env or `'medical-operations-bharath-2026'`).
* `--region`: Deprecated alias for `--s3-region`.

### Execution Flow:
1. **Verifies S3 Connectivity**: Connects to the S3 bucket in `ap-south-1`.
2. **Verifies Glue Table Locations**: Connects to AWS Glue in `ap-south-2`, checks table existence and `StorageDescriptor.Location`. If any table is missing or points to an unexpected prefix, execution aborts immediately.
3. **Generates & Validates Data**: Validates all records before staging.
4. **Presents Multi-Region Confirmation Plan**: Displays target bucket, S3 region, Glue region, database, verified destination prefixes, and record counts.
5. **Prompts for Explicit Confirmation**:
   ```text
   Type 'yes' or 'y' to confirm upload to AWS S3:
   ```
   * Typing `no` (or pressing Enter) cancels the operation safely with zero files uploaded.
   * Typing `yes` uploads the files with collision checks.
6. **Collision Protection**: Performs a preflight check via `head_object` in `ap-south-1` and executes an atomic conditional write with `IfNoneMatch='*'`. If an object already exists, the upload is refused without overwrite and never retried unconditionally.

### Automated Testing Bypass (`--yes`)
In non-interactive CI/CD test scripts, use `--yes` to auto-confirm:
```bash
python scripts/generate_hospital_data.py --mode upload --batch-size 5 --datasets admissions --yes
```

---

## 8. Amazon Athena Compatibility Details

### Why This Is Compatible with Athena
1. **Glue Storage Descriptors**: In AWS Glue Data Catalog (`medical_operations_db` in `ap-south-2`), table locations point to folder prefixes in S3 (`ap-south-1`):
   * `admissions` → `s3://medical-operations-bharath-2026/raw/admissions/`
   * `billing` → `s3://medical-operations-bharath-2026/raw/billing/`
2. **Multi-File Scans**: When Athena executes `SELECT * FROM "admissions"` in `ap-south-2`, the Presto/Trino distributed query engine scans **all valid CSV files** under the prefix `raw/admissions/` in the S3 bucket (`ap-south-1`).
3. **Header Serialization**: Glue tables are configured with `skip.header.line.count: "1"`. The generator produces a single header line with exact matching column names.
4. **Data Type Preservation**: Doubles/floats (e.g. `length_of_stay_days`, `gross_amount`) and BigInts (e.g. `wait_time_minutes`, `quantity`) match the Glue column types.
5. **Unique File Naming**: Each upload uses the pattern:
   ```text
   synthetic_{dataset}_{timestamp}_{run_id}.csv
   ```
   This ensures new files never collide with or overwrite the baseline dataset (`{dataset}.csv`).

---

## 9. Supported Datasets Summary

| Dataset | Glue S3 Location | Key Identifier Format | Notes |
| :--- | :--- | :--- | :--- |
| **`admissions`** | `raw/admissions/` | `SYN-ADM-{run_id}-{seq}` | Validated admission/discharge dates, LOS, and facility beds. |
| **`appointments`** | `raw/appointments/` | `SYN-APP-{run_id}-{seq}` | Outpatient consultations linked to valid facility doctors. |
| **`billing`** | `raw/billing/` | `SYN-BIL-{run_id}-{seq}` | Strict financial arithmetic (`gross - disc = net`, payment balances). |
| **`claims`** | `raw/claims/` | `SYN-CLM-{run_id}-{seq}` | Linked to insured billing records; validated payer denial reasons. |
| **`emergency_visits`** | `raw/emergency_visits/` | `SYN-EV-{run_id}-{seq}` | ER triage levels (1-5), complaints, wait and treatment durations. |
| **`inventory_transactions`** | `raw/inventory_transactions/` | `SYN-TXN-{run_id}-{seq}` | Transactional stock movements (Dispense, Purchase, Return). |

> **Omitted Dataset (`inventory`)**: The `inventory.csv` table is a static master snapshot table (5 facilities × 200 medicines = 1,000 rows). Appending new CSVs directly to `raw/inventory/` would introduce duplicate `(facility_id, medicine_id)` keys in Athena queries. Use `inventory_transactions` instead.

---

## 10. Troubleshooting Common Errors

### Error: `AWS credentials not found`
* **Cause**: Running `--mode upload` without active AWS credentials in your environment.
* **Resolution**: Run `aws configure` or `aws sso login` to initialize credentials, or set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. Local generation (`--mode local`) does not require credentials.

### Error: `Upload stopped. Destination location could not be verified against AWS Glue Data Catalog`
* **Cause**: The target table does not exist in AWS Glue Data Catalog, or its `StorageDescriptor.Location` in Glue does not match the target bucket/prefix.
* **Resolution**: Verify that AWS Glue database `medical_operations_db` exists in `ap-south-2` and that table definitions point to `s3://medical-operations-bharath-2026/raw/{table}/`.

### Error: `DESTINATION COLLISION REFUSED` or `CONDITIONAL WRITE COLLISION REFUSED`
* **Cause**: An S3 object with the exact same key already exists in the bucket (detected during preflight `head_object` or rejected atomically by S3 via `IfNoneMatch='*'`).
* **Resolution**: This safeguard prevents accidental data overwrites and eliminates TOCTOU race conditions. Wait 1 second and re-run to generate a new timestamp, or provide a unique run identifier.

### Error: `Invalid --batch-size`
* **Cause**: Passing a batch size less than `1` or greater than `10000`.
* **Resolution**: Provide a batch size within the allowed range (e.g. `--batch-size 100`).

---

## 11. Verification That the Generator Is Not Running Automatically

To verify that the generator is completely isolated from the application runtime:
1. **FastAPI Backend Check**: Inspect `backend/app/main.py`. The generator is not imported, referenced, or registered as a route, middleware, or startup event handler.
2. **Frontend Check**: Inspect `src/components/`. There are no UI buttons or triggers for data generation.
3. **Cloud Infrastructure Check**: No EventBridge rules, Lambda functions, or cron jobs invoke `scripts/generate_hospital_data.py`.
4. **Execution Log**: Generation occurs only upon explicit manual execution in the terminal.

---

## 12. Running Unit Tests

Run the comprehensive unit test suite (mocks all AWS calls, runs 100% locally):
```bash
python scripts/test_generate_hospital_data.py
```
Or via standard unittest discovery:
```bash
python -m unittest scripts/test_generate_hospital_data.py
```
