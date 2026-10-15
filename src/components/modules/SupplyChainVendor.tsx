import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  DollarSign, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Star,
  Clock,
  PackageCheck
} from 'lucide-react';
import { 
  fetchSupplyChainVendors, 
  type SupplyChainResponse, 
  type VendorRecord 
} from '../../services/apiService';

interface SupplyChainVendorProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction?: (actionId: string, payload?: any) => void;
}

export const SupplyChainVendor: React.FC<SupplyChainVendorProps> = ({ 
  selectedFacility = 'all',
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [data, setData] = useState<SupplyChainResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchSupplyChainVendors(selectedFacility, selectedTimeframe)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load supply chain vendors:', err);
        setError(err.message || 'Failed to fetch supply chain vendor data from backend API');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [selectedFacility, selectedTimeframe]);

  const kpis = data?.kpis;
  const vendors = data?.vendors || [];
  const dataSource = loading ? 'Connecting to Amazon Athena...' : (data?.source || 'Local Fallback');

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch = 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendorId.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRisk = 
      selectedRiskFilter === 'all' || 
      v.riskLevel.toLowerCase() === selectedRiskFilter.toLowerCase();

    return matchesSearch && matchesRisk;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-400" /> Supply Chain & Vendor Management
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-slate-950 text-cyan-400 border border-slate-800 rounded-md">
              Data Source: {dataSource}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Vendor scorecards, active purchase orders, lead times, and SLA compliance calculated from dataset
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Vendors</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-sm animate-pulse space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
          <p>Loading supply chain vendor analytics from Amazon Athena...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-2xl text-rose-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-bold">Supply Chain Data Error</p>
              <p className="text-rose-300/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-white font-semibold rounded-xl transition"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Dashboard */}
      {!loading && !error && data && (
        <>
          {/* Summary KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Vendors Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Real Suppliers
              </span>
              <div className="text-2xl font-bold text-white font-mono">
                {kpis?.totalVendors || 0}
              </div>
              <p className="text-[10px] text-emerald-400 font-semibold">
                {kpis?.compliantVendors || 0} Low Risk Compliant
              </p>
            </div>

            {/* On-Time Delivery Rate Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Avg On-Time Delivery %
              </span>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {kpis?.avgOnTimeDeliveryPct ?? 0}%
              </div>
              <p className="text-[10px] text-teal-400 font-semibold">
                Avg Quality Score: {kpis?.avgQualityScore ?? 0}%
              </p>
            </div>

            {/* Total Active Purchase Orders Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Purchase Orders Value
              </span>
              <div className="text-2xl font-bold text-cyan-400 font-mono">
                {kpis?.totalPOValueFormatted || '₹0.00'}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {kpis?.totalPOCount || 0} Active Orders Processed
              </p>
            </div>

            {/* Defect / Damage Rate Card (Not available from dataset) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1 opacity-80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Defect / Damage Rate
              </span>
              <div className="text-sm font-bold text-slate-400 font-mono py-1.5">
                {kpis?.defectRateFormatted || 'Not available from dataset'}
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Quality Defect Metric: N/A (Not in dataset)
              </p>
            </div>
          </div>

          {/* Active Supplier Performance Scorecards Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-cyan-400" /> Active Supplier Performance Scorecards
                </h3>
                <p className="text-xs text-slate-400">
                  Real vendor catalog loaded from vendor_performance.csv & purchase_orders.csv
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search vendor or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500 w-48"
                  />
                </div>

                <select
                  value={selectedRiskFilter}
                  onChange={(e) => setSelectedRiskFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-1 outline-none cursor-pointer"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3">Supplier Name & ID</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Rating</th>
                    <th className="py-3 px-3">On-Time Delivery %</th>
                    <th className="py-3 px-3">Quality Score</th>
                    <th className="py-3 px-3">Avg Lead Time</th>
                    <th className="py-3 px-3">Defect / Damage Rate</th>
                    <th className="py-3 px-3">Active PO Value</th>
                    <th className="py-3 px-3">Risk & SLA Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                        No suppliers found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredVendors.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 font-sans">
                          <div className="font-bold text-white">{v.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{v.vendorId}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-sans">{v.category}</td>
                        <td className="py-3 px-3 font-bold text-amber-300">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {v.rating.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-400">{v.onTimeDeliveryPct}%</td>
                        <td className="py-3 px-3 font-bold text-cyan-400">{v.qualityScore}%</td>
                        <td className="py-3 px-3 text-slate-300">{v.avgLeadTimeDays} days</td>
                        <td className="py-3 px-3 text-slate-500 font-sans text-[11px]">
                          {v.defectRateFormatted}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          {v.activePOValueFormatted}
                          {v.poCount > 0 && (
                            <span className="block text-[10px] text-slate-500 font-normal">
                              ({v.poCount} POs)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            v.riskLevel === 'Low' 
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
                              : v.riskLevel === 'Medium'
                              ? 'bg-amber-950 text-amber-400 border-amber-800'
                              : 'bg-rose-950 text-rose-400 border-rose-800'
                          }`}>
                            {v.riskLevel} Risk ({v.slaStatus})
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
