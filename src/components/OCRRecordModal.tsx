import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Check, AlertCircle, Loader2, ChevronRight, Download, Calendar, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CategoryCard } from './CategoryCard';
import { CalendarPicker } from './CalendarPicker';
import { TimePicker } from './TimePicker';
import { TransactionType } from '../types';
import { recognizeImage, extractTransactionsFromText, ParsedTransaction } from '../utils/ocrParser';
import type { OCRCacheStatus } from '../utils/ocrCache';
import { formatDateTime } from '../utils/format';

interface OCRRecordModalProps {
  onClose: () => void;
}

export const OCRRecordModal = ({ onClose }: OCRRecordModalProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<OCRCacheStatus | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'edit'>('upload');
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  // 自定义日期/时间选择器作用于哪一笔（-1 为关闭）
  const [datePickerIndex, setDatePickerIndex] = useState<number | null>(null);
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);

  const categories = useStore((state) => state.categories);
  const accounts = useStore((state) => state.accounts);
  const addTransaction = useStore((state) => state.addTransaction);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('ocr.error.notImage'));
      return;
    }

    setIsLoading(true);
    setError('');
    setDownloadStatus(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = () => reject(new Error(t('ocr.error.readFailed')));
        reader.readAsDataURL(file);
      });

      const text = await recognizeImage(dataUrl, {
        onProgress: (status) => {
          setDownloadStatus(status);
        },
      });

      setDownloadStatus(null);

      const transactions = extractTransactionsFromText(text, categories);
      setParsedTransactions(transactions);

      if (transactions.length === 0) {
        setError(t('ocr.error.noTransactions'));
        setStep('upload');
      } else {
        setStep('preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ocr.error.recognizeFailed'));
      setStep('upload');
    } finally {
      setIsLoading(false);
      setDownloadStatus(null);
    }
  }, [categories, t]);

  const handleEditTransaction = useCallback((index: number, field: keyof ParsedTransaction, value: string | Date | null) => {
    setParsedTransactions(prev => {
      const newTransactions = [...prev];
      newTransactions[index] = { ...newTransactions[index], [field]: value };
      return newTransactions;
    });
  }, []);

  const handleCategoryChange = useCallback((index: number, categoryId: string) => {
    setParsedTransactions(prev => {
      const newTransactions = [...prev];
      newTransactions[index] = { ...newTransactions[index], categoryId };
      return newTransactions;
    });
  }, []);

  const handleTypeChange = useCallback((index: number, type: TransactionType) => {
    setParsedTransactions(prev => {
      const newTransactions = [...prev];
      newTransactions[index] = { ...newTransactions[index], type, categoryId: null };
      return newTransactions;
    });
  }, []);

  const handleDeleteTransaction = useCallback((index: number) => {
    setParsedTransactions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedAccountId) {
      setError(t('ocr.error.accountRequired'));
      return;
    }

    let count = 0;
    for (const transaction of parsedTransactions) {
      if (transaction.amount && parseFloat(transaction.amount) > 0) {
        addTransaction({
          type: transaction.type,
          amount: parseFloat(transaction.amount),
          categoryId: transaction.categoryId || 'other',
          accountId: selectedAccountId,
          note: transaction.note,
          createdAt: transaction.date.toISOString(),
        });
        count++;
      }
    }

    setSuccessCount(count);
    setStep('upload');
    setParsedTransactions([]);
    setSelectedAccountId(null);
    setError('');
  }, [parsedTransactions, selectedAccountId, addTransaction, t]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setParsedTransactions([]);
    setSelectedAccountId(null);
    setError('');
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in sheet-scrim"
      onClick={onClose}
    >
      <div
        className="sheet relative w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between p-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{t('ocr.title')}</h3>
          <button onClick={onClose} className="icon-btn w-9 h-9">
            <X size={18} />
          </button>
        </div>

        {successCount > 0 && (
          <div
            className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
          >
            <Check size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium">{t('ocr.successCount', { n: successCount })}</span>
          </div>
        )}

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">
          {step === 'upload' && (
            <div className="p-5 safe-bottom">
              {error && (
                <div
                  className="px-4 py-3 rounded-button mb-4 flex items-center gap-2"
                  style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}
                >
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div
                className="border-2 border-dashed rounded-card p-8 text-center cursor-pointer transition-colors hover:border-[color:var(--primary)]"
                style={{ borderColor: 'var(--line)' }}
                onClick={() => document.getElementById('ocr-upload')?.click()}
              >
                <input
                  id="ocr-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                >
                  <Upload size={28} />
                </div>
                <p className="font-medium mb-2" style={{ color: 'var(--ink)' }}>{t('ocr.upload.title')}</p>
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('ocr.upload.subtitle')}</p>
              </div>

              <div className="mt-4 p-4 rounded-card" style={{ background: 'var(--paper-deep)' }}>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {t('ocr.upload.hint')}
                </p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="p-4 safe-bottom">
              <div className="mb-4">
                <p className="text-sm mb-2" style={{ color: 'var(--ink-2)' }}>
                  {t('ocr.preview.foundCount', { n: parsedTransactions.length })}
                </p>
                <button
                  onClick={() => setStep('edit')}
                  className="btn-primary w-full"
                >
                  <span>{t('ocr.preview.confirmEdit')}</span>
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {parsedTransactions.map((transaction, index) => (
                  <div key={index} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={
                          transaction.type === 'income'
                            ? { background: 'var(--primary-soft)', color: 'var(--primary-ink)' }
                            : { background: 'var(--expense-soft)', color: 'var(--expense)' }
                        }
                      >
                        {transaction.type === 'income' ? t('common.income') : t('common.expense')}
                      </span>
                      <span className="text-lg font-bold amount-num" style={{ color: 'var(--ink)' }}>
                        {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{transaction.note}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>
                      {formatDateTime(transaction.date.toISOString())}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleReset}
                className="btn-ghost w-full mt-4"
              >
                {t('ocr.preview.reupload')}
              </button>
            </div>
          )}

          {step === 'edit' && (
            <div className="p-4 safe-bottom">
              <div className="card p-4 mb-4">
                <p className="text-sm mb-3" style={{ color: 'var(--ink-2)' }}>{t('ocr.edit.selectAccount')}</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {accounts.map((account) => {
                    const selected = selectedAccountId === account.id;
                    return (
                      <button
                        key={account.id}
                        onClick={() => setSelectedAccountId(account.id)}
                        className={`chip flex-shrink-0 ${selected ? 'chip-active' : 'chip-inactive'}`}
                      >
                        {account.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 max-h-[45vh] overflow-y-auto pb-1">
                {parsedTransactions.map((transaction, index) => (
                  <div key={index} className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                        {t('ocr.edit.recordNo', { n: index + 1 })}
                      </span>
                      <button
                        onClick={() => handleDeleteTransaction(index)}
                        className="icon-btn w-8 h-8"
                        style={{ background: 'transparent', color: 'var(--ink-2)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => handleTypeChange(index, 'expense')}
                        className="px-4 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
                        style={
                          transaction.type === 'expense'
                            ? { background: 'var(--expense)', color: '#fff' }
                            : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }
                        }
                      >
                        {t('common.expense')}
                      </button>
                      <button
                        onClick={() => handleTypeChange(index, 'income')}
                        className="px-4 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
                        style={
                          transaction.type === 'income'
                            ? { background: 'var(--primary)', color: '#fff' }
                            : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }
                        }
                      >
                        {t('common.income')}
                      </button>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{t('ocr.edit.amount')}</p>
                      <input
                        type="text"
                        value={transaction.amount}
                        onChange={(e) => handleEditTransaction(index, 'amount', e.target.value)}
                        className="input-field amount-num text-lg font-bold py-2.5"
                      />
                    </div>

                    <div className="mb-3">
                      <p className="text-xs mb-2" style={{ color: 'var(--ink-2)' }}>{t('ocr.edit.category')}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {categories
                          .filter(c => c.type === transaction.type)
                          .slice(0, 8)
                          .map((category) => (
                            <CategoryCard
                              key={category.id}
                              category={category}
                              isSelected={transaction.categoryId === category.id}
                              onClick={() => handleCategoryChange(index, category.id)}
                            />
                          ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{t('ocr.edit.note')}</p>
                      <input
                        type="text"
                        value={transaction.note}
                        onChange={(e) => handleEditTransaction(index, 'note', e.target.value)}
                        className="input-field py-2.5 text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-xs flex-shrink-0" style={{ color: 'var(--ink-2)' }}>{t('ocr.edit.date')}</p>
                      {/* 自定义日期/时间选择器（严禁原生 input[type=date/time]：Android WebView 畸形全屏选择器） */}
                      <button
                        type="button"
                        onClick={() => setDatePickerIndex(index)}
                        className="btn-ghost flex-1 py-2 text-xs"
                      >
                        <Calendar size={13} />
                        <span className="amount-num">
                          {transaction.date.getFullYear()}-
                          {String(transaction.date.getMonth() + 1).padStart(2, '0')}-
                          {String(transaction.date.getDate()).padStart(2, '0')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimePickerIndex(index)}
                        className="btn-ghost py-2 px-3 text-xs"
                      >
                        <Clock size={13} />
                        <span className="amount-num">
                          {String(transaction.date.getHours()).padStart(2, '0')}:
                          {String(transaction.date.getMinutes()).padStart(2, '0')}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="flex gap-3 mt-4 pt-4"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                <button
                  onClick={() => setStep('preview')}
                  className="btn-ghost flex-1"
                >
                  {t('ocr.edit.back')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedAccountId}
                  className="btn-primary flex-1"
                >
                  {t('ocr.edit.confirm', { n: parsedTransactions.length })}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 识别中 / 引擎下载中 */}
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center animate-fade-in sheet-scrim"
          >
            <div className="card p-6 flex flex-col items-center min-w-[240px] mx-4">
              {downloadStatus?.isDownloading ? (
                <>
                  <Download size={32} className="animate-bounce mb-3" style={{ color: 'var(--primary)' }} />
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    {t('ocr.progress.downloading', { file: downloadStatus.currentFile })}
                  </p>
                  <div
                    className="w-full h-2 rounded-full mb-2 overflow-hidden"
                    style={{ background: 'var(--paper-deep)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${downloadStatus.downloadProgress}%`, background: 'var(--primary)' }}
                    />
                  </div>
                  <p className="text-xs amount-num" style={{ color: 'var(--ink-2)' }}>
                    {downloadStatus.downloadProgress}%
                  </p>
                  <p className="text-xs mt-2 text-center" style={{ color: 'var(--ink-2)' }}>
                    {t('ocr.progress.firstTimeHint')}
                  </p>
                </>
              ) : (
                <>
                  <Loader2 size={32} className="animate-spin mb-3" style={{ color: 'var(--primary)' }} />
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>{t('ocr.progress.recognizing')}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 自定义日期/时间选择器（作用于当前编辑的那一笔） */}
      {datePickerIndex !== null && parsedTransactions[datePickerIndex] && (
        <CalendarPicker
          selectedDate={parsedTransactions[datePickerIndex].date}
          onDateChange={(d) => {
            const old = parsedTransactions[datePickerIndex].date;
            const next = new Date(d);
            next.setHours(old.getHours(), old.getMinutes(), 0, 0);
            handleEditTransaction(datePickerIndex, 'date', next);
          }}
          onClose={() => setDatePickerIndex(null)}
        />
      )}
      {timePickerIndex !== null && parsedTransactions[timePickerIndex] && (
        <TimePicker
          selectedTime={{
            hours: parsedTransactions[timePickerIndex].date.getHours(),
            minutes: parsedTransactions[timePickerIndex].date.getMinutes(),
          }}
          onTimeChange={(h, m) => {
            const next = new Date(parsedTransactions[timePickerIndex].date);
            next.setHours(h, m, 0, 0);
            handleEditTransaction(timePickerIndex, 'date', next);
          }}
          onClose={() => setTimePickerIndex(null)}
        />
      )}
    </div>
  );
};
