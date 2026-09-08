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
    <div className="fixed inset-0 bg-black/50 flex items-end z-[100]">
      <div className="bg-white dark:bg-gray-900 w-full rounded-t-3xl max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">批量记账</h2>
          <div className="w-10"></div>
        </div>

        {successCount > 0 && (
          <div className="bg-primary-50 dark:bg-primary-900/30 px-4 py-3 flex items-center gap-2">
            <Check size={18} className="text-primary-500" />
            <span className="text-primary-600 dark:text-primary-400 text-sm">成功添加 {successCount} 条记录</span>
          </div>
        )}

        {step === 'upload' && (
          <div className="p-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 px-4 py-3 rounded-card mb-4 flex items-center gap-2">
                <AlertCircle size={18} className="text-red-500" />
                <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-card p-8 text-center hover:border-primary-500 transition-colors cursor-pointer" onClick={() => document.getElementById('ocr-upload')?.click()}>
              <input
                id="ocr-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">上传支付记录截图</p>
              <p className="text-gray-400 text-sm">支持微信、支付宝等支付账单截图</p>
            </div>

            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-card">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                提示：请确保截图清晰，包含交易金额和描述信息。支持识别多条交易记录。
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="p-4">
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">识别到 {parsedTransactions.length} 条记录</p>
              <button
                onClick={() => setStep('edit')}
                className="w-full py-3 bg-primary-500 text-white rounded-card font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
              >
                <span>确认并编辑</span>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {parsedTransactions.map((transaction, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      transaction.type === 'income' 
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '收入' : '支出'}
                    </span>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">
                      {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{transaction.note}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDateTime(transaction.date.toISOString())}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={handleReset}
              className="w-full mt-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-card font-medium transition-colors"
            >
              重新上传
            </button>
          </div>
        )}

        {step === 'edit' && (
          <div className="p-4">
            <div className="bg-white dark:bg-gray-800 rounded-card p-4 mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">选择账户</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg border-2 transition-all ${
                      selectedAccountId === account.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      selectedAccountId === account.id
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {account.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 max-h-[45vh] overflow-y-auto">
              {parsedTransactions.map((transaction, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      记录 {index + 1}
                    </span>
                    <button
                      onClick={() => handleDeleteTransaction(index)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => handleTypeChange(index, 'expense')}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                        transaction.type === 'expense'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      支出
                    </button>
                    <button
                      onClick={() => handleTypeChange(index, 'income')}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                        transaction.type === 'income'
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      收入
                    </button>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">金额</p>
                    <input
                      type="text"
                      value={transaction.amount}
                      onChange={(e) => handleEditTransaction(index, 'amount', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-white text-lg font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">分类</p>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">备注</p>
                    <input
                      type="text"
                      value={transaction.note}
                      onChange={(e) => handleEditTransaction(index, 'note', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">日期时间</p>
                    <input
                      type="datetime-local"
                      value={transaction.date.toISOString().slice(0, 16)}
                      onChange={(e) => handleEditTransaction(index, 'date', new Date(e.target.value))}
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-white text-xs outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setStep('preview')}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-card font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                返回
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedAccountId}
                className={`flex-1 py-3 rounded-card font-medium transition-all ${
                  selectedAccountId
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                }`}
              >
                确认记账 ({parsedTransactions.length})
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-card p-6 flex flex-col items-center min-w-[240px]">
              {downloadStatus?.isDownloading ? (
                <>
                  <Download size={32} className="text-blue-500 animate-bounce mb-3" />
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    正在下载{downloadStatus.currentFile}...
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadStatus.downloadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{downloadStatus.downloadProgress}%</p>
                  <p className="text-xs text-gray-400 mt-2">首次使用需要下载识别引擎，之后可离线使用</p>
                </>
              ) : (
                <>
                  <Loader2 size={32} className="text-primary-500 animate-spin mb-3" />
                  <p className="text-gray-600 dark:text-gray-300">正在识别图片...</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
