import { Delete, Check, ChevronDown } from 'lucide-react';

interface NumericKeypadProps {
  amount: string;
  note: string;
  isFormValid: boolean;
  onNumberClick: (num: string) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
  onToggle: () => void;
  isExpanded: boolean;
  submitLabel?: string;
}

export const NumericKeypad = ({
  amount,
  note,
  isFormValid,
  onNumberClick,
  onNoteChange,
  onSubmit,
  onToggle,
  isExpanded,
  submitLabel,
}: NumericKeypadProps) => {
  return (
    <div
      className={`fixed left-0 right-0 bg-white border-t border-gray-100 z-[60] transition-all duration-300 ease-out ${
        isExpanded ? 'bottom-0 opacity-100 translate-y-0' : 'bottom-[-100%] opacity-0 pointer-events-none'
      }`}
    >
      <div className="border-b border-gray-100 p-3 flex items-center justify-center gap-2">
        <span className="text-sm text-gray-500">金额输入</span>
        <button
          onClick={onToggle}
          className="ml-auto flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="text-xs">收起</span>
          <ChevronDown size={16} />
        </button>
      </div>
      
      <div className="px-4 py-4">
        <div className="mb-3">
          <input
            type="text"
            placeholder="添加备注（可选）"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
            maxLength={50}
          />
        </div>
        
        <div className="text-right text-sm text-gray-400 mb-3">{amount || '0.00'}</div>
        <div className="grid grid-cols-4 gap-2">
          {['1', '2', '3'].map((num) => (
            <button
              key={num}
              onClick={() => onNumberClick(num)}
              className="py-4 bg-gray-50 rounded-xl font-semibold text-xl text-gray-800 active:bg-gray-200 transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => onNumberClick('')}
            className="py-4 bg-orange-100 rounded-xl font-semibold text-sm text-orange-500 active:bg-orange-200 flex flex-col items-center justify-center transition-colors"
          >
            <Delete size={20} />
            <span>清除</span>
          </button>
          {['4', '5', '6'].map((num) => (
            <button
              key={num}
              onClick={() => onNumberClick(num)}
              className="py-4 bg-gray-50 rounded-xl font-semibold text-xl text-gray-800 active:bg-gray-200 transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => onNumberClick('del')}
            className="py-4 bg-red-100 rounded-xl font-semibold text-red-500 active:bg-red-200 flex items-center justify-center transition-colors"
          >
            <span className="text-xl">⌫</span>
          </button>
          {['7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => onNumberClick(num)}
              className="py-4 bg-gray-50 rounded-xl font-semibold text-xl text-gray-800 active:bg-gray-200 transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={onSubmit}
            disabled={!isFormValid}
            className={`py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
              isFormValid
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-lg hover:shadow-emerald-500/30 active:opacity-90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitLabel || <Check size={24} />}
          </button>
          <button
            onClick={() => onNumberClick('0')}
            className="col-span-2 py-4 bg-gray-50 rounded-xl font-semibold text-xl text-gray-800 active:bg-gray-200 transition-colors"
          >
            0
          </button>
          <button
            onClick={() => onNumberClick('.')}
            className="py-4 bg-gray-50 rounded-xl font-semibold text-xl text-gray-800 active:bg-gray-200 transition-colors"
          >
            .
          </button>
        </div>
      </div>
    </div>
  );
};
