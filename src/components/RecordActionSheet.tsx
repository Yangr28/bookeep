import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Copy, Bookmark, Edit3, Trash2, Link2, Unlink, X } from 'lucide-react';
import { Transaction } from '../types';
import { useStore } from '../store/useStore';
import { formatCurrencyShort, formatDateTime } from '../utils/format';

interface RecordActionSheetProps {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit?: (transaction: Transaction) => void;
  onDuplicate?: (transaction: Transaction) => void;
  onCreateTemplate?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

/** 记录操作菜单：编辑 / 复制记一笔 / 存为模板 / 退款关联 / 删除（首页与账单页共用） */
export const RecordActionSheet = ({ transaction, onClose, onEdit, onDuplicate, onCreateTemplate, onDelete }: RecordActionSheetProps) => {
  const { t } = useTranslation();
  const categories = useStore((state) => state.categories);
  const transactions = useStore((state) => state.transactions);
  const linkTransactions = useStore((state) => state.linkTransactions);
  const unlinkTransaction = useStore((state) => state.unlinkTransaction);
  // 关联候选弹层（退款收入找原支出 / 原支出找退款收入）
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  if (!transaction) return null;

  const category = categories.find((c) => c.id === transaction.categoryId);
  const isIncome = transaction.type === 'income';

  // 当前退款已关联的原支出
  const linkedExpense = transaction.linkedTransactionId
    ? transactions.find((x) => x.id === transaction.linkedTransactionId)
    : null;
  // 当前支出被哪些退款收入关联
  const linkedRefunds = transaction.type === 'expense'
    ? transactions.filter((x) => x.linkedTransactionId === transaction.id)
    : [];
  const linkedRefundTotal = linkedRefunds.reduce((sum, x) => sum + x.amount, 0);

  // 候选：对方类型记录，金额越接近越靠前，同金额再按时间倒序
  const candidates = transactions
    .filter((x) => x.id !== transaction.id && x.type === (isIncome ? 'expense' : 'income'))
    .sort((a, b) => {
      const diff = Math.abs(a.amount - transaction.amount) - Math.abs(b.amount - transaction.amount);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 20);

  const handlePick = (target: Transaction) => {
    if (isIncome) linkTransactions(transaction.id, target.id);
    else linkTransactions(target.id, transaction.id);
    setShowLinkPicker(false);
    onClose();
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] animate-fade-in"
        style={{ background: 'rgba(43,41,37,0.45)' }}
        onClick={onClose}
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-[101] animate-slide-up rounded-t-card px-4 pt-4"
        style={{
          background: 'var(--card-solid)',
          boxShadow: '0 -8px 40px rgba(15,17,24,0.25)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <p className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
              {category?.name || t('common.unclassified')}
            </p>
            <p className="text-xs mt-0.5 amount-num" style={{ color: 'var(--ink-2)' }}>
              {formatDateTime(transaction.createdAt)}
            </p>
          </div>
          <p
            className="font-bold amount-num flex-shrink-0 ml-3"
            style={{ color: isIncome ? 'var(--primary)' : 'var(--expense)' }}
          >
            {isIncome ? '+' : '-'}{formatCurrencyShort(transaction.amount)}
          </p>
        </div>

        <div className="space-y-1.5">
          {onDuplicate && (
            <button
              onClick={() => { onDuplicate(transaction); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium text-left active:scale-[0.99] transition-transform"
              style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
            >
              <Copy size={18} style={{ color: 'var(--primary)' }} />
              {t('allRecords.copyRecord')}
            </button>
          )}
          {onCreateTemplate && (
            <button
              onClick={() => { onCreateTemplate(transaction); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium text-left active:scale-[0.99] transition-transform"
              style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
            >
              <Bookmark size={18} style={{ color: 'var(--primary)' }} />
              {t('allRecords.saveAsTemplate')}
            </button>
          )}
          {/* 退款关联：收入找原支出、支出看已退款并支持补关联 */}
          {isIncome ? (
            linkedExpense ? (
              <div className="w-full flex items-center gap-3 px-4 py-3 rounded-button" style={{ background: 'var(--primary-soft)' }}>
                <Link2 size={18} style={{ color: 'var(--primary-ink)' }} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--primary-ink)' }}>{t('allRecords.refundLinkedTo')}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--primary-ink)' }}>
                    {formatDateTime(linkedExpense.createdAt)} · {formatCurrencyShort(linkedExpense.amount)}
                    {linkedExpense.note ? ` · ${linkedExpense.note}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => { unlinkTransaction(transaction.id); onClose(); }}
                  className="flex items-center gap-1 text-xs font-medium flex-shrink-0"
                  style={{ color: 'var(--expense)' }}
                >
                  <Unlink size={14} />
                  {t('allRecords.unlinkRefund')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLinkPicker(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium text-left active:scale-[0.99] transition-transform"
                style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
              >
                <Link2 size={18} style={{ color: 'var(--primary)' }} />
                {t('allRecords.linkRefundIncome')}
              </button>
            )
          ) : linkedRefunds.length > 0 ? (
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-button" style={{ background: 'var(--primary-soft)' }}>
              <Link2 size={18} style={{ color: 'var(--primary-ink)' }} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--primary-ink)' }}>
                  {t('allRecords.refundedAmount', { amount: formatCurrencyShort(linkedRefundTotal) })}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--primary-ink)' }}>
                  {t('allRecords.refundCount', { count: linkedRefunds.length })}
                </p>
              </div>
              <button
                onClick={() => { linkedRefunds.forEach((r) => unlinkTransaction(r.id)); onClose(); }}
                className="flex items-center gap-1 text-xs font-medium flex-shrink-0"
                style={{ color: 'var(--expense)' }}
              >
                <Unlink size={14} />
                {t('allRecords.unlinkRefund')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLinkPicker(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium text-left active:scale-[0.99] transition-transform"
              style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
            >
              <Link2 size={18} style={{ color: 'var(--primary)' }} />
              {t('allRecords.linkRefundExpense')}
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => { onEdit(transaction); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium text-left active:scale-[0.99] transition-transform"
              style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
            >
              <Edit3 size={18} style={{ color: 'var(--ink-2)' }} />
              {t('common.edit')}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onDelete(transaction); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-button text-sm font-medium text-left active:scale-[0.99] transition-transform"
              style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}
            >
              <Trash2 size={18} />
              {t('common.delete')}
            </button>
          )}
        </div>

        <button onClick={onClose} className="btn-ghost w-full mt-3">
          {t('common.cancel')}
        </button>
      </div>

      {/* 关联候选弹层 */}
      {showLinkPicker && (
        <>
          <div
            className="fixed inset-0 z-[102] animate-fade-in"
            style={{ background: 'rgba(43,41,37,0.45)' }}
            onClick={() => setShowLinkPicker(false)}
          />
          <div
            className="fixed left-0 right-0 bottom-0 z-[103] animate-slide-up rounded-t-card px-4 pt-4"
            style={{
              background: 'var(--card-solid)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
                {isIncome ? t('allRecords.linkPickerExpenseTitle') : t('allRecords.linkPickerIncomeTitle')}
              </h2>
              <button onClick={() => setShowLinkPicker(false)} className="icon-btn" aria-label={t('common.cancel')}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: 'var(--ink-2)' }}>
                  {t('allRecords.linkNoCandidate')}
                </p>
              ) : (
                candidates.map((item) => {
                  const itemCategory = categories.find((c) => c.id === item.categoryId);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handlePick(item)}
                      className="w-full flex items-center gap-3 p-3 rounded-button text-left active:brightness-95"
                      style={{ background: 'var(--paper)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                          {itemCategory?.name || t('common.unclassified')}
                          {item.note ? ` · ${item.note}` : ''}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{formatDateTime(item.createdAt)}</p>
                      </div>
                      <span className="text-sm font-semibold amount-num flex-shrink-0" style={{ color: 'var(--expense)' }}>
                        {formatCurrencyShort(item.amount)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>,
    document.body
  );
};
