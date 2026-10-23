import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Star, 
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
  onExecuteAction: _onExecuteAction 
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
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchSupplyChainVendors(selectedFacility, selectedTimeframe)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load supply chain vendors:', err);
        setError(err.message || 'Failed to fetch supply chain vendor data from backend API');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedFacility, selectedTimeframe]);

  const kpis = data?.kpis;
  const vendors = data?.vendors || [];
  const dataSource = loading ? 'Connecting to Amazon Athena...' : (data?.source || 'Local Dataset');

  const filteredVendors = vendors.filter((v: VendorRecord) => {
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#2D2D2D] border border-[#4B4B4B] rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#F9FAFB] flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#22D3EE]" /> Supply Chain & Vendor Management
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-[#1E1E1E] text-[#22D3EE] border border-[#4B4B4B] rounded-md">
              Data Source: {dataSource}
            </span>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-1 flex flex-wrap items-center gap-x-2">
            <span>Vendor scorecards, active purchase orders, lead times, and SLA compliance calculated from dataset</span>
            <span className="text-[#D1D5DB]">
              • Scope: <strong className="text-[#22D3EE] font-mono font-semibold">{selectedFacility === 'all' ? 'All Facilities (Enterprise Group)' : selectedFacility}</strong>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#333333] hover:bg-[#3D3D3D] text-[#D1D5DB] text-xs font-semibold border border-[#4B4B4B] transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Vendors</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-8 bg-[#333333] border border-[#4B4B4B] rounded-2xl text-center text-[#9CA3AF] text-sm animate-pulse space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#22D3EE]" />
          <p>Loading supply chain vendor analytics for {selectedFacility === 'all' ? 'all facilities' : selectedFacility}...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 bg-[#881337]/30 border border-[#FB7185]/40 rounded-2xl text-[#FB7185] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FB7185] flex-shrink-0" />
            <div>
              <p className="font-bold">Supply Chain Data Error</p>
              <p className="text-[#FB7185]/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-[#881337] hover:bg-[#9f1239] text-[#F9FAFB] font-semibold rounded-xl transition cursor-pointer"
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
            <div className="bg-[#333333] border border-[#4B4B4B] rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Total Real Suppliers
              </span>
              <div className="text-2xl font-bold text-[#F9FAFB] font-mono">
                {kpis?.totalVendors || 0}
              </div>
              <p className="text-[10px] text-[#34D399] font-semibold">
                {kpis?.compliantVendors || 0} Low Risk Compliant
              </p>
            </div>

            {/* On-Time Delivery Rate Card */}
            <div className="bg-[#333333] border border-[#4B4B4B] rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Avg On-Time Delivery %
              </span>
              <div className="text-2xl font-bold text-[#34D399] font-mono">
                {kpis?.avgOnTimeDeliveryPct ?? 0}%
              </div>
              <p className="text-[10px] text-[#34D399]/80 font-semibold">
                Across vendor fulfillment SLAs
              </p>
            </div>

            {/* Total Active Purchase Orders Card */}
            <div className="bg-[#333333] border border-[#4B4B4B] rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Total Purchase Orders Value
              </span>
              <div className="text-2xl font-bold text-[#22D3EE] font-mono">
                {kpis?.totalPOValueFormatted || '₹0.00'}
              </div>
              <p className="text-[10px] text-[#9CA3AF] font-mono">
                {kpis?.totalPOCount || 0} Active Orders Processed
              </p>
            </div>

            {/* Vendor Quality Score Card */}
            <div className="bg-[#333333] border border-[#4B4B4B] rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Avg Vendor Quality Score
              </span>
              <div className="text-2xl font-bold text-[#22D3EE] font-mono">
                {kpis?.avgQualityScore != null ? `${kpis.avgQualityScore}%` : 'N/A'}
              </div>
              <p className="text-[10px] text-[#22D3EE]/80 font-mono">
                Evaluated from supplier performance audits
              </p>
            </div>
          </div>

          {/* Active Supplier Performance Scorecards Table */}
          <div className="bg-[#333333] border border-[#4B4B4B] rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#F9FAFB] flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-[#22D3EE]" /> Active Supplier Performance Scorecards
                </h3>
                <p className="text-xs text-[#9CA3AF]">
                  Real vendor catalog loaded from vendor_performance.csv & purchase_orders.csv
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search vendor or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-[#252525] border border-[#4B4B4B] rounded-xl pl-8 pr-3 py-1 text-xs text-[#F9FAFB] placeholder-[#9CA3AF] outline-none focus:border-[#22D3EE] w-48"
                  />
                </div>

                <select
                  value={selectedRiskFilter}
                  onChange={(e) => setSelectedRiskFilter(e.target.value)}
                  className="bg-[#252525] border border-[#4B4B4B] text-xs text-[#D1D5DB] rounded-xl px-2.5 py-1 outline-none cursor-pointer focus:border-[#22D3EE]"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left text-xs text-[#D1D5DB]">
                <thead className="bg-[#252525] text-[#9CA3AF] uppercase text-[10px] tracking-wider border-b border-[#4B4B4B] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3">Supplier Name & ID</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Rating</th>
                    <th className="py-3 px-3">On-Time Delivery %</th>
                    <th className="py-3 px-3">Quality Score</th>
                    <th className="py-3 px-3">Avg Lead Time</th>
                    <th className="py-3 px-3">Active PO Value</th>
                    <th className="py-3 px-3">Risk & SLA Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#4B4B4B]/60 font-mono">
                  {filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#9CA3AF] font-sans">
                        No suppliers found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredVendors.map((v: VendorRecord, i: number) => (
                      <tr key={v.vendorId || i} className="hover:bg-[#2D2D2D]/60 transition">
                        <td className="py-3 px-3 font-sans">
                          <div className="font-bold text-[#F9FAFB]">{v.name}</div>
                          <div className="text-[10px] text-[#9CA3AF] font-mono">{v.vendorId}</div>
                        </td>
                        <td className="py-3 px-3 text-[#9CA3AF] font-sans">{v.category}</td>
                        <td className="py-3 px-3 font-bold text-amber-300">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {v.rating.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#34D399]">{v.onTimeDeliveryPct}%</td>
                        <td className="py-3 px-3 font-bold text-[#22D3EE]">{v.qualityScore}%</td>
                        <td className="py-3 px-3 text-[#D1D5DB]">{v.avgLeadTimeDays} days</td>
                        <td className="py-3 px-3 font-bold text-[#F9FAFB]">
                          {v.activePOValueFormatted}
                          {v.poCount > 0 && (
                            <span className="block text-[10px] text-[#9CA3AF] font-normal">
                              ({v.poCount} POs)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            v.riskLevel === 'Low' 
                              ? 'bg-emerald-950/60 text-[#34D399] border-emerald-800/60' 
                              : v.riskLevel === 'Medium'
                              ? 'bg-amber-950/60 text-[#FBBF24] border-amber-800/60'
                              : 'bg-rose-950/60 text-[#FB7185] border-rose-800/60'
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
