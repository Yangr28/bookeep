import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimePickerProps {
  selectedTime: { hours: number; minutes: number };
  onTimeChange: (hours: number, minutes: number) => void;
  onClose: () => void;
}

export const TimePicker = ({ selectedTime, onTimeChange, onClose }: TimePickerProps) => {
  const [hours, setHours] = useState(selectedTime.hours);
  const [minutes, setMinutes] = useState(selectedTime.minutes);

  const handleHoursDecrease = () => {
    setHours((prev) => (prev === 0 ? 23 : prev - 1));
  };

  const handleHoursIncrease = () => {
    setHours((prev) => (prev === 23 ? 0 : prev + 1));
  };

  const handleMinutesDecrease = () => {
    setMinutes((prev) => (prev === 0 ? 59 : prev - 1));
  };

  const handleMinutesIncrease = () => {
    setMinutes((prev) => (prev === 59 ? 0 : prev + 1));
  };

  const handleConfirm = () => {
    onTimeChange(hours, minutes);
    onClose();
  };

  const handleQuickSelect = (h: number, m: number) => {
    setHours(h);
    setMinutes(m);
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
          <h3 className="font-bold" style={{ color: 'var(--ink)' }}>选择时间</h3>
          <button onClick={onClose} className="icon-btn w-9 h-9">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 safe-bottom">
          <div className="flex items-start justify-center gap-2 mb-6">
            {/* 小时 */}
            <div className="flex flex-col items-center">
              <span className="text-xs mb-2" style={{ color: 'var(--ink-2)' }}>小时</span>
              <div className="flex items-center gap-2">
                <button onClick={handleHoursDecrease} className="icon-btn w-10 h-10">
                  <ChevronLeft size={18} />
                </button>
                <div
                  className="w-16 h-16 rounded-button flex items-center justify-center"
                  style={{ background: 'var(--paper)' }}
                >
                  <span className="text-3xl font-bold amount-num" style={{ color: 'var(--ink)' }}>
                    {hours.toString().padStart(2, '0')}
                  </span>
                </div>
                <button onClick={handleHoursIncrease} className="icon-btn w-10 h-10">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <span className="text-3xl font-bold amount-num pt-6" style={{ color: 'var(--ink-2)' }}>:</span>

            {/* 分钟 */}
            <div className="flex flex-col items-center">
              <span className="text-xs mb-2" style={{ color: 'var(--ink-2)' }}>分钟</span>
              <div className="flex items-center gap-2">
                <button onClick={handleMinutesDecrease} className="icon-btn w-10 h-10">
                  <ChevronLeft size={18} />
                </button>
                <div
                  className="w-16 h-16 rounded-button flex items-center justify-center"
                  style={{ background: 'var(--paper)' }}
                >
                  <span className="text-3xl font-bold amount-num" style={{ color: 'var(--ink)' }}>
                    {minutes.toString().padStart(2, '0')}
                  </span>
                </div>
                <button onClick={handleMinutesIncrease} className="icon-btn w-10 h-10">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* 快捷选择 */}
          <p className="text-xs mb-2 text-center" style={{ color: 'var(--ink-2)' }}>快捷选择</p>
          <div className="grid grid-cols-6 gap-1.5">
            {['08:00', '12:00', '14:00', '18:00', '20:00', '22:00'].map((time) => {
              const [h, m] = time.split(':').map(Number);
              const isSelected = hours === h && minutes === m;
              return (
                <button
                  key={time}
                  onClick={() => handleQuickSelect(h, m)}
                  className={`chip justify-center text-xs px-1 ${isSelected ? 'chip-active' : 'chip-inactive'}`}
                >
                  {time}
                </button>
              );
            })}
          </div>

          <button onClick={handleConfirm} className="btn-primary w-full mt-6">
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
