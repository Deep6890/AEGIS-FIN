import React, { useState, useMemo } from "react";
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar, Line } from "recharts";
import { Maximize2, X, TrendingUp, TrendingDown, Minus } from "lucide-react";

// Custom BoxPlot component using Recharts
function BoxPlotBar({ payload, x, y, width, height }) {
  if (!payload || !payload.boxData) return null;
  
  const { min, q1, median, q3, max, outliers = [] } = payload.boxData;
  const centerX = x + width / 2;
  
  // Calculate positions
  const minY = y + height;
  const maxY = y;
  const range = max - min;
  
  const getYPos = (value) => {
    return maxY + ((max - value) / range) * height;
  };
  
  const q1Y = getYPos(q1);
  const medianY = getYPos(median);
  const q3Y = getYPos(q3);
  const minYPos = getYPos(min);
  const maxYPos = getYPos(max);
  
  const boxWidth = width * 0.6;
  const boxLeft = centerX - boxWidth / 2;
  
  return (
    <g>
      {/* Whiskers */}
      <line x1={centerX} y1={minYPos} x2={centerX} y2={q1Y} stroke="#6B7280" strokeWidth={2} />
      <line x1={centerX} y1={q3Y} x2={centerX} y2={maxYPos} stroke="#6B7280" strokeWidth={2} />
      
      {/* Min/Max caps */}
      <line x1={centerX - 10} y1={minYPos} x2={centerX + 10} y2={minYPos} stroke="#6B7280" strokeWidth={2} />
      <line x1={centerX - 10} y1={maxYPos} x2={centerX + 10} y2={maxYPos} stroke="#6B7280" strokeWidth={2} />
      
      {/* Box */}
      <rect
        x={boxLeft}
        y={q3Y}
        width={boxWidth}
        height={q1Y - q3Y}
        fill="rgba(255, 107, 53, 0.2)"
        stroke="#FF6B35"
        strokeWidth={2}
        rx={4}
      />
      
      {/* Median line */}
      <line
        x1={boxLeft}
        y1={medianY}
        x2={boxLeft + boxWidth}
        y2={medianY}
        stroke="#FF6B35"
        strokeWidth={3}
      />
      
      {/* Outliers */}
      {outliers.map((outlier, idx) => (
        <circle
          key={idx}
          cx={centerX}
          cy={getYPos(outlier)}
          r={3}
          fill="#EF4444"
          stroke="#DC2626"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

function BoxPlotTooltip({ active, payload, label }) {
  if (!active || !payload || !payload[0] || !payload[0].payload.boxData) return null;
  
  const data = payload[0].payload.boxData;
  
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Max:</span>
          <span className="font-mono text-gray-900 dark:text-white">₹{data.max?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Q3:</span>
          <span className="font-mono text-gray-900 dark:text-white">₹{data.q3?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Median:</span>
          <span className="font-mono font-semibold text-[var(--orange)]">₹{data.median?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Q1:</span>
          <span className="font-mono text-gray-900 dark:text-white">₹{data.q1?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Min:</span>
          <span className="font-mono text-gray-900 dark:text-white">₹{data.min?.toFixed(2)}</span>
        </div>
        {data.outliers && data.outliers.length > 0 && (
          <div className="flex justify-between gap-4 pt-1 border-t border-gray-200 dark:border-gray-600">
            <span className="text-gray-600 dark:text-gray-400">Outliers:</span>
            <span className="font-mono text-red-500">{data.outliers.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ZoomModal({ isOpen, onClose, data, title }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={500}>
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip content={<BoxPlotTooltip />} />
              <Bar 
                dataKey="boxData" 
                shape={<BoxPlotBar />}
                fill="transparent"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function BoxPlotChart({ data, title, className = "" }) {
  const [isZoomed, setIsZoomed] = useState(false);
  
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => {
      const prices = item.prices || [];
      if (prices.length === 0) return { ...item, boxData: null };
      
      const sorted = [...prices].sort((a, b) => a - b);
      const n = sorted.length;
      
      const q1Index = Math.floor(n * 0.25);
      const medianIndex = Math.floor(n * 0.5);
      const q3Index = Math.floor(n * 0.75);
      
      const q1 = sorted[q1Index];
      const median = sorted[medianIndex];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1;
      
      const lowerFence = q1 - 1.5 * iqr;
      const upperFence = q3 + 1.5 * iqr;
      
      const outliers = sorted.filter(price => price < lowerFence || price > upperFence);
      const filteredPrices = sorted.filter(price => price >= lowerFence && price <= upperFence);
      
      return {
        ...item,
        boxData: {
          min: Math.min(...filteredPrices),
          q1,
          median,
          q3,
          max: Math.max(...filteredPrices),
          outliers
        }
      };
    });
  }, [data]);
  
  const hasData = processedData.length > 0 && processedData.some(d => d.boxData);
  
  if (!hasData) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <TrendingUp size={48} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No price data available</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className={`card p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
          <button
            onClick={() => setIsZoomed(true)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            title="Zoom to full screen"
          >
            <Maximize2 size={16} className="text-gray-500 group-hover:text-[var(--orange)] transition-colors" />
          </button>
        </div>
        
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip content={<BoxPlotTooltip />} />
            <Bar 
              dataKey="boxData" 
              shape={<BoxPlotBar />}
              fill="transparent"
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-[var(--orange)] opacity-20 border border-[var(--orange)] rounded"></div>
            <span>IQR (Q1-Q3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-[var(--orange)]"></div>
            <span>Median</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Outliers</span>
          </div>
        </div>
      </div>
      
      <ZoomModal
        isOpen={isZoomed}
        onClose={() => setIsZoomed(false)}
        data={processedData}
        title={title}
      />
    </>
  );
}