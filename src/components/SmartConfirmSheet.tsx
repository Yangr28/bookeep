/**
 * 智能记账核对浮层
 *
 * 首页「+」/回车不再直接入账，先弹出本浮层：
 * 展示识别到的金额/类型/分类/账户/备注/时间，分类与账户可在浮层内直接调整，
 * 备注可就地编辑；点「确认记账」才真正保存，点「再改改」携带预填数据跳完整记账页。
 */
import { useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Pencil, Tag, CreditCard as CreditCardIcon, StickyNote, Clock } from 'lucide-react';
import { Account, Category, TransactionType } from '../types';
import { getIcon } from '../utils/iconMap';

export interface SmartConfirmData {
  type: TransactionType;
  amount: string;
  categoryId: string | null;
  accountId: string | null;
  note: string;
  currency?: string;
  dateTime?: Date;
}

interface SmartConfirmSheetProps {
  open: boolean;
  data: SmartConfirmData | null;
  categories: Category[];
  accounts: Account[];
  onClose: () => void;
  onConfirm: (data: SmartConfirmData) => void;
  /** 携带当前（可能已调整的）数据跳完整记账页继续编辑 */
  onEdit: (data: SmartConfirmData) => void;
}

export const SmartConfirmSheet = ({
  open,
  data,
  categories,
  accounts,
  onClose,
  onConfirm,
  onEdit,
}: SmartConfirmSheetProps) => {
  const { t, i18n } = useTranslation();
  const [type, setType] = useState<TransactionType>('expense' as TransactionType);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  // 每次打开浮层时用最新解析结果初始化
  useEffect(() => {
    if (open && data) {
      setType(data.type);
      setCategoryId(data.categoryId);
      setAccountId(data.accountId);
      setNote(data.note);
    }
  }, [open, data]);

  if (!open || !data) return null;

  // 切换收支类型：若原分类不属于新类型则清空，等用户重选
  const switchType = (next: TransactionType) => {
    setType(next);
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat || cat.type !== next) setCategoryId(null);
  };

  const typeCategories = categories.filter((c) => c.type === type);
  const validCategory = categoryId && typeCategories.some((c) => c.id === categoryId);
  const canConfirm = !!(data.amount && validCategory && accountId);

  const buildData = (): SmartConfirmData => ({
    type,
    amount: data.amount,
    categoryId,
    accountId,
    note: note.trim(),
    currency: data.currency,
    dateTime: data.dateTime,
  });

  const timeLocale = i18n.language.startsWith('en') ? 'en-US' : 'zh-CN';
  const timeText = (data.dateTime ?? new Date()).toLocaleString(timeLocale, {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in sheet-scrim"
      onClick={onClose}
    >
      <div
        className="sheet glass-sheet w-full max-w-md animate-slide-up max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('dashboard.confirmTitle')}
      >
        <div className="px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {/* 抓手 */}
          <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: 'var(--line)' }} />

          {/* 标题栏 */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{t('dashboard.confirmTitle')}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{t('dashboard.confirmHint')}</p>
            </div>
            <button onClick={onClose} className="icon-btn w-8 h-8" aria-label="close">
              <X size={16} />
            </button>
          </div>

          {/* 金额 + 收支切换 */}
          <div className="flex items-center justify-between mt-4 mb-4">
            <div className="seg" style={{ minWidth: 150 }}>
              <button
                className={`seg-item ${type === 'expense' ? 'seg-item-active' : ''}`}
                onClick={() => switchType('expense')}
              >
                {t('dashboard.expense')}
              </button>
              <button
                className={`seg-item ${type === 'income' ? 'seg-item-active' : ''}`}
                onClick={() => switchType('income')}
              >
                {t('dashboard.income')}
              </button>
            </div>
            <div className="text-right">
              <span
                className="text-3xl font-bold amount-num"
                style={{ color: type === 'income' ? 'var(--primary)' : 'var(--expense)' }}
              >
                {type === 'income' ? '+' : '-'}¥{data.amount}
              </span>
              {data.currency && data.currency !== 'CNY' && (
                <span className="text-xs ml-1.5" style={{ color: 'var(--ink-2)' }}>{data.currency}</span>
              )}
            </div>
          </div>

          {/* 分类选择 */}
          <FieldRow icon={<Tag size={13} />} label={t('dashboard.fieldCategory')} missing={!validCategory} />
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {typeCategories.map((c) => {
              const Icon = getIcon(c.icon);
              const selected = c.id === categoryId;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full flex-shrink-0 text-xs font-medium transition-all active:scale-95"
                  style={{
                    background: selected ? 'var(--primary-soft)' : 'var(--paper-deep)',
                    color: selected ? 'var(--primary-ink)' : 'var(--ink)',
                    border: `1.5px solid ${selected ? 'var(--primary)' : 'transparent'}`,
                  }}
                >
                  <Icon size={14} style={{ color: c.color }} />
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* 账户选择 */}
          <FieldRow icon={<CreditCardIcon size={13} />} label={t('dashboard.fieldAccount')} missing={!accountId} />
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {accounts.map((a) => {
              const Icon = getIcon(a.icon);
              const selected = a.id === accountId;
              return (
                <button
                  key={a.id}
                  onClick={() => setAccountId(a.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full flex-shrink-0 text-xs font-medium transition-all active:scale-95"
                  style={{
                    background: selected ? 'var(--primary-soft)' : 'var(--paper-deep)',
                    color: selected ? 'var(--primary-ink)' : 'var(--ink)',
                    border: `1.5px solid ${selected ? 'var(--primary)' : 'transparent'}`,
                  }}
                >
                  <Icon size={14} style={{ color: a.color }} />
                  {a.name}
                </button>
              );
            })}
          </div>

          {/* 备注（就地可编辑） */}
          <FieldRow icon={<StickyNote size={13} />} label={t('dashboard.fieldNote')} />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('dashboard.fieldNoteEmpty')}
            className="input-field mb-3 text-sm"
            style={{ padding: '0.625rem 0.875rem' }}
          />

          {/* 时间（展示） */}
          <div className="flex items-center gap-1.5 mb-5 text-xs" style={{ color: 'var(--ink-2)' }}>
            <Clock size={13} />
            <span>{t('dashboard.fieldDateTime')}</span>
            <span className="ml-1 amount-num">{timeText}</span>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2.5">
            <button
              onClick={() => onEdit(buildData())}
              className="btn-ghost flex-1 py-3 text-sm"
            >
              <Pencil size={15} />
              {t('dashboard.continueEdit')}
            </button>
            <button
              onClick={() => canConfirm && onConfirm(buildData())}
              disabled={!canConfirm}
              className="btn-primary flex-[2] py-3 text-sm"
            >
              <Check size={16} />
              {t('dashboard.confirmSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function FieldRow({ icon, label, missing }: { icon: ReactNode; label: string; missing?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 mb-2 text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
      {icon}
      <span>{label}</span>
      {missing && (
        <span className="ml-auto text-[11px]" style={{ color: 'var(--expense)' }}>
          {t('dashboard.incomplete')}
        </span>
      )}
    </div>
  );
}
