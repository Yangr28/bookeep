/**
 * 可撤销删除：删除后显示"撤销"Toast，5 秒内可点击撤销恢复。
 * 用法：
 *   // 在 App 顶层创建（toast 队列统一）：
 *   const undoableDelete = useUndoableDelete({ showWithAction: showToastWithAction });
 *   undoableDelete.deleteOne(transaction);
 *
 * 适用范围：交易流水（其余 slice 的删除暂未接入，后续按需扩展）。
 * 撤销时调用 restoreTransaction 保留原 ID 与 createdAt，账户余额自动恢复。
 */
import { useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './useToast';
import { useTranslation } from 'react-i18next';
import type { Transaction } from '../types';

interface ToastController {
  showWithAction: (message: string, actionLabel: string, onAction: () => void, variant?: 'success' | 'info' | 'error', duration?: number) => void;
}

export function useUndoableDelete(toastController?: ToastController) {
  const internalToast = useToast();
  const { showWithAction } = toastController ?? internalToast;
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const deleteTransactionsBatch = useStore((s) => s.deleteTransactionsBatch);
  const restoreTransaction = useStore((s) => s.restoreTransaction);
  const { t } = useTranslation();
  // 防御：避免重复撤销触发
  const restoringRef = useRef(false);

  /** 单条删除 + 撤销 Toast */
  const deleteOne = useCallback(
    (transaction: Transaction) => {
      deleteTransaction(transaction.id);
      showWithAction(
        t('app.toast.deleted'),
        t('common.undo'),
        () => {
          if (restoringRef.current) return;
          restoringRef.current = true;
          restoreTransaction(transaction);
          restoringRef.current = false;
        },
        'info',
        5000,
      );
    },
    [deleteTransaction, restoreTransaction, showWithAction, t],
  );

  /** 批量删除 + 撤销 Toast（传入完整快照，撤销时按 ID 逐条恢复） */
  const deleteBatch = useCallback(
    (transactions: Transaction[]) => {
      if (transactions.length === 0) return;
      const snapshot = transactions.map((t) => ({ ...t }));
      deleteTransactionsBatch(transactions.map((t) => t.id));
      showWithAction(
        t('app.toast.batchDeleted', { count: snapshot.length }),
        t('common.undo'),
        () => {
          if (restoringRef.current) return;
          restoringRef.current = true;
          snapshot.forEach((t) => restoreTransaction(t));
          restoringRef.current = false;
        },
        'info',
        5000,
      );
    },
    [deleteTransactionsBatch, restoreTransaction, showWithAction, t],
  );

  return { deleteOne, deleteBatch };
}
