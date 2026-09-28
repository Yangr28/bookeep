/**
 * 近 N 月资产趋势明细底部浮层
 *
 * 上半部：recharts 面积折线图（总资产走势 + 渐变填充，点击数据点高亮）
 * 下半部：逐月明细列表（月末总资产 / 当月结余 / 环比涨跌）
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Dot,
} from 'recharts';
import { formatCurrencyShort } from '../utils/format';

export interface AssetsTrendPoint {
  month: string;
  assets: number;
  income: number;
  expense: number;
}

interface TrendDetailSheetProps {
  open: boolean;
  data: AssetsTrendPoint[];
  onClose: () => void;
}

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-card)',
  fontSize: 12,
  color: 'var(--ink)',
} as const;

export const TrendDetailSheet = ({ open, data, onClose }: TrendDetailSheetProps) => {
  const { t } = useTranslation();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!open) return null;

  const chartData = data.map((d) => ({ ...d, net: d.income - d.expense }));
  const last = data[data.length - 1];
  const first = data[0];
  // 首尾对比总变化
  const totalChange = data.length >= 2 ? last.assets - first.assets : 0;
  const totalChangePct = data.length >= 2 && first.assets !== 0
    ? ((totalChange / Math.abs(first.assets)) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in sheet-scrim"
      onClick={onClose}
    >
      <div
        className="sheet glass-sheet w-full max-w-md animate-slide-up max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('dashboard.trendTitle')}
      >
        <div className="px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {/* 抓手 */}
          <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: 'var(--line)' }} />

          {/* 标题栏 */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{t('dashboard.trendTitle')}</h2>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold amount-num" style={{ color: 'var(--ink)' }}>
                  {formatCurrencyShort(last.assets)}
                </span>
                {data.length >= 2 && (
                  <span
                    className="inline-flex items-center gap-0.5 text-xs font-semibold"
                    style={{ color: totalChange >= 0 ? 'var(--primary)' : 'var(--expense)' }}
                  >
                    {totalChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {totalChange >= 0 ? '+' : ''}{totalChangePct.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="icon-btn w-8 h-8" aria-label="close">
              <X size={16} />
            </button>
          </div>

          {/* 面积折线图 */}
          <div className="rounded-card p-2" style={{ background: 'var(--paper-deep)' }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 8, bottom: 4, left: -8 }}
                onClick={(state) => {
                  if (state?.activeTooltipIndex !== undefined) {
                    const idx = Number(state.activeTooltipIndex);
                    setActiveIdx((cur) => (cur === idx ? null : idx));
                  }
                }}
              >
                <defs>
                  <linearGradient id="trendAssetsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: 'var(--ink-2)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'var(--ink-2)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(0)}w` : `${v}`)}
                  width={42}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ fontSize: 11, color: 'var(--ink-2)' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'assets') return [formatCurrencyShort(value), t('dashboard.trendAssets')];
                    if (name === 'net') return [formatCurrencyShort(value), t('dashboard.trendMonthlyNet')];
                    return [value, name];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="assets"
                  stroke="var(--primary)"
                  strokeWidth={2.2}
                  fill="url(#trendAssetsGrad)"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)' }}
                  dot={(props: { cx?: number; cy?: number; index?: number }) => {
                    const { cx, cy, index } = props;
                    if (cx === undefined || cy === undefined || index === undefined) return null;
                    const isActive = activeIdx === index || index === data.length - 1;
                    return (
                      <Dot
                        key={`dot-${index}`}
                        cx={cx}
                        cy={cy}
                        r={isActive ? 4 : 2.5}
                        fill="var(--primary)"
                        stroke="var(--card)"
                        strokeWidth={isActive ? 2 : 0}
                      />
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 逐月明细（最新在上） */}
          <div className="mt-3 divide-y" style={{ borderColor: 'var(--line)' }}>
            {[...data].reverse().map((d, revIdx) => {
              const idx = data.length - 1 - revIdx;
              const prev = idx > 0 ? data[idx - 1] : null;
              const change = prev ? d.assets - prev.assets : null;
              const changePct = prev && prev.assets !== 0 ? (change! / Math.abs(prev.assets)) * 100 : null;
              const net = d.income - d.expense;
              const isActive = activeIdx === idx;
              return (
                <button
                  key={d.month}
                  onClick={() => setActiveIdx((cur) => (cur === idx ? null : idx))}
                  className="w-full flex items-center justify-between py-3 text-left transition-opacity"
                  style={{ opacity: activeIdx === null || isActive ? 1 : 0.35 }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{d.month}</span>
                    <span
                      className="text-[11px] mt-0.5 amount-num"
                      style={{ color: net >= 0 ? 'var(--primary)' : 'var(--expense)' }}
                    >
                      {t('dashboard.trendMonthlyNet')} {net >= 0 ? '+' : ''}{formatCurrencyShort(net)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold amount-num" style={{ color: 'var(--ink)' }}>
                      {formatCurrencyShort(d.assets)}
                    </span>
                    {change !== null && (
                      <span
                        className="flex items-center justify-end gap-0.5 text-[11px] mt-0.5 amount-num"
                        style={{ color: change >= 0 ? 'var(--primary)' : 'var(--expense)' }}
                      >
                        {change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {change >= 0 ? '+' : ''}{changePct !== null ? `${changePct.toFixed(1)}%` : ''}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
