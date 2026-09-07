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
      days.push(<div key={`empty-${i}`} className="h-12 flex items-center justify-center" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const selected = isSelected(day);
      const todayDay = isToday(day);
      const future = isFuture(day);
      
      days.push(
        <button
          key={day}
          onClick={() => !future && handleDayClick(day)}
          disabled={future}
          className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
            selected
              ? 'bg-emerald-500 text-white'
              : todayDay
              ? 'bg-emerald-100 text-emerald-600'
              : future
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-[100]">
      <div className="bg-white w-full rounded-t-3xl max-h-[75vh] overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">选择日期</h2>
          <div className="w-10"></div>
        </div>

        <div className="p-4 pb-20">
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft size={24} className="text-gray-600" />
            </button>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleYearChange('down')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronLeft size={16} className="text-gray-500" />
                </button>
                <span className="text-xl font-bold text-gray-800 w-20 text-center">{currentYear}年</span>
                <button
                  onClick={() => handleYearChange('up')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronRight size={16} className="text-gray-500" />
                </button>
              </div>
              <span className="text-lg font-medium text-gray-600 mt-1">{months[currentMonth]}</span>
            </div>
            
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight size={24} className="text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-gray-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderDays()}
          </div>
        </div>
      </div>
    </div>
  );
};
