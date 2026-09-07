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
    <div className="fixed inset-0 bg-black/50 flex items-end z-[100]">
      <div className="bg-white w-full rounded-t-3xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">选择时间</h2>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            确定
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-2">小时</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHoursDecrease}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-3xl font-bold text-gray-800">
                    {hours.toString().padStart(2, '0')}
                  </span>
                </div>
                <button
                  onClick={handleHoursIncrease}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
              </div>
            </div>

            <span className="text-3xl font-bold text-gray-300 self-center">:</span>

            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-2">分钟</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMinutesDecrease}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-3xl font-bold text-gray-800">
                    {minutes.toString().padStart(2, '0')}
                  </span>
                </div>
                <button
                  onClick={handleMinutesIncrease}
                  className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-2 text-center">快捷选择</p>
            <div className="grid grid-cols-6 gap-1.5">
              {['08:00', '12:00', '14:00', '18:00', '20:00', '22:00'].map((time) => {
                const [h, m] = time.split(':').map(Number);
                const isSelected = hours === h && minutes === m;
                return (
                  <button
                    key={time}
                    onClick={() => handleQuickSelect(h, m)}
                    className={`py-2 px-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};