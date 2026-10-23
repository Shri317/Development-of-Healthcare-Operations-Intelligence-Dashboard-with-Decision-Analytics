# Resilient 4-Tier Data Retrieval Hierarchy

This diagram visualizes the unified data retrieval pipeline implemented in `backend/app/services/dashboard_service.py` via `_load_table(table_name)`.

```mermaid
flowchart TD
    %% SUBGRAPH: CALLER
    subgraph INVOCATION["1. ANALYTICAL FUNCTION REQUEST"]
        ServiceFunc["Analytics Function requests table:<br/>e.g. _load_table('billing') or _load_table('admissions')"]
    end

    %% SUBGRAPH: TIER 1 CACHE
    subgraph TIER_1_CACHE["2. TIER 1: IN-MEMORY CACHE"]
        CheckCache{"table_name in _TABLE_CACHE?<br/>and now - cache_time < 300s?"}
        CacheHit["Cache Hit:<br/>Return cached_df.copy()<br/>(Latency: < 1ms)"]
    end

    %% SUBGRAPH: TIER 2 ATHENA
    subgraph TIER_2_ATHENA["3. TIER 2: AMAZON ATHENA SERVERLESS SQL (Primary Cloud)"]
        QueryAthena["execute_athena_query('SELECT * FROM table_name')<br/>(backend/app/aws/athena.py)"]
        AthenaStart["client.start_query_execution()<br/>Database: medical_operations_db<br/>OutputLocation: s3://medical-operations-athena-results-bharath-2026/"]
        AthenaPoll["Adaptive Polling (250ms -> 1000ms)<br/>client.get_query_execution()"]
        AthenaStatus{"Query State?"}
        AthenaFetch["client.get_query_results()<br/>Paginate through NextToken"]
        CheckGenericCols{"Generic headers?<br/>(cols start with 'col0..colN')"}
        FixHeaders["Reassign row[0] as real column headers<br/>Slice data_rows = rows[1:]"]
        ParseRows["Parse typed row values<br/>(Ints, Floats, Booleans, Strings)"]
    end

    %% SUBGRAPH: TIER 3 S3 DIRECT
    subgraph TIER_3_S3["4. TIER 3: DIRECT S3 BUCKET READ (Cloud Resiliency Fail-Safe)"]
        DirectS3Call["s3.get_object(<br/>Bucket='medical-operations-bharath-2026',<br/>Key='raw/{table_name}/{table_name}.csv'<br/>)"]
        ReadS3Bytes["pd.read_csv(io.BytesIO(obj['Body'].read()))"]
        S3Success{"S3 read succeeded?"}
    end

    %% SUBGRAPH: TIER 4 LOCAL CSV
    subgraph TIER_4_LOCAL["5. TIER 4: LOCAL CSV DATASET (Local Dev Fallback)"]
        CheckLocalPath{"DATASET_PATH exists on disk?<br/>(dataset/.../medical_operations_core_v9_100k)"}
        ReadLocalCSV["pd.read_csv(DATASET_PATH / '{table_name}.csv')"]
        LocalSuccess{"Local file read succeeded?"}
    end

    %% SUBGRAPH: TIER 5 EMPTY DF
    subgraph TIER_5_EMPTY["6. TIER 5: CLEAN EMPTY DATAFRAME FALLBACK"]
        EmptyDF["Return pd.DataFrame()<br/>Prevents HTTP 500 crashes / FileNotFoundError"]
    end

    %% SUBGRAPH: CLEANING & CACHING
    subgraph CLEAN_AND_CACHE["7. DATA CLEANING & CACHE WRITE"]
        CleanTypes["_clean_df_types(df):<br/>• Protect IDs, dates, names, codes<br/>• Strip $, ₹, commas from numeric metrics<br/>• Convert numbers with pd.to_numeric()"]
        WriteCache["Write to _TABLE_CACHE[table_name] = (time.time(), df.copy())<br/>TTL: 300 seconds"]
        ReturnDF["Return sanitized DataFrame to caller"]
    end

    %% CONNECTIONS
    ServiceFunc --> CheckCache
    CheckCache -- "Cache Hit" --> CacheHit
    CheckCache -- "Cache Miss" --> QueryAthena

    QueryAthena --> AthenaStart
    AthenaStart --> AthenaPoll
    AthenaPoll --> AthenaStatus

    AthenaStatus -- "SUCCEEDED" --> AthenaFetch
    AthenaFetch --> CheckGenericCols
    CheckGenericCols -- "Yes (Header in Row 0)" --> FixHeaders --> ParseRows
    CheckGenericCols -- "No (Standard Columns)" --> ParseRows
    ParseRows --> CleanTypes

    AthenaStatus -- "FAILED / CANCELLED / TIMEOUT" --> DirectS3Call

    DirectS3Call --> ReadS3Bytes
    ReadS3Bytes --> S3Success
    S3Success -- "Success" --> CleanTypes
    S3Success -- "Error / Unavailable" --> CheckLocalPath

    CheckLocalPath -- "Yes (Local Machine)" --> ReadLocalCSV
    ReadLocalCSV --> LocalSuccess
    LocalSuccess -- "Success" --> CleanTypes
    LocalSuccess -- "Failed" --> EmptyDF

    CheckLocalPath -- "No (Cloud Environment)" --> EmptyDF
    EmptyDF --> ReturnDF

    CleanTypes --> WriteCache
    WriteCache --> ReturnDF
```

---

## 📋 Execution Summary

* **In-Memory Cache (Tier 1)**: Eliminates duplicate queries within 300 seconds, maintaining low dashboard latency.
* **Amazon Athena (Tier 2)**: Executes ANSI SQL queries against the AWS Glue Data Catalog (`medical_operations_db`), polling execution status with adaptive backoff.
* **Generic Column Auto-Fix**: Automatically detects and rectifies Glue table anomalies where headers were indexed as `col0`, `col1`, promoting the first row to header names.
* **Direct S3 Read (Tier 3)**: Bypasses Athena to stream CSV bytes directly from `s3://medical-operations-bharath-2026/raw/` if query workgroups encounter rate limits.
* **Local CSV (Tier 4)**: Enables complete offline development without active AWS credentials if the dataset directory is present.
* **Zero 500 Errors (Tier 5)**: Never throws `FileNotFoundError`; returns an empty DataFrame so the frontend displays a clean "No Records Found" state instead of crashing.
* **Protected Type Cleaning**: Prevents identifier corruption (e.g., `FAC001` or `claim_id`) by shielding protected column names while converting numeric currency values.
