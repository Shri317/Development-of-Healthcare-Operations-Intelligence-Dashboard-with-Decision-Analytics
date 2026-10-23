import React, { useState } from 'react';
import { X, Sliders, Info } from 'lucide-react';

interface CustomKPIBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKPI?: (kpi: any) => void;
}

export const CustomKPIBuilderModal: React.FC<CustomKPIBuilderModalProps> = ({
  isOpen,
  onClose
}) => {
  const [title, setTitle] = useState('');
  const [formula, setFormula] = useState('SUM(Revenue) / COUNT(Encounters)');
  const [target, setTarget] = useState('$120 per patient');
  const [category, setCategory] = useState('Finance');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="medops-modal-card bg-[#333333] border border-[#4B4B4B] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#4B4B4B] pb-3">
          <h3 className="text-base font-bold text-[#F9FAFB] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#22D3EE]" /> Custom Operational KPI Builder
          </h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#F9FAFB] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-[#FBBF24]/10 border border-[#FBBF24]/30 rounded-xl flex items-start gap-2.5 text-xs text-[#FBBF24]">
          <Info className="w-4 h-4 text-[#FBBF24] shrink-0 mt-0.5" />
          <span>
            Custom KPI persistence is currently in development / read-only preview. User-defined semantic formulas cannot be committed to the database in this environment.
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-[#D1D5DB] block mb-1 font-medium">KPI Title</label>
            <input
              type="text"
              disabled
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Net Margin per Cardiac Encounters"
              className="w-full bg-[#2D2D2D] border border-[#4B4B4B] rounded-xl px-3 py-2 text-[#D1D5DB] placeholder-[#9CA3AF] outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[#D1D5DB] block mb-1 font-medium">Semantic DAX / SQL Formula</label>
            <input
              type="text"
              disabled
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              className="w-full bg-[#2D2D2D] border border-[#4B4B4B] rounded-xl px-3 py-2 text-[#D1D5DB] placeholder-[#9CA3AF] font-mono outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[#D1D5DB] block mb-1 font-medium">Target Benchmark</label>
            <input
              type="text"
              disabled
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-[#2D2D2D] border border-[#4B4B4B] rounded-xl px-3 py-2 text-[#D1D5DB] placeholder-[#9CA3AF] outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[#D1D5DB] block mb-1 font-medium">Pillar Category</label>
            <select
              disabled
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#2D2D2D] border border-[#4B4B4B] rounded-xl px-3 py-2 text-[#D1D5DB] outline-none cursor-not-allowed"
            >
              <option value="Operations" className="bg-[#2D2D2D] text-[#F9FAFB]">Operations</option>
              <option value="Finance" className="bg-[#2D2D2D] text-[#F9FAFB]">Finance</option>
              <option value="Clinical" className="bg-[#2D2D2D] text-[#F9FAFB]">Clinical</option>
              <option value="Compliance" className="bg-[#2D2D2D] text-[#F9FAFB]">Compliance</option>
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#2D2D2D] hover:bg-[#383838] text-[#D1D5DB] hover:text-[#F9FAFB] border border-[#4B4B4B] rounded-xl transition font-medium"
            >
              Close
            </button>
            <button
              type="button"
              disabled
              className="px-4 py-2 bg-[#252525] text-[#9CA3AF] font-medium rounded-xl cursor-not-allowed border border-[#4B4B4B]/60"
            >
              Persistence Disabled (Preview)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
