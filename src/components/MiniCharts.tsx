import { useEffect, useRef, useState } from 'react';

/**
 * 首页 mini 数据可视化组件
 * 全部使用 SVG 实现，不引入 recharts，保证首页加载性能
 */

// ============== 通用工具 ==============

/** 尊重用户的减少动画偏好 */
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
};

// ============== Sparkline：资产趋势 mini 折线 ==============

interface SparklineProps {
  data: number[];                // 数值序列
  width?: number;
  height?: number;
  /** 上涨色 / 下跌色（默认取 var(--primary)/var(--expense)） */
  upColor?: string;
  downColor?: string;
  /** 是否填充渐变区域 */
  fill?: boolean;
}

export const Sparkline = ({
  data,
  width = 72,
  height = 24,
  upColor = 'var(--primary)',
  downColor = 'var(--expense)',
  fill = true,
}: SparklineProps) => {
  const reduced = useReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);
  const [drawn, setDrawn] = useState(false);

  // 数据不足时退化为水平直线
  const hasData = data.length >= 2;
  const min = hasData ? Math.min(...data) : 0;
  const max = hasData ? Math.max(...data) : 1;
  const range = max - min || 1;
  // 4px padding，避免贴边
  const padX = 2;
  const padY = 3;
  const w = width - padX * 2;
  const h = height - padY * 2;

  const points = hasData
    ? data.map((v, i) => {
        const x = padX + (i / (data.length - 1)) * w;
        const y = padY + h - ((v - min) / range) * h;
        return [x, y] as const;
      })
    : [[padX, padY + h / 2] as const, [padX + w, padY + h / 2] as const];

  const d = points
    .map(([x, y], i) => (i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`))
    .join(' ');

  // 渐变填充区域路径
  const fillD = `${d} L ${points[points.length - 1][0].toFixed(2)} ${padY + h} L ${points[0][0].toFixed(2)} ${padY + h} Z`;

  // 末端是否上涨（最后一个点 >= 第一个点）
  const isUp = hasData && data[data.length - 1] >= data[0];
  const strokeColor = isUp ? upColor : downColor;
  const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 9)}`;

  // 路径总长，用于 stroke-dashoffset 动画
  const pathLength = pathRef.current?.getTotalLength?.() ?? 0;
  const hasLength = pathLength > 0;

  useEffect(() => {
    if (reduced || !hasData) { setDrawn(true); return; }
    // 初次挂载后下一帧触发绘制
    const t = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(t);
  }, [reduced, hasData]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && hasData && (
        <path
          d={fillD}
          fill={`url(#${gradientId})`}
          style={{
            opacity: drawn ? 1 : 0,
            transition: 'opacity 0.6s ease-out 0.5s',
          }}
        />
      )}
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: hasLength && !reduced ? pathLength : undefined,
          strokeDashoffset: hasLength && !reduced
            ? (drawn ? 0 : pathLength)
            : undefined,
          transition: hasLength && !reduced
            ? 'stroke-dashoffset 1.1s ease-out'
            : undefined,
        }}
      />
      {/* 末端高亮点 */}
      {hasData && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r={2}
          fill={strokeColor}
          style={{
            opacity: drawn ? 1 : 0,
            transition: 'opacity 0.3s ease-out 1s',
          }}
        />
      )}
    </svg>
  );
};

// ============== StackedBar：收支对比堆叠条 ==============

interface StackedBarProps {
  income: number;
  expense: number;
  /** 高度 px */
  height?: number;
  /** 标签是否显示在条下方 */
  showBalanceRate?: boolean;
}

export const StackedBar = ({
  income,
  expense,
  height = 8,
  showBalanceRate = true,
}: StackedBarProps) => {
  const reduced = useReducedMotion();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (reduced) { setAnimated(true); return; }
    const t = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(t);
  }, [reduced]);

  const total = income + expense;
  // 收入占比、支出占比（按金额比例，避免 0/0）
  const incomePct = total > 0 ? (income / total) * 100 : 50;
  const expensePct = total > 0 ? (expense / total) * 100 : 50;
  // 结余率 = (收入 - 支出) / 收入 * 100
  const balance = income - expense;
  const balanceRate = income > 0 ? Math.round((balance / income) * 100) : 0;
  const isPositive = balance >= 0;

  return (
    <div className="w-full">
      <div
        className="w-full rounded-full overflow-hidden flex"
        style={{ height, background: 'var(--paper-deep)' }}
      >
        {/* 收入区（左，绿） */}
        <div
          className="h-full"
          style={{
            width: `${animated ? incomePct : 0}%`,
            background: 'var(--primary)',
            transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
        {/* 支出区（右，红） */}
        <div
          className="h-full"
          style={{
            width: `${animated ? expensePct : 0}%`,
            background: 'var(--expense)',
            transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.05s',
          }}
        />
      </div>
      {showBalanceRate && income > 0 && (
        <div className="flex items-center justify-center mt-1.5">
          <span
            className="text-[11px] font-semibold animate-pop-in"
            style={{ color: isPositive ? 'var(--primary)' : 'var(--expense)' }}
          >
            结余率 {balanceRate > 0 ? '+' : ''}{balanceRate}%
          </span>
        </div>
      )}
    </div>
  );
};

// ============== ProgressRing：预算进度环 ==============

interface ProgressRingProps {
  percentage: number;     // 0-100（超出 100 时按 100 显示但颜色变红）
  size?: number;          // 外径 px
  stroke?: number;        // 环宽 px
  /** 超支时是否脉冲 */
  pulse?: boolean;
  /** 颜色根据百分比自动选择（>80 红，50-80 警示，<50 主色） */
  color?: string;
}

export const ProgressRing = ({
  percentage,
  size = 36,
  stroke = 3.5,
  pulse = false,
  color,
}: ProgressRingProps) => {
  const reduced = useReducedMotion();
  const [animated, setAnimated] = useState(false);
  const clampedPct = Math.max(0, Math.min(100, percentage));

  // 默认色板随百分比渐变
  const autoColor = color ?? (
    percentage >= 100 ? 'var(--expense)'
      : percentage >= 80 ? 'var(--expense-ink)'
        : percentage >= 50 ? 'var(--primary-ink)' : 'var(--primary)'
  );

  // 半径与周长
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  // 填充长度
  const dashLen = (animated ? clampedPct / 100 : 0) * circumference;

  useEffect(() => {
    if (reduced) { setAnimated(true); return; }
    const t = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(t);
  }, [reduced]);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${pulse && !reduced ? 'animate-pulse-warning' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* 背景环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--paper-deep)"
          strokeWidth={stroke}
        />
        {/* 进度环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={autoColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dashLen} ${circumference - dashLen}`}
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
      </svg>
      {/* 中央百分比文字 */}
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold amount-num"
        style={{ color: autoColor, transform: 'rotate(0deg)' }}
      >
        {Math.round(percentage)}%
      </span>
    </div>
  );
};
