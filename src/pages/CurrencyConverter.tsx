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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl max-h-[70vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-white">选择货币</h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <XIcon size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
            <SearchIcon size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索货币名称或代码"
              className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-white placeholder-gray-400"
            />
            {searchValue && (
              <button onClick={() => onSearchChange('')} className="flex-shrink-0">
                <XIcon size={14} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 pb-6">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">未找到匹配的货币</p>
          ) : (
            filtered.map((currency) => (
              <button
                key={currency.code}
                onClick={() => {
                  onSelect(currency.code);
                  onSearchChange('');
                  onClose();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border-2 ${
                  selected === currency.code
                    ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500'
                    : 'bg-gray-50 dark:bg-gray-700 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{currency.flag}</span>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-gray-800 dark:text-white">{currency.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{currency.code} · {currency.region}</p>
                </div>
                <span className="text-gray-400 text-sm flex-shrink-0">{currency.symbol}</span>
                {selected === currency.code && (
                  <CheckIcon size={18} className="text-cyan-500 flex-shrink-0" />
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
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('CNY');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      return <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">自定义</span>;
    }
    if (source === 'live') {
      return <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">实时</span>;
    }
    return <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded">默认</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* 头部 */}
      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white px-6 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">汇率转换</h1>
              <p className="text-cyan-100 text-sm mt-1">{lastUpdateText}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* 转换器主体 */}
        <div className="mt-5 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          {/* From */}
          <button
            onClick={() => setShowFromPicker(true)}
            className="w-full flex items-center gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors mb-2"
          >
            <span className="text-2xl">{fromCurrencyInfo?.flag}</span>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">{fromCurrency}</p>
              <p className="text-xs text-white/70">{fromCurrencyInfo?.name}</p>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="输入金额"
              className="bg-white/20 text-right text-lg font-bold rounded-lg px-3 py-1.5 w-32 outline-none placeholder-white/50"
            />
          </button>

          {/* Swap */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={handleSwap}
              className="p-2 bg-white/30 rounded-full hover:bg-white/40 active:rotate-180 transition-all"
            >
              <ArrowDownUp size={18} />
            </button>
          </div>

          {/* To */}
          <button
            onClick={() => setShowToPicker(true)}
            className="w-full flex items-center gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
          >
            <span className="text-2xl">{toCurrencyInfo?.flag}</span>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">{toCurrency}</p>
              <p className="text-xs text-white/70">{toCurrencyInfo?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">
                {isZeroDecimalCurrency(toCurrency) ? convertedAmount.toFixed(0) : convertedAmount.toFixed(2)}
              </p>
              <p className="text-xs text-white/60">{getCurrencySymbol(toCurrency)}</p>
            </div>
          </button>

          {/* 汇率说明 */}
          <div className="mt-3 text-center text-xs text-white/70">
            1 {fromCurrency} = {rateText} {toCurrency}
          </div>
        </div>
      </div>

      {/* 汇率列表 */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-gray-500 dark:text-gray-400" />
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">各货币对人民币汇率</h2>
            <span className="text-xs text-gray-400">({currencies.length}种)</span>
          </div>
          <button
            onClick={() => setShowRateEditor(!showRateEditor)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              showRateEditor
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Edit3 size={12} />
            {showRateEditor ? '完成' : '编辑'}
          </button>
        </div>

        {/* 按地区分组显示 */}
        {Object.entries(groupedCurrencies).map(([region, regionCurrencies]) => (
          <div key={region} className="mb-4">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2 px-1">{region}</p>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              {regionCurrencies.map((currency, index) => {
                const rate = getRate(currency.code);
                const isCustom = customRates[currency.code] !== undefined;
                return (
                  <div
                    key={currency.code}
                    className={`flex items-center gap-3 p-3 ${
                      index > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{currency.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 dark:text-white text-sm">{currency.code}</p>
                        {renderRateSourceBadge(currency.code)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currency.name}</p>
                    </div>
                    {showRateEditor && currency.code !== 'CNY' ? (
                      editingRate === currency.code ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editRateValue}
                            onChange={(e) => setEditRateValue(e.target.value)}
                            autoFocus
                            className="w-20 text-right text-sm px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded outline-none text-gray-800 dark:text-white"
                          />
                          <button
                            onClick={() => handleSaveRate(currency.code)}
                            className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"
                          >
                            <CheckIcon size={16} />
                          </button>
                          <button
                            onClick={() => setEditingRate(null)}
                            className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <XIcon size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-600 dark:text-gray-300">¥{rate.toFixed(rate < 0.01 ? 6 : 4)}</span>
                          <button
                            onClick={() => {
                              setEditingRate(currency.code);
                              setEditRateValue(rate.toString());
                            }}
                            className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          >
                            <Edit3 size={14} />
                          </button>
                          {isCustom && (
                            <button
                              onClick={() => handleResetRate(currency.code)}
                              className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <XIcon size={14} />
                            </button>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800 dark:text-white">¥{rate.toFixed(rate < 0.01 ? 6 : 4)}</p>
                        <p className="text-xs text-gray-400">{currency.symbol}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center pb-4">
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
