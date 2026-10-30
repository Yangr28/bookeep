import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon, X as XIcon, Check as CheckIcon } from 'lucide-react';
import { currencies } from '../utils/currency';

interface CurrencyPickerModalProps {
  open: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (code: string) => void;
}

/** 货币选择底部弹层（汇率转换页与记账页共用） */
const CurrencyPickerModal = memo(({ open, selected, onClose, onSelect }: CurrencyPickerModalProps) => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState('');

  if (!open) return null;

  const q = searchValue.toLowerCase();
  const filtered = !searchValue ? currencies : currencies.filter(c =>
    c.code.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.region.toLowerCase().includes(q)
  );

  const handleClose = () => {
    setSearchValue('');
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'rgba(43,41,37,0.45)' }}
      onClick={handleClose}
    >
      <div
        className="sheet w-full max-h-[78vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{t('currencyConverter.pickerTitle')}</h3>
          <button onClick={handleClose} className="icon-btn" aria-label={t('currencyConverter.ariaClose')}>
            <XIcon size={18} />
          </button>
        </div>
        <div className="p-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 rounded-button px-3 py-2" style={{ background: 'var(--paper-deep)' }}>
            <SearchIcon size={16} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={t('currencyConverter.searchPlaceholder')}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--ink)' }}
            />
            {searchValue && (
              <button onClick={() => setSearchValue('')} className="flex-shrink-0">
                <XIcon size={14} style={{ color: 'var(--ink-2)' }} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 pb-8">
          {filtered.length === 0 ? (
            <p className="text-center text-sm py-8" style={{ color: 'var(--ink-2)' }}>{t('currencyConverter.noMatch')}</p>
          ) : (
            filtered.map((currency) => (
              <button
                key={currency.code}
                onClick={() => {
                  onSelect(currency.code);
                  setSearchValue('');
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-card mb-1.5 transition-all"
                style={selected === currency.code
                  ? { background: 'var(--primary-soft)', border: '1.5px solid var(--primary)' }
                  : { background: 'var(--paper-deep)', border: '1.5px solid transparent' }}
              >
                <span className="text-2xl flex-shrink-0">{currency.flag}</span>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium" style={{ color: 'var(--ink)' }}>{currency.name}</p>
                  <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{currency.code} · {currency.region}</p>
                </div>
                <span className="text-sm flex-shrink-0" style={{ color: 'var(--ink-2)' }}>{currency.symbol}</span>
                {selected === currency.code && (
                  <CheckIcon size={18} className="flex-shrink-0" style={{ color: 'var(--primary)' }} />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
});
CurrencyPickerModal.displayName = 'CurrencyPickerModal';

export default CurrencyPickerModal;
