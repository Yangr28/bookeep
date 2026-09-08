import { useState, useCallback } from 'react';
import { X, Upload, Check, AlertCircle, Loader2, ChevronRight, Download } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CategoryCard } from './CategoryCard';
import { TransactionType } from '../types';
import { recognizeImage, extractTransactionsFromText, ParsedTransaction } from '../utils/ocrParser';
import type { OCRCacheStatus } from '../utils/ocrCache';
import { formatDateTime } from '../utils/format';

interface OCRRecordModalProps {
  onClose: () => void;
}

export const OCRRecordModal = ({ onClose }: OCRRecordModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<OCRCacheStatus | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'edit'>('upload');
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(0);

  const categories = useStore((state) => state.categories);
  const accounts = useStore((state) => state.accounts);
  const addTransaction = useStore((state) => state.addTransaction);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    setIsLoading(true);
    setError('');
    setDownloadStatus(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;

        const text = await recognizeImage(dataUrl, {
          onProgress: (status) => {
            setDownloadStatus(status);
          },
        });

        setDownloadStatus(null);

        const transactions = extractTransactionsFromText(text, categories);
        setParsedTransactions(transactions);

        if (transactions.length === 0) {
          setError('未能识别到交易记录，请尝试清晰的截图');
          setStep('upload');
        } else {
          setStep('preview');
        }

        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('图片识别失败，请重试');
      setIsLoading(false);
      setDownloadStatus(null);
    }
  }, [categories]);

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
      setError('请选择账户');
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
  }, [parsedTransactions, selectedAccountId, addTransaction]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setParsedTransactions([]);
    setSelectedAccountId(null);
    setError('');
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in"
      style={{ background: 'rgba(43,41,37,0.45)' }}
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
          <h3 className="font-bold" style={{ color: 'var(--ink)' }}>批量记账</h3>
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
            <span className="text-sm font-medium">成功添加 {successCount} 条记录</span>
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
                <p className="font-medium mb-2" style={{ color: 'var(--ink)' }}>上传支付记录截图</p>
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>支持微信、支付宝等支付账单截图</p>
              </div>

              <div className="mt-4 p-4 rounded-card" style={{ background: 'var(--paper-deep)' }}>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  提示：请确保截图清晰，包含交易金额和描述信息。支持识别多条交易记录。
                </p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="p-4 safe-bottom">
              <div className="mb-4">
                <p className="text-sm mb-2" style={{ color: 'var(--ink-2)' }}>
                  识别到 {parsedTransactions.length} 条记录
                </p>
                <button
                  onClick={() => setStep('edit')}
                  className="btn-primary w-full"
                >
                  <span>确认并编辑</span>
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
                        {transaction.type === 'income' ? '收入' : '支出'}
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
                重新上传
              </button>
            </div>
          )}

          {step === 'edit' && (
            <div className="p-4 safe-bottom">
              <div className="card p-4 mb-4">
                <p className="text-sm mb-3" style={{ color: 'var(--ink-2)' }}>选择账户</p>
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
                        记录 {index + 1}
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
                        支出
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
                        收入
                      </button>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs mb-1" style={{ color: 'var(--ink-2)' }}>金额</p>
                      <input
                        type="text"
                        value={transaction.amount}
                        onChange={(e) => handleEditTransaction(index, 'amount', e.target.value)}
                        className="input-field amount-num text-lg font-bold py-2.5"
                      />
                    </div>

                    <div className="mb-3">
                      <p className="text-xs mb-2" style={{ color: 'var(--ink-2)' }}>分类</p>
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
                      <p className="text-xs mb-1" style={{ color: 'var(--ink-2)' }}>备注</p>
                      <input
                        type="text"
                        value={transaction.note}
                        onChange={(e) => handleEditTransaction(index, 'note', e.target.value)}
                        className="input-field py-2.5 text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-xs flex-shrink-0" style={{ color: 'var(--ink-2)' }}>日期时间</p>
                      <input
                        type="datetime-local"
                        value={transaction.date.toISOString().slice(0, 16)}
                        onChange={(e) => handleEditTransaction(index, 'date', new Date(e.target.value))}
                        className="input-field flex-1 py-2 text-xs"
                      />
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
                  返回
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedAccountId}
                  className="btn-primary flex-1"
                >
                  确认记账 ({parsedTransactions.length})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 识别中 / 引擎下载中 */}
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center animate-fade-in"
            style={{ background: 'rgba(43,41,37,0.45)' }}
          >
            <div className="card p-6 flex flex-col items-center min-w-[240px] mx-4">
              {downloadStatus?.isDownloading ? (
                <>
                  <Download size={32} className="animate-bounce mb-3" style={{ color: 'var(--primary)' }} />
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                    正在下载{downloadStatus.currentFile}...
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
                    首次使用需要下载识别引擎，之后可离线使用
                  </p>
                </>
              ) : (
                <>
                  <Loader2 size={32} className="animate-spin mb-3" style={{ color: 'var(--primary)' }} />
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>正在识别图片...</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
