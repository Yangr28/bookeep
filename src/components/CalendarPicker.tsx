import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CalendarPickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onClose: () => void;
}

export const CalendarPicker = ({ selectedDate, onDateChange, onClose }: CalendarPickerProps) => {
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const today = new Date();

  const months = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleYearChange = (direction: 'up' | 'down') => {
    setCurrentYear(direction === 'up' ? currentYear + 1 : currentYear - 1);
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    onDateChange(newDate);
    onClose();
  };

  const isSelected = (day: number) => {
    return selectedDate.getFullYear() === currentYear &&
           selectedDate.getMonth() === currentMonth &&
           selectedDate.getDate() === day;
  };

  const isToday = (day: number) => {
    return today.getFullYear() === currentYear &&
           today.getMonth() === currentMonth &&
           today.getDate() === day;
  };

  const isFuture = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return date > new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const renderDays = () => {
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-11 w-11" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const selected = isSelected(day);
      const todayDay = isToday(day);
      const future = isFuture(day);

      const dayStyle: React.CSSProperties = selected
        ? { background: 'var(--primary)', color: '#fff', boxShadow: 'var(--shadow-fab)' }
        : todayDay
        ? { background: 'var(--primary-soft)', color: 'var(--primary-ink)' }
        : future
        ? { color: 'var(--ink-2)', opacity: 0.35 }
        : { color: 'var(--ink)' };

      days.push(
        <button
          key={day}
          onClick={() => !future && handleDayClick(day)}
          disabled={future}
          className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-medium transition-all active:scale-95"
          style={dayStyle}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in"
      style={{ background: 'rgba(43,41,37,0.45)' }}
      onClick={onClose}
    >
      <div
        className="sheet w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <h3 className="font-bold" style={{ color: 'var(--ink)' }}>选择日期</h3>
          <button onClick={onClose} className="icon-btn w-9 h-9">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 safe-bottom">
          {/* 年月切换 */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <button onClick={handlePrevMonth} className="icon-btn w-9 h-9">
              <ChevronLeft size={18} />
            </button>

            <div className="flex flex-col items-center min-w-[7rem]">
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleYearChange('down')} className="icon-btn w-7 h-7">
                  <ChevronLeft size={14} />
                </button>
                <span
                  className="text-lg font-bold w-14 text-center amount-num"
                  style={{ color: 'var(--ink)' }}
                >
                  {currentYear}年
                </span>
                <button onClick={() => handleYearChange('up')} className="icon-btn w-7 h-7">
                  <ChevronRight size={14} />
                </button>
              </div>
              <span className="text-sm font-medium mt-0.5" style={{ color: 'var(--ink-2)' }}>
                {months[currentMonth]}
              </span>
            </div>

            <button onClick={handleNextMonth} className="icon-btn w-9 h-9">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 星期 */}
          <div className="grid grid-cols-7 justify-items-center mb-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="h-8 w-11 flex items-center justify-center text-xs font-medium"
                style={{ color: 'var(--ink-2)' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-7 gap-1 justify-items-center">
            {renderDays()}
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--ink-2)' }}>
            已选 {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
          </p>
        </div>
      </div>
    </div>
  );
};
