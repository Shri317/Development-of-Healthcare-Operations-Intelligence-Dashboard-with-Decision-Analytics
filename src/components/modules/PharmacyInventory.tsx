import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  AlertTriangle, 
  CheckCircle2, 
  ShoppingCart, 
  Truck, 
  Clock, 
  Sparkles, 
  RefreshCw,
  Loader2,
  Database
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fetchPharmacyInventoryIntelligence } from '../../services/apiService';

interface PharmacyInventoryProps {
  selectedFacility?: string;
  selectedTimeframe?: string;
  onExecuteAction: (actionId: string, payload?: any) => void;
}

export const PharmacyInventory: React.FC<PharmacyInventoryProps> = ({ 
  selectedFacility = 'all',
  selectedTimeframe = 'realtime',
  onExecuteAction 
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchPharmacyInventoryIntelligence(selectedFacility, selectedTimeframe)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch pharmacy inventory intelligence:', err);
        setError(err.message || 'Failed to fetch pharmacy inventory data from API');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedFacility, selectedTimeframe]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl min-h-[400px]">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading pharmacy & inventory analytics from Amazon Athena...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-center min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-white mb-1">Pharmacy Inventory API Error</h3>
        <p className="text-xs text-rose-200 max-w-md">{error}</p>
      </div>
    );
  }

  if (!data || data.totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-center min-h-[300px]">
        <Database className="w-10 h-10 text-slate-500 mb-2" />
        <h3 className="text-base font-bold text-slate-200 mb-1">No Inventory Items Found</h3>
        <p className="text-xs text-slate-400">No inventory records match the selected scope ({selectedFacility}).</p>
      </div>
    );
  }

  const catData = (data.categoryBreakdown || []).map((c: any) => ({
    category: c.category,
    totalItems: c.totalItems,
    lowStock: c.lowStockCount
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Pill className="w-5 h-5 text-cyan-400" /> Pharmacy & Inventory Intelligence
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold rounded-full">
              {data.dataSource || 'Local Fallback'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real dataset stock monitoring, low-stock warnings, dispensing volume, and batch expiry tracking
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400 font-medium">Reorder Protocol:</span>
          <span className="text-slate-200 font-semibold">Automated Threshold Monitoring</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monitored Items</span>
          <div className="text-2xl font-bold text-white font-mono">{data.totalItems.toLocaleString()} SKUs</div>
          <p className="text-[10px] text-slate-400">Scope: {selectedFacility === 'all' ? 'All Facilities' : selectedFacility}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Low-Stock Warnings</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">{data.lowStockCount} SKUs</div>
          <p className="text-[10px] text-amber-400 font-semibold">At or Below Reorder Level</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Out-of-Stock Items</span>
          <div className="text-2xl font-bold text-rose-400 font-mono">{data.outOfStockCount || 0} SKUs</div>
          <p className="text-[10px] text-rose-400">Critical Zero-Stock</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Prescriptions Dispensed</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">{(data.totalDispensedOrders || 0).toLocaleString()}</div>
          <p className="text-[10px] text-cyan-300">{(data.totalDispensedUnits || 0).toLocaleString()} units ({data.totalDispenseValueFormatted || '$0.00'})</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Batch Expiry Risk</span>
          <div className="text-2xl font-bold text-orange-400 font-mono">{data.expiredBatches || 0} / {data.totalBatches || 0}</div>
          <p className="text-[10px] text-orange-300">{data.nearExpiryBatches || 0} batches near expiry</p>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">Inventory by Pharmaceutical Category</h3>
        <p className="text-xs text-slate-400 mb-4">Total monitored items and low-stock warnings per category</p>

        <div className="h-64 w-full">
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4B4B4B" />
                <XAxis dataKey="category" stroke="#9CA3AF" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(val: any, name: any) => [val, name === 'totalItems' ? 'Total Monitored' : 'Low Stock']}
                  contentStyle={{ backgroundColor: '#2D2D2D', borderColor: '#4B4B4B', color: '#F9FAFB' }}
                />
                <Bar dataKey="totalItems" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lowStock" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-500">No category inventory data</div>
          )}
        </div>
      </div>

      {/* Low Stock Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">Low-Stock & Reorder Warnings</h3>
        <p className="text-xs text-slate-400 mb-4">Items requiring replenishment based on reorder level</p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Medicine Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Current Stock</th>
                <th className="p-3">Reorder Threshold</th>
                <th className="p-3 font-right">Stock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(data.lowStockItems || []).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-white">{item.medicine}</td>
                  <td className="p-3 text-slate-400">{item.category}</td>
                  <td className="p-3 font-mono text-amber-400 font-bold">{item.currentStock} units</td>
                  <td className="p-3 font-mono text-slate-400">{item.reorderLevel} units</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded font-bold">
                      Low Stock Warning
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
