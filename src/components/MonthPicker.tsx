import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MonthPickerProps {
  /** 当前选中的月份，格式 'YYYY-MM' */
  selectedMonth: string;
  /** 选择月份回调，返回 'YYYY-MM' */
  onMonthChange: (month: string) => void;
  onClose: () => void;
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export const MonthPicker = ({ selectedMonth, onMonthChange, onClose }: MonthPickerProps) => {
  const [year, setYear] = useState(Number(selectedMonth.slice(0, 4)) || new Date().getFullYear());
  const currentMonth = Number(selectedMonth.slice(5, 7)) - 1;
  const currentYear = Number(selectedMonth.slice(0, 4));
  const now = new Date();

  const handleSelect = (monthIndex: number) => {
    const m = String(monthIndex + 1).padStart(2, '0');
    onMonthChange(`${year}-${m}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in"
      style={{ background: 'rgba(43,41,37,0.45)' }}
      onClick={onClose}
    >
      <div
        className="sheet w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <h3 className="font-bold" style={{ color: 'var(--ink)' }}>选择月份</h3>
          <button onClick={onClose} className="icon-btn w-9 h-9">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 safe-bottom">
          {/* 年份切换 */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <button onClick={() => setYear(year - 1)} className="icon-btn w-9 h-9">
              <ChevronLeft size={18} />
            </button>
            <span
              className="text-lg font-bold w-24 text-center amount-num whitespace-nowrap"
              style={{ color: 'var(--ink)' }}
            >
              {year}年
            </span>
            <button onClick={() => setYear(year + 1)} className="icon-btn w-9 h-9">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 月份网格 */}
          <div className="grid grid-cols-4 gap-2">
            {MONTH_LABELS.map((label, index) => {
              const isSelected = year === currentYear && index === currentMonth;
              const isCurrent = year === now.getFullYear() && index === now.getMonth();
              return (
                <button
                  key={label}
                  onClick={() => handleSelect(index)}
                  className="h-11 rounded-card text-sm font-medium transition-all"
                  style={
                    isSelected
                      ? { background: 'var(--primary)', color: '#fff' }
                      : {
                          background: isCurrent ? 'var(--primary-soft)' : 'var(--paper-deep)',
                          color: isCurrent ? 'var(--primary-ink)' : 'var(--ink)',
                        }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--ink-2)' }}>
            已选 {currentYear}年{currentMonth + 1}月
          </p>
        </div>
      </div>
    </div>
  );
};
