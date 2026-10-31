import { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, ChevronUp } from 'lucide-react';
import { TransactionCard } from '../TransactionCard';
import Empty from '../Empty';
import { Transaction } from '../../types';

interface RecentRecordsCardProps {
  transactions: Transaction[];
  hasOlderRecords: boolean;
  pullIndicatorRef: RefObject<HTMLDivElement>;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onAction: (tx: Transaction) => void;
}

/** 近三日记录列表 + 上拉展开全部账单提示 */
export const RecentRecordsCard = ({
  transactions,
  hasOlderRecords,
  pullIndicatorRef,
  onEdit,
  onDelete,
  onAction,
}: RecentRecordsCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="px-4 mt-4">
      <h2 className="section-title">{t('dashboard.recentRecords')}</h2>
      {transactions.length === 0 ? (
        <Empty icon={Wallet} title={t('dashboard.noRecords')} description={t('dashboard.noRecordsHint')} />
      ) : (
        <div>
          {transactions.map((transaction, index) => (
            <div key={transaction.id} data-record-id={transaction.id} className="animate-stagger-in" style={{ animationDelay: `${index * 50}ms` }}>
              <TransactionCard
                transaction={transaction}
                onDelete={() => onDelete(transaction)}
                onEdit={() => onEdit(transaction)}
                onPress={() => onAction(transaction)}
              />
            </div>
          ))}
        </div>
      )}
      {hasOlderRecords && (
        <div
          ref={pullIndicatorRef}
          className="flex flex-col items-center justify-center overflow-hidden transition-[height] duration-150 ease-out"
          style={{ height: 0, opacity: 0 }}
        >
          <ChevronUp size={16} className="transition-transform duration-200 flex-shrink-0" style={{ color: 'var(--primary)' }} />
          <span className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>{t('dashboard.pullToAllRecords')}</span>
        </div>
      )}
    </div>
  );
};
