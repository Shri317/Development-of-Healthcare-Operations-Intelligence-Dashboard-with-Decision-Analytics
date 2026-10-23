import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Database, 
  Play, 
  Search, 
  CheckCircle2, 
  RefreshCw, 
  Table as TableIcon, 
  Sparkles, 
  Terminal, 
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Clock,
  Layers,
  FileText
} from 'lucide-react';
import { 
  fetchGlueTables, 
  executeAthenaQuery, 
  fetchHealthStatus,
  type GlueTableSummary, 
  type AthenaQueryResult,
  type HealthStatus
} from '../../services/apiService';

interface AWSCloudServicesHubProps {
  onExecuteAction: (actionId: string, payload?: any) => void;
}

export const AWSCloudServicesHub: React.FC<AWSCloudServicesHubProps> = ({ onExecuteAction }) => {
  // Backend & Connection Status State
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // AWS Glue Catalog Tables State
  const [glueTables, setGlueTables] = useState<GlueTableSummary[]>([]);
  const [tableCount, setTableCount] = useState<number>(0);
  const [databaseName, setDatabaseName] = useState<string>('medical_operations_db');
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(true);
  const [tableFetchError, setTableFetchError] = useState<string | null>(null);

  // Selection & Athena Query States
  const [selectedTable, setSelectedTable] = useState<string>('admissions');
  const [querySql, setQuerySql] = useState<string>('SELECT * FROM "medical_operations_db"."admissions" LIMIT 10;');
  const [isExecutingQuery, setIsExecutingQuery] = useState<boolean>(false);
  const [athenaResult, setAthenaResult] = useState<AthenaQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');

  const PRESET_QUERIES = [
    {
      label: 'Top 10 Hospital Admissions with Length of Stay',
      sql: 'SELECT admission_id, patient_id, facility_id, admission_type, length_of_stay_days FROM "medical_operations_db"."admissions" ORDER BY length_of_stay_days DESC LIMIT 10;'
    },
    {
      label: 'Total Revenue & Paid Amount by Facility',
      sql: 'SELECT facility_id, SUM(net_amount) as total_net_revenue, SUM(paid_amount) as total_paid FROM "medical_operations_db"."billing" GROUP BY facility_id;'
    },
    {
      label: 'Claim Denial Rate & Reasons Breakdown',
      sql: 'SELECT denial_reason, COUNT(*) as claim_count, SUM(claimed_amount) as denied_amount FROM "medical_operations_db"."claims" WHERE claim_status = \'Denied\' GROUP BY denial_reason ORDER BY claim_count DESC;'
    },
    {
      label: 'Emergency Department Wait Time Summary',
      sql: 'SELECT facility_id, AVG(waiting_time_minutes) as avg_wait_time, COUNT(*) as total_emergency_visits FROM "medical_operations_db"."emergency_visits" GROUP BY facility_id;'
    },
    {
      label: 'Doctor Workload & Utilization Leaderboard',
      sql: 'SELECT doctor_id, facility_id, AVG(utilization_pct) as avg_utilization, SUM(appointments_handled) as total_appointments FROM "medical_operations_db"."doctor_workload" GROUP BY doctor_id, facility_id ORDER BY avg_utilization DESC LIMIT 10;'
    }
  ];

  // Load Data Catalog & Health Status
  const loadCatalogData = async () => {
    setIsVerifying(true);
    setIsLoadingTables(true);
    setConnectionError(null);
    setTableFetchError(null);

    try {
      const hStatus = await fetchHealthStatus();
      setHealth(hStatus);

      const catalogRes = await fetchGlueTables();
      setDatabaseName(catalogRes.database);
      setTableCount(catalogRes.tableCount);
      setGlueTables(catalogRes.tables);

      if (catalogRes.tables && catalogRes.tables.length > 0) {
        const firstT = catalogRes.tables[0].name;
        setSelectedTable(firstT);
        setQuerySql(`SELECT * FROM "${catalogRes.database}"."${firstT}" LIMIT 10;`);
      }
    } catch (err: any) {
      console.error('Catalog fetch error:', err);
      const msg = err.message || 'Failed to connect to AWS Glue Catalog via Backend';
      setConnectionError(msg);
      setTableFetchError(msg);
    } finally {
      setIsVerifying(false);
      setIsLoadingTables(false);
    }
  };

  useEffect(() => {
    loadCatalogData();
  }, []);

  const handleSelectTable = (tblName: string) => {
    setSelectedTable(tblName);
    setQuerySql(`SELECT * FROM "${databaseName}"."${tblName}" LIMIT 10;`);
  };

  const handleExecuteQuery = async (overrideSql?: string) => {
    const targetSql = overrideSql || querySql;
    if (!targetSql.trim()) return;

    setIsExecutingQuery(true);
    setAthenaResult(null);
    setQueryError(null);

    try {
      const result = await executeAthenaQuery(targetSql, 100);
      setAthenaResult(result);
      if (result.status === 'FAILED') {
        setQueryError(result.errorMessage || 'AWS Athena Query Failed Execution');
      } else {
        onExecuteAction('run-athena-query', { queryExecutionId: result.queryExecutionId });
      }
    } catch (err: any) {
      console.error('Athena Execution Error:', err);
      setQueryError(err.message || 'Error communicating with AWS Athena Engine');
    } finally {
      setIsExecutingQuery(false);
    }
  };

  const filteredTables = glueTables.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedTableObj = glueTables.find((t) => t.name === selectedTable);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Cloud className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              AWS Cloud Infrastructure Hub
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full">
              Region: {health?.region || 'ap-south-1'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real AWS Integration: Amazon Athena Engine, AWS Glue Data Catalog (<span className="font-mono text-cyan-400">{databaseName}</span>), S3 Bucket (<span className="font-mono text-cyan-400">{health?.s3Bucket}</span>)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadCatalogData}
            disabled={isVerifying}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>Sync AWS Catalog</span>
          </button>
        </div>
      </div>

      {/* Backend & AWS Status Banner */}
      {connectionError ? (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-bold">AWS Connectivity Error</p>
              <p className="text-rose-300/80 mt-0.5">{connectionError}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-rose-900/60 border border-rose-700 rounded-lg font-mono font-bold text-[11px]">
            DISCONNECTED / ERROR
          </span>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center">
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-slate-400 font-medium text-[11px]">AWS Glue Catalog</p>
              <p className="text-white font-bold">{databaseName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-800 flex items-center justify-center">
              <Layers className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <p className="text-slate-400 font-medium text-[11px]">Glue Catalog Tables</p>
              <p className="text-white font-bold">{tableCount > 0 ? `${tableCount} Tables` : 'Catalog Loaded'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-slate-400 font-medium text-[11px]">Amazon Athena</p>
              <p className="text-emerald-400 font-bold">Workgroup: {health?.athenaWorkgroup || 'primary'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-slate-400 font-medium text-[11px]">Security Mode</p>
              <p className="text-amber-300 font-bold">Backend Proxy (No Frontend Keys)</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Glue Catalog Explorer & Athena SQL Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AWS Glue Data Catalog Table Explorer */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">AWS Glue Data Catalog</h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-950 text-cyan-400 border border-slate-800 rounded-md">
              {filteredTables.length} Tables
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search catalog tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Tables List */}
          <div className="flex-1 max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
            {isLoadingTables ? (
              <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                Fetching catalog schema from AWS Glue...
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No tables found matching "{searchTerm}"
              </div>
            ) : (
              filteredTables.map((t) => (
                <div
                  key={t.name}
                  onClick={() => handleSelectTable(t.name)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    selectedTable === t.name
                      ? 'bg-cyan-950/70 border-cyan-500/60 text-white font-semibold shadow-md shadow-cyan-950/30'
                      : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <TableIcon className={`w-4 h-4 flex-shrink-0 ${selectedTable === t.name ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="truncate">{t.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{t.cols.length} cols</span>
                </div>
              ))
            )}
          </div>

          {/* Table Schema Inspector Panel */}
          {selectedTableObj && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300">Schema: {selectedTableObj.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{selectedTableObj.records} rows</span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 truncate" title={selectedTableObj.s3Location}>
                {selectedTableObj.s3Location}
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 pt-1 border-t border-slate-800/60">
                {selectedTableObj.cols.map((col, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-300">{col.name}</span>
                    <span className="text-cyan-400/80 text-[10px]">{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Amazon Athena Query Editor & Execution Output */}
        <div className="lg:col-span-8 space-y-6">
          {/* SQL Query Editor Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Amazon Athena SQL Query Console</h3>
              </div>

              {/* Preset Query Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Presets:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleExecuteQuery(e.target.value);
                  }}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-1 outline-none focus:border-cyan-500 cursor-pointer max-w-[280px] truncate"
                >
                  <option value="">-- Select Preset Query --</option>
                  {PRESET_QUERIES.map((pq, idx) => (
                    <option key={idx} value={pq.sql}>
                      {pq.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Code Mirror / Textarea Editor */}
            <div className="relative font-mono text-xs">
              <textarea
                rows={5}
                value={querySql}
                onChange={(e) => setQuerySql(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-cyan-300 outline-none focus:border-cyan-500 transition leading-relaxed resize-none"
                placeholder="Enter SQL query..."
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-500 font-mono">
                Workgroup: <span className="text-slate-400">{health?.athenaWorkgroup || 'primary'}</span> | Output: <span className="text-slate-400">{health?.s3Bucket}/athena-query-results/</span>
              </p>
              <button
                onClick={() => handleExecuteQuery()}
                disabled={isExecutingQuery || !querySql.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition disabled:opacity-50 shadow-lg shadow-cyan-950/50"
              >
                {isExecutingQuery ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing on Athena...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Execute Athena Query</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Athena Query Results & Metrics Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Execution Results</h3>
              </div>

              {athenaResult && (
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${
                    athenaResult.status === 'SUCCEEDED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {athenaResult.status}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-400" /> {athenaResult.executionTimeMs} ms
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5 text-cyan-400" /> {athenaResult.dataScannedMb} MB scanned
                  </span>
                </div>
              )}
            </div>

            {queryError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Athena Execution Error</p>
                  <p className="font-mono text-[11px] mt-0.5 text-rose-300/80">{queryError}</p>
                </div>
              </div>
            )}

            {!athenaResult && !isExecutingQuery && !queryError && (
              <div className="py-12 text-center text-xs text-slate-500">
                Execute a query or select a preset to view live records from Amazon Athena.
              </div>
            )}

            {isExecutingQuery && (
              <div className="py-12 text-center text-xs text-cyan-400 flex flex-col items-center gap-2 animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <span>Submitting job to AWS Athena engine and fetching live result set...</span>
              </div>
            )}

            {athenaResult && athenaResult.status === 'SUCCEEDED' && (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      {athenaResult.columns.map((col: string, idx: number) => (
                        <th key={idx} className="p-2.5 font-semibold font-mono text-[11px] uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                    {athenaResult.rows.length === 0 ? (
                      <tr>
                        <td colSpan={athenaResult.columns.length || 1} className="py-8 text-center text-slate-500 font-sans">
                          Query returned 0 records.
                        </td>
                      </tr>
                    ) : (
                      athenaResult.rows.map((row: Record<string, any>, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-950/80 transition">
                          {athenaResult.columns.map((col: string, cIdx: number) => (
                            <td key={cIdx} className="p-2.5 whitespace-nowrap">
                              {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-600">NULL</span>}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
