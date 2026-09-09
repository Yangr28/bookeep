import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { ArrowLeft, ArrowDownUp, Globe, RefreshCw, Search as SearchIcon, X as XIcon, Check as CheckIcon, Edit3 } from 'lucide-react';
import {
  currencies, getRate, getCurrencySymbol, convertToCNY, convertFromCNY,
  getCustomRates, saveCustomRates, fetchLiveRates, getLastUpdateTime, getRateSource, isZeroDecimalCurrency, type Currency
} from '../utils/currency';

interface CurrencyConverterProps {
  onBack: () => void;
}

// 货币选择器 Modal - 提取为外部组件避免重渲染被销毁重建
interface CurrencyPickerModalProps {
  open: boolean;
  selected: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onClose: () => void;
  onSelect: (code: string) => void;
}

const CurrencyPickerModal = memo(({ open, selected, searchValue, onSearchChange, onClose, onSelect }: CurrencyPickerModalProps) => {
  if (!open) return null;

  const q = searchValue.toLowerCase();
  const filtered = !searchValue ? currencies : currencies.filter(c =>
    c.code.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.region.toLowerCase().includes(q)
  );

  const handleClose = () => {
    onSearchChange('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(43,41,37,0.45)' }}
      onClick={handleClose}
    >
      <div
        className="sheet w-full max-h-[78vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <h3 className="font-bold" style={{ color: 'var(--ink)' }}>选择货币</h3>
          <button onClick={handleClose} className="icon-btn" aria-label="关闭">
            <XIcon size={18} />
          </button>
        </div>
        <div className="p-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 rounded-button px-3 py-2" style={{ background: 'var(--paper-deep)' }}>
            <SearchIcon size={16} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索货币名称或代码"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--ink)' }}
            />
            {searchValue && (
              <button onClick={() => onSearchChange('')} className="flex-shrink-0">
                <XIcon size={14} style={{ color: 'var(--ink-2)' }} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 pb-8">
          {filtered.length === 0 ? (
            <p className="text-center text-sm py-8" style={{ color: 'var(--ink-2)' }}>未找到匹配的货币</p>
          ) : (
            filtered.map((currency) => (
              <button
                key={currency.code}
                onClick={() => {
                  onSelect(currency.code);
                  onSearchChange('');
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
    </div>
  );
});
CurrencyPickerModal.displayName = 'CurrencyPickerModal';

export const CurrencyConverter = ({ onBack }: CurrencyConverterProps) => {
  const [fromCurrency, setFromCurrency] = useState('CNY');
  const [toCurrency, setToCurrency] = useState('USD');
  const [amount, setAmount] = useState('100');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [customRates, setCustomRates] = useState<Record<string, number>>({});
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [rateVersion, setRateVersion] = useState(0); // 强制刷新汇率显示
  const [fromPickerSearch, setFromPickerSearch] = useState('');
  const [toPickerSearch, setToPickerSearch] = useState('');

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const result = await fetchLiveRates();
    setIsRefreshing(false);
    if (result) {
      setLastUpdate(result.timestamp);
      setRateVersion(v => v + 1);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setCustomRates(getCustomRates());
    setLastUpdate(getLastUpdateTime());
    // 如果没有缓存或缓存过期，自动获取
    const cached = getLastUpdateTime();
    if (!cached || Date.now() - cached > 6 * 60 * 60 * 1000) {
      handleRefresh();
    }
  }, []);

  // 转换结果
  const convertedAmount = useMemo(() => {
    const amt = parseFloat(amount);
    if (isNaN(amt)) return 0;
    const cnyAmount = convertToCNY(amt, fromCurrency);
    return convertFromCNY(cnyAmount, toCurrency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, fromCurrency, toCurrency, rateVersion]);

  // 汇率说明
  const rateText = useMemo(() => {
    const fromRate = getRate(fromCurrency);
    const toRate = getRate(toCurrency);
    if (toRate === 0) return '';
    const directRate = fromRate / toRate;
    return directRate.toFixed(directRate < 1 ? 6 : 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, toCurrency, rateVersion]);

  const handleSaveRate = (code: string) => {
    const value = parseFloat(editRateValue);
    if (!isNaN(value) && value > 0) {
      const newRates = { ...customRates, [code]: value };
      setCustomRates(newRates);
      saveCustomRates(newRates);
      setRateVersion(v => v + 1);
    }
    setEditingRate(null);
    setEditRateValue('');
  };

  const handleResetRate = (code: string) => {
    const newRates = { ...customRates };
    delete newRates[code];
    setCustomRates(newRates);
    saveCustomRates(newRates);
    setRateVersion(v => v + 1);
  };

  const fromCurrencyInfo = currencies.find(c => c.code === fromCurrency);
  const toCurrencyInfo = currencies.find(c => c.code === toCurrency);

  // 按地区分组
  const groupedCurrencies = useMemo(() => {
    const groups: Record<string, typeof currencies> = {};
    for (const c of currencies) {
      if (!groups[c.region]) groups[c.region] = [];
      groups[c.region].push(c);
    }
    return groups;
  }, []);

  // 切换货币后固定滚动位置在顶部
  const selectFromCurrency = useCallback((code: string) => {
    setFromCurrency(code);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
  }, []);
  const selectToCurrency = useCallback((code: string) => {
    setToCurrency(code);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
  }, []);

  const handleSwap = useCallback(() => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
  }, [fromCurrency, toCurrency]);

  const lastUpdateText = useMemo(() => {
    if (!lastUpdate) return '未更新';
    const date = new Date(lastUpdate);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - lastUpdate) / 60000);
    if (diffMin < 1) return '刚刚更新';
    if (diffMin < 60) return `${diffMin}分钟前更新`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}小时前更新`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + '更新';
  }, [lastUpdate, rateVersion]);

  const renderRateSourceBadge = (code: string) => {
    const source = getRateSource(code);
    if (source === 'custom') {
      return <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}>自定义</span>;
    }
    if (source === 'live') {
      return <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>实时</span>;
    }
    return <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--paper-deep)', color: 'var(--ink-2)' }}>默认</span>;
  };

  return (
    <div className="page-root pb-nav">
      {/* 头部 */}
      <div className="safe-top px-4 pt-2 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="icon-btn" aria-label="返回">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="page-title">汇率转换</h1>
              <p className="page-subtitle">{lastUpdateText}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="icon-btn disabled:opacity-50"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            aria-label="刷新汇率"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* 转换器主体 */}
        <div className="card mt-4 p-3" style={{ background: 'var(--primary-soft)' }}>
          {/* From */}
          <button
            onClick={() => setShowFromPicker(true)}
            className="w-full flex items-center gap-3 p-3 rounded-card mb-2"
            style={{ background: 'var(--card)' }}
          >
            <span className="text-2xl">{fromCurrencyInfo?.flag}</span>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{fromCurrency}</p>
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{fromCurrencyInfo?.name}</p>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="输入金额"
              className="text-right text-lg font-bold rounded-button px-3 py-1.5 w-32 outline-none"
              style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
            />
          </button>

          {/* Swap */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={handleSwap}
              className="p-2 rounded-full active:rotate-180 transition-all"
              style={{ background: 'var(--primary)', color: '#fff', boxShadow: 'var(--shadow-fab)' }}
              aria-label="交换货币"
            >
              <ArrowDownUp size={18} />
            </button>
          </div>

          {/* To */}
          <button
            onClick={() => setShowToPicker(true)}
            className="w-full flex items-center gap-3 p-3 rounded-card"
            style={{ background: 'var(--card)' }}
          >
            <span className="text-2xl">{toCurrencyInfo?.flag}</span>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{toCurrency}</p>
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{toCurrencyInfo?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold amount-num" style={{ color: 'var(--primary)' }}>
                {isZeroDecimalCurrency(toCurrency) ? convertedAmount.toFixed(0) : convertedAmount.toFixed(2)}
              </p>
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{getCurrencySymbol(toCurrency)}</p>
            </div>
          </button>

          {/* 汇率说明 */}
          <div className="mt-3 text-center text-xs" style={{ color: 'var(--primary-ink)' }}>
            1 {fromCurrency} = {rateText} {toCurrency}
          </div>
        </div>
      </div>

      {/* 汇率列表 */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe size={18} style={{ color: 'var(--ink-2)' }} />
            <h2 className="section-title">各货币对人民币汇率</h2>
            <span className="text-xs" style={{ color: 'var(--ink-2)' }}>({currencies.length}种)</span>
          </div>
          <button
            onClick={() => setShowRateEditor(!showRateEditor)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={showRateEditor
              ? { background: 'var(--primary)', color: '#fff' }
              : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
          >
            <Edit3 size={12} />
            {showRateEditor ? '完成' : '编辑'}
          </button>
        </div>

        {/* 按地区分组显示 */}
        {Object.entries(groupedCurrencies).map(([region, regionCurrencies]) => (
          <div key={region} className="mb-4">
            <p className="text-xs font-medium mb-2 px-1" style={{ color: 'var(--ink-2)' }}>{region}</p>
            <div className="card overflow-hidden p-0">
              {regionCurrencies.map((currency, index) => {
                const rate = getRate(currency.code);
                const isCustom = customRates[currency.code] !== undefined;
                return (
                  <div
                    key={currency.code}
                    className="flex items-center gap-3 p-3"
                    style={index > 0 ? { borderTop: '1px solid var(--line)' } : undefined}
                  >
                    <span className="text-xl flex-shrink-0">{currency.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{currency.code}</p>
                        {renderRateSourceBadge(currency.code)}
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--ink-2)' }}>{currency.name}</p>
                    </div>
                    {showRateEditor && currency.code !== 'CNY' ? (
                      editingRate === currency.code ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editRateValue}
                            onChange={(e) => setEditRateValue(e.target.value)}
                            autoFocus
                            className="w-20 text-right text-sm px-2 py-1 rounded outline-none"
                            style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
                          />
                          <button
                            onClick={() => handleSaveRate(currency.code)}
                            className="p-1 rounded"
                            style={{ color: 'var(--primary)' }}
                          >
                            <CheckIcon size={16} />
                          </button>
                          <button
                            onClick={() => setEditingRate(null)}
                            className="p-1 rounded"
                            style={{ color: 'var(--ink-2)' }}
                          >
                            <XIcon size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>¥{rate.toFixed(rate < 0.01 ? 6 : 4)}</span>
                          <button
                            onClick={() => {
                              setEditingRate(currency.code);
                              setEditRateValue(rate.toString());
                            }}
                            className="p-1 rounded"
                            style={{ color: 'var(--primary)' }}
                          >
                            <Edit3 size={14} />
                          </button>
                          {isCustom && (
                            <button
                              onClick={() => handleResetRate(currency.code)}
                              className="p-1 rounded"
                              style={{ color: 'var(--expense)' }}
                            >
                              <XIcon size={14} />
                            </button>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="text-right">
                        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>¥{rate.toFixed(rate < 0.01 ? 6 : 4)}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{currency.symbol}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <p className="text-xs mt-3 text-center pb-4" style={{ color: 'var(--ink-2)' }}>
          实时汇率来自开放API，每6小时自动更新。点击右上角刷新按钮手动更新。可点击"编辑"自定义汇率。
        </p>
      </div>

      {/* 货币选择器 */}
      <CurrencyPickerModal
        open={showFromPicker}
        selected={fromCurrency}
        searchValue={fromPickerSearch}
        onSearchChange={setFromPickerSearch}
        onClose={() => setShowFromPicker(false)}
        onSelect={selectFromCurrency}
      />
      <CurrencyPickerModal
        open={showToPicker}
        selected={toCurrency}
        searchValue={toPickerSearch}
        onSearchChange={setToPickerSearch}
        onClose={() => setShowToPicker(false)}
        onSelect={selectToCurrency}
      />
    </div>
  );
};
