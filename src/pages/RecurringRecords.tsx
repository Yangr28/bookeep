import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { todayKey } from '../utils/date';
import { ArrowLeft, Plus, Repeat, Trash2, Edit3, Play, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getIcon } from '../utils/iconMap';
import { CalendarPicker } from '../components/CalendarPicker';
import { RecurringRecord } from '../types';

const RecurringRecords = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation();
  const { recurringRecords, categories, accounts, addRecurringRecord, updateRecurringRecord, deleteRecurringRecord, toggleRecurringRecord } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecurringRecord | null>(null);
  // 日期选择弹窗目标：'start' | 'end' | null
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);

  const parseDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const [form, setForm] = useState({
    type: 'expense' as 'expense' | 'income',
    amount: '',
    categoryId: '',
    note: '',
    accountId: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    dayOfMonth: new Date().getDate(),
    dayOfWeek: 1,
    startDate: todayKey(),
    endDate: '',
  });

  const filteredCategories = categories.filter((c) => c.type === form.type);

  const openAddModal = () => {
    setEditingRecord(null);
    const defaultAccount = accounts[0];
    const defaultCategory = filteredCategories[0];
    setForm({
      type: 'expense',
      amount: '',
      categoryId: defaultCategory?.id || '',
      note: '',
      accountId: defaultAccount?.id || '',
      frequency: 'monthly',
      dayOfMonth: new Date().getDate(),
      dayOfWeek: 1,
      startDate: todayKey(),
      endDate: '',
    });
    setShowModal(true);
  };

  const openEditModal = (record: RecurringRecord) => {
    setEditingRecord(record);
    setForm({
      type: record.type,
      amount: record.amount.toString(),
      categoryId: record.categoryId,
      note: record.note,
      accountId: record.accountId,
      frequency: record.frequency,
      dayOfMonth: record.dayOfMonth || new Date().getDate(),
      dayOfWeek: record.dayOfWeek || 1,
      startDate: record.startDate,
      endDate: record.endDate || '',
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.amount || !form.categoryId || !form.accountId) return;

    const data = {
      type: form.type,
      amount: parseFloat(form.amount),
      categoryId: form.categoryId,
      note: form.note,
      accountId: form.accountId,
      frequency: form.frequency,
      dayOfMonth: form.frequency === 'monthly' || form.frequency === 'yearly' ? form.dayOfMonth : undefined,
      dayOfWeek: form.frequency === 'weekly' ? form.dayOfWeek : undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      enabled: true,
    };

    if (editingRecord) {
      updateRecurringRecord(editingRecord.id, data);
    } else {
      addRecurringRecord(data);
    }
    setShowModal(false);
  };

  const getFrequencyText = (record: RecurringRecord) => {
    switch (record.frequency) {
      case 'daily': return t('recurringRecords.freqDaily');
      case 'weekly': return t('recurringRecords.freqWeeklyText', { day: t(`recurringRecords.weekday${record.dayOfWeek || 1}`) });
      case 'monthly': return t('recurringRecords.freqMonthlyText', { day: record.dayOfMonth });
      case 'yearly': return t('recurringRecords.freqYearlyText', { date: record.startDate.slice(5) });
    }
  };

  return (
    <div className="page-root pb-nav page-enter">
      <div className="safe-top px-4 pt-2 pb-1">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="icon-btn" aria-label={t('recurringRecords.back')}>
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="page-title">{t('recurringRecords.title')}</h1>
            <p className="page-subtitle">{t('recurringRecords.subtitle')}</p>
          </div>
          <button onClick={openAddModal} className="icon-btn" aria-label={t('recurringRecords.newTask')}>
            <Plus size={20} />
          </button>
        </div>

        <div className="card grid grid-cols-3 gap-3 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold amount-num" style={{ color: 'var(--ink)' }}>{recurringRecords.length}</p>
            <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('recurringRecords.statTasks')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold amount-num" style={{ color: 'var(--primary)' }}>{recurringRecords.filter(r => r.enabled).length}</p>
            <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('recurringRecords.statActive')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold amount-num" style={{ color: 'var(--expense-ink)' }}>
              {recurringRecords.filter(r => r.enabled).reduce((sum, r) => sum + r.amount, 0).toFixed(0)}
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{t('recurringRecords.statMonthlyAmount')}</p>
            </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {recurringRecords.length === 0 ? (
          <div className="card text-center p-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--paper-deep)' }}
            >
              <Repeat size={36} style={{ color: 'var(--ink-2)' }} />
            </div>
            <p className="mb-5" style={{ color: 'var(--ink-2)' }}>{t('recurringRecords.emptyText')}</p>
            <button
              onClick={openAddModal}
              className="btn-primary w-fit mx-auto px-8"
            >
              {t('recurringRecords.createTask')}
            </button>
          </div>
        ) : (
          <div>
            {recurringRecords.map((record) => {
              const category = categories.find((c) => c.id === record.categoryId);
              const account = accounts.find((a) => a.id === record.accountId);
              const IconComponent = getIcon(category?.icon || 'Circle');

              return (
                <div
                  key={record.id}
                  className="card mb-3 p-4"
                  style={!record.enabled ? { opacity: 0.6 } : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: category?.color ? `${category.color}30` : 'var(--primary-soft)', color: category?.color || 'var(--primary)' }}
                    >
                      <IconComponent size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-lg font-bold amount-num"
                          style={{ color: record.type === 'income' ? 'var(--primary)' : 'var(--expense)' }}
                        >
                          {record.type === 'income' ? '+' : '-'}¥{record.amount.toFixed(2)}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}
                        >
                          {getFrequencyText(record)}
                        </span>
                      </div>
                      <p className="text-sm truncate" style={{ color: 'var(--ink-2)' }}>
                        {category?.name} · {account?.name}
                      </p>
                      {record.note && (
                        <p className="text-xs mt-1" style={{ color: 'var(--ink-2)' }}>{record.note}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => openEditModal(record)}
                        className="p-2 rounded-full"
                        style={{ color: 'var(--ink-2)' }}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => deleteRecurringRecord(record.id)}
                        className="p-2 rounded-full"
                        style={{ color: 'var(--expense)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--ink-2)' }}>
                      {t('recurringRecords.startLabel')}: {record.startDate}{record.endDate ? ` · ${t('recurringRecords.endLabel')}: ${record.endDate}` : ''}
                    </span>
                    <button
                      onClick={() => toggleRecurringRecord(record.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                      style={record.enabled
                        ? { background: 'var(--primary-soft)', color: 'var(--primary-ink)' }
                        : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                    >
                      {record.enabled ? <Play size={12} /> : <X size={12} />}
                      {record.enabled ? t('recurringRecords.statActive') : t('recurringRecords.statusPaused')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(43,41,37,0.45)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="sheet w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{editingRecord ? t('recurringRecords.editTask') : t('recurringRecords.newTask')}</h3>
              <button onClick={() => setShowModal(false)} className="icon-btn" aria-label={t('recurringRecords.close')}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex gap-2 mb-4">
                {(['expense', 'income'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setForm({ ...form, type, categoryId: categories.find(c => c.type === type)?.id || '' });
                    }}
                    className="flex-1 py-2.5 rounded-button text-sm font-medium transition-all"
                    style={form.type === type
                      ? { background: type === 'expense' ? 'var(--expense)' : 'var(--primary)', color: '#fff' }
                      : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                  >
                    {type === 'expense' ? t('common.expense') : t('common.income')}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>{t('common.amount')}</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-card text-xl font-bold outline-none"
                  style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>{t('common.category')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {filteredCategories.map((cat) => {
                    const IconComponent = getIcon(cat.icon);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setForm({ ...form, categoryId: cat.id })}
                        className="flex flex-col items-center gap-1 p-2 rounded-card transition-all"
                        style={form.categoryId === cat.id
                          ? { background: 'var(--primary-soft)', border: '1.5px solid var(--primary)' }
                          : { background: 'var(--paper-deep)', border: '1.5px solid transparent' }}
                      >
                        <div className="p-1.5 rounded-full" style={{ backgroundColor: `${cat.color}30`, color: cat.color }}>
                          <IconComponent size={16} />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>{t('common.account')}</label>
                <div className="flex gap-2 flex-wrap">
                  {accounts.map((acc) => {
                    const IconComponent = getIcon(acc.icon);
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setForm({ ...form, accountId: acc.id })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-button transition-all"
                        style={form.accountId === acc.id
                          ? { background: 'var(--primary)', color: '#fff' }
                          : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                      >
                        <IconComponent size={14} />
                        <span className="text-xs font-medium">{acc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>{t('recurringRecords.frequencyLabel')}</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {([
                    { value: 'daily', label: t('recurringRecords.freqDaily') },
                    { value: 'weekly', label: t('recurringRecords.freqWeekly') },
                    { value: 'monthly', label: t('recurringRecords.freqMonthly') },
                    { value: 'yearly', label: t('recurringRecords.freqYearly') },
                  ] as const).map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setForm({ ...form, frequency: f.value })}
                      className="py-2 rounded-button text-sm font-medium transition-all"
                      style={form.frequency === f.value
                        ? { background: 'var(--primary)', color: '#fff' }
                        : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {form.frequency === 'weekly' && (
                  <div className="flex gap-1 mt-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                      <button
                        key={idx}
                        onClick={() => setForm({ ...form, dayOfWeek: idx })}
                        className="flex-1 py-2 rounded-button text-sm font-medium transition-all"
                        style={form.dayOfWeek === idx
                          ? { background: 'var(--primary)', color: '#fff' }
                          : { background: 'var(--paper-deep)', color: 'var(--ink-2)' }}
                      >
                        {t(`recurringRecords.weekday${idx}`)}
                      </button>
                    ))}
                  </div>
                )}

                {(form.frequency === 'monthly' || form.frequency === 'yearly') && (
                  <div className="mt-2">
                    <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{t('common.date')}</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.dayOfMonth}
                      onChange={(e) => setForm({ ...form, dayOfMonth: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 rounded-button text-center text-lg font-bold outline-none"
                      style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
                    />
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>{t('common.note')}</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder={t('recurringRecords.notePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-button text-sm outline-none"
                  style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{t('recurringRecords.startDateLabel')}</label>
                  <button
                    type="button"
                    onClick={() => setDatePickerTarget('start')}
                    className="w-full px-3 py-2 rounded-button text-sm text-left amount-num"
                    style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
                  >
                    {form.startDate}
                  </button>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--ink-2)' }}>{t('recurringRecords.endDateOptional')}</label>
                  <button
                    type="button"
                    onClick={() => setDatePickerTarget('end')}
                    className="w-full px-3 py-2 rounded-button text-sm text-left amount-num"
                    style={{ background: 'var(--paper-deep)', color: form.endDate ? 'var(--ink)' : 'var(--ink-2)' }}
                  >
                    {form.endDate || t('recurringRecords.noEndDate')}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" style={{ borderTop: '1px solid var(--line)' }}>
              <button
                onClick={handleSubmit}
                disabled={!form.amount || !form.categoryId || !form.accountId}
                className="btn-primary w-full"
                style={(!form.amount || !form.categoryId || !form.accountId) ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                {editingRecord ? t('recurringRecords.saveChanges') : t('recurringRecords.createTask')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {datePickerTarget && createPortal(
        <CalendarPicker
          selectedDate={parseDate(datePickerTarget === 'start' ? form.startDate : (form.endDate || form.startDate))}
          onDateChange={(date) => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (datePickerTarget === 'start') {
              setForm({ ...form, startDate: dateStr });
            } else {
              setForm({ ...form, endDate: dateStr });
            }
            setDatePickerTarget(null);
          }}
          onClose={() => setDatePickerTarget(null)}
        />,
        document.body
      )}
    </div>
  );
};

export default RecurringRecords;
