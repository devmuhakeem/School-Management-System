import * as React from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// 1. ACCESSIBLE SVG BAR CHART
// =============================================================================

export interface BarChartItem {
  label: string;
  value: number;
  sublabel?: string;
  color?: string;
}

export interface BarChartProps {
  data: BarChartItem[];
  height?: number;
  valueFormatter?: (val: number) => string;
  className?: string;
}

export function BarChart({
  data,
  height = 180,
  valueFormatter = (val) => String(val),
  className,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("w-full font-mono text-xs", className)}>
      <div
        className="flex items-end gap-2 sm:gap-3 w-full border-b border-slate-200 pb-2 pt-4"
        style={{ height }}
      >
        {data.map((item, idx) => {
          const heightPct = Math.max(6, Math.round((item.value / maxValue) * 100));
          return (
            <div
              key={`${item.label}-${idx}`}
              className="flex-1 flex flex-col items-center justify-end h-full group"
            >
              <span className="text-[10px] text-slate-500 mb-1 opacity-80 group-hover:opacity-100 transition-opacity">
                {valueFormatter(item.value)}
              </span>
              <div
                className="w-full bg-slate-700 group-hover:bg-indigo-600 transition-colors"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: item.color,
                }}
                title={`${item.label}: ${valueFormatter(item.value)}`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-start gap-1 pt-2 text-[10px] text-slate-600">
        {data.map((item, idx) => (
          <div
            key={`lbl-${idx}`}
            className="flex-1 text-center truncate px-0.5"
            title={item.label}
          >
            <p className="truncate font-sans font-medium text-slate-700">{item.label}</p>
            {item.sublabel && (
              <p className="text-[9px] text-slate-600 font-mono">{item.sublabel}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// 2. ACCESSIBLE SVG LINE CHART
// =============================================================================

export interface LineChartItem {
  label: string;
  value: number;
}

export interface LineChartProps {
  data: LineChartItem[];
  height?: number;
  valueFormatter?: (val: number) => string;
  unit?: string;
  strokeColor?: string;
  className?: string;
}

export function LineChart({
  data,
  height = 180,
  valueFormatter = (v) => `${v}%`,
  strokeColor = "#4f46e5",
  className,
}: LineChartProps) {
  if (data.length < 2) return null;

  const minVal = Math.min(...data.map((d) => d.value));
  const maxVal = Math.max(...data.map((d) => d.value));
  const paddingY = 24;
  const chartHeight = height - paddingY * 2;
  const width = 500;
  const paddingX = 20;
  const chartWidth = width - paddingX * 2;

  const range = maxVal - minVal || 1;
  const stepX = chartWidth / (data.length - 1);

  const points = data.map((d, idx) => {
    const x = paddingX + idx * stepX;
    const y = paddingY + chartHeight - ((d.value - minVal) / range) * chartHeight;
    return { x, y, value: d.value, label: d.label };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  // Area under curve
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - 6} L ${points[0].x} ${height - 6} Z`;

  return (
    <div className={cn("w-full font-mono", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        style={{ height }}
      >
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        <line
          x1={paddingX}
          y1={paddingY}
          x2={width - paddingX}
          y2={paddingY}
          stroke="#e2e8f0"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingX}
          y1={paddingY + chartHeight / 2}
          x2={width - paddingX}
          y2={paddingY + chartHeight / 2}
          stroke="#e2e8f0"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingX}
          y1={paddingY + chartHeight}
          x2={width - paddingX}
          y2={paddingY + chartHeight}
          stroke="#cbd5e1"
        />

        {/* Shaded Area */}
        <path d={areaD} fill="url(#lineGrad)" />

        {/* Path Line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx} className="group cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#ffffff"
              stroke={strokeColor}
              strokeWidth="2"
              className="group-hover:r-6 transition-all"
            />
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              className="text-[10px] fill-slate-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {valueFormatter(p.value)}
            </text>
          </g>
        ))}
      </svg>

      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100 px-1">
        {data.map((d, i) => (
          <span key={i} className="font-mono">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// 3. ACCESSIBLE SVG DONUT / BREAKDOWN CHART
// =============================================================================

export interface DonutItem {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: DonutItem[];
  totalLabel?: string;
  className?: string;
}

export function DonutChart({ data, totalLabel = "Total", className }: DonutChartProps) {
  const total = data.reduce((acc, cur) => acc + cur.value, 0) || 1;

  let accumulatedPercent = 0;

  function getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  const slices = data.map((slice) => {
    const startPercent = accumulatedPercent;
    const slicePercent = slice.value / total;
    accumulatedPercent += slicePercent;
    const endPercent = accumulatedPercent;

    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

    const pathData = [
      `M ${startX} ${startY}`,
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `L 0 0`,
    ].join(" ");

    return {
      ...slice,
      pathData,
      percent: Math.round(slicePercent * 100),
    };
  });

  return (
    <div className={cn("flex flex-col sm:flex-row items-center gap-6", className)}>
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="-1 -1 2 2" className="-rotate-90 w-full h-full">
          {slices.map((slice, idx) => (
            <path
              key={idx}
              d={slice.pathData}
              fill={slice.color}
              className="hover:opacity-90 transition-opacity"
            />
          ))}
          {/* Inner cutout for donut effect */}
          <circle cx="0" cy="0" r="0.62" fill="#ffffff" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-mono font-bold text-slate-900">{total}</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-600 font-medium font-mono">
            {totalLabel}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 flex-1 w-full text-xs font-mono">
        {slices.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-none">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-700 font-sans">{item.label}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span>{item.value}</span>
              <span className="text-slate-600 text-[10px]">({item.percent}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
