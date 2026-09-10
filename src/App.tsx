import { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Record } from './pages/Record';
import { Categories } from './pages/Categories';
import { Statistics } from './pages/Statistics';
import { TransactionDetail } from './pages/TransactionDetail';
import { Accounts } from './pages/Accounts';
import { AccountDetail } from './pages/AccountDetail';
import { Transfer } from './pages/Transfer';
import { AllRecords } from './pages/AllRecords';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { Search } from './pages/Search';
import { Budgets } from './pages/Budgets';
import { Stats } from './pages/Stats';
import RecurringRecords from './pages/RecurringRecords';
import Templates from './pages/Templates';
import { CurrencyConverter } from './pages/CurrencyConverter';
import { BottomNav } from './components/BottomNav';
import { UpdateModal } from './components/UpdateModal';
import { AppLock, isAppLocked } from './components/AppLock';
import { CalendarPicker } from './components/CalendarPicker';
import { TimePicker } from './components/TimePicker';
import { OCRRecordModal } from './components/OCRRecordModal';
import { Transaction, TransactionType } from './types';
import { X, Wallet, CheckCircle } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { useStore } from './store/useStore';
import { setStorageErrorCallback } from './utils/storage';
import { iconMap, getIcon } from './utils/iconMap';
import { AccountTypeNames } from './types';
import { useHistory } from './hooks/useHistory';
import { useModal } from './hooks/useModal';
import { useSwipeBack } from './hooks/useSwipeBack';
import { useTheme } from './hooks/useTheme';
import { useUpdateCheck } from './hooks/useUpdateCheck';
import { convertToCNY, getRate } from './utils/currency';
import WidgetLaunch from './plugins/widgetLaunch';

type FilterType = 'today-income' | 'today-expense' | 'month-income' | 'month-expense' | 'total-balance' | 'month-balance';

export default function App() {
  const { theme, isDark, toggleTheme } = useTheme();

  const {
    available: updateInfo,
    flow: updateFlow,
    check: checkUpdate,
    close: closeUpdateModal,
    skip: skipUpdate,
    startUpdate,
    startApkUpdate,
    markReady,
    rollback,
  } = useUpdateCheck();

  const [quickRecordAmount, setQuickRecordAmount] = useState('');
  const [quickRecordCategoryId, setQuickRecordCategoryId] = useState<string | null>(null);
  const [quickRecordType, setQuickRecordType] = useState<TransactionType>('expense');
  const [quickRecordNote, setQuickRecordNote] = useState('');
  const [quickRecordAccountId, setQuickRecordAccountId] = useState<string | null>(null);
  const [quickRecordDateTime, setQuickRecordDateTime] = useState(new Date());
  const [quickRecordCurrency, setQuickRecordCurrency] = useState('CNY');
  const [showQuickRecordDatePicker, setShowQuickRecordDatePicker] = useState(false);
  const [showQuickRecordTimePicker, setShowQuickRecordTimePicker] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [widgetQuickInput, setWidgetQuickInput] = useState('');
  const [appUnlocked, setAppUnlocked] = useState(!isAppLocked());

  // 存储写入失败时提示用户导出备份（防止数据丢失）
  useEffect(() => {
    setStorageErrorCallback(() => {
      setToastMessage('存储空间不足，请尽快导出数据备份');
      setTimeout(() => setToastMessage(null), 5000);
    });
    return () => setStorageErrorCallback(() => {});
  }, []);
  
  const { 
    currentPage, 
    handlePageChange, 
    goBack, 
    canGoBack,
    resetHistory 
  } = useHistory();
  
  const { 
    showExitConfirm, 
    showCalendar, 
    showRecordDatePicker, 
    showRecordTimePicker, 
    showAccountPicker, 
    showKeypad,
    calendarSelectedDate,
    recordDateTime,
    recordAccountId,
    recordAmount,
    recordNote,
    recordCategoryId,
    recordType,
    editTransaction,
    detailFilter,
    selectedCategoryId,
    selectedAccountId,
    setShowExitConfirm,
    setShowCalendar,
    setShowRecordDatePicker,
    setShowRecordTimePicker,
    setShowAccountPicker,
    setShowKeypad,
    setCalendarSelectedDate,
    setRecordDateTime,
    setRecordAccountId,
    setRecordAmount,
    setRecordNote,
    setRecordCategoryId,
    setRecordType,
    setEditTransaction,
    setDetailFilter,
    setSelectedCategoryId,
    setSelectedAccountId,
  } = useModal();

  const accounts = useStore((state) => state.accounts);
  const addTransaction = useStore((state) => state.addTransaction);
  const updateTransaction = useStore((state) => state.updateTransaction);

  const handleBack = useCallback(() => {
    // 更新弹窗打开时优先处理：强制更新/下载中拦截返回键，其余情况关闭弹窗
    if (updateInfo) {
      const updateBusy = updateFlow.phase === 'downloading' || updateFlow.phase === 'installing';
      if (!updateInfo.mandatory && !updateBusy) {
        closeUpdateModal();
      }
      return;
    }
    if (showExitConfirm) {
      setShowExitConfirm(false);
      return;
    }
    if (showKeypad) {
      setShowKeypad(false);
      return;
    }
    if (showAccountPicker) {
      setShowAccountPicker(false);
      return;
    }
    if (showRecordTimePicker) {
      setShowRecordTimePicker(false);
      return;
    }
    if (showRecordDatePicker) {
      setShowRecordDatePicker(false);
      return;
    }
    if (showCalendar) {
      setShowCalendar(false);
      return;
    }
    if (!canGoBack()) {
      setShowExitConfirm(true);
      return;
    }
    goBack();
  }, [canGoBack, goBack, setShowExitConfirm, setShowKeypad, setShowAccountPicker, setShowRecordTimePicker, setShowRecordDatePicker, setShowCalendar, showExitConfirm, showKeypad, showAccountPicker, showRecordTimePicker, showRecordDatePicker, showCalendar, updateInfo, updateFlow.phase, closeUpdateModal]);

  const handleRecordSuccess = useCallback(() => {
    if (editTransaction) {
      // 编辑保存：返回进入编辑前的页面（首页/全部记录/明细/搜索等）
      goBack();
    } else {
      resetHistory('/');
    }
    setToastMessage(editTransaction ? '修改成功' : '记账成功');
    setTimeout(() => setToastMessage(null), 2000);
    setEditTransaction(null);
    setRecordAmount('');
    setRecordCategoryId(null);
    setRecordNote('');
    setRecordType('expense');
    setShowKeypad(false);
  }, [resetHistory, setEditTransaction, setRecordAmount, setRecordCategoryId, setRecordNote, setRecordType, setShowKeypad, editTransaction]);

  const handleViewDetail = useCallback((filterType: FilterType) => {
    setDetailFilter(filterType);
    setSelectedCategoryId(null);
    handlePageChange('/detail');
  }, [handlePageChange, setDetailFilter, setSelectedCategoryId]);

  const handleViewCategoryDetail = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
    handlePageChange('/detail');
  }, [handlePageChange, setSelectedCategoryId]);

  const handleEditTransaction = useCallback((transaction: Transaction) => {
    setEditTransaction(transaction);
    setRecordDateTime(new Date(transaction.createdAt));
    setRecordAccountId(transaction.accountId);
    setRecordAmount(transaction.amount.toString());
    setRecordNote(transaction.note || '');
    setRecordCategoryId(transaction.categoryId);
    setRecordType(transaction.type);
    handlePageChange('/record');
  }, [handlePageChange, setEditTransaction, setRecordDateTime, setRecordAccountId, setRecordAmount, setRecordNote, setRecordCategoryId, setRecordType]);

  const handleViewAccountDetail = useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
    setTimeout(() => {
      handlePageChange('/account-detail');
    }, 0);
  }, [handlePageChange, setSelectedAccountId]);

  // 底部导航中央「记一笔」：重置记账状态后进入记账页（保留上次使用的账户）
  const handleFabRecord = useCallback(() => {
    setEditTransaction(null);
    setRecordAmount('');
    setRecordCategoryId(null);
    setRecordNote('');
    setRecordType('expense');
    setRecordDateTime(new Date());
    handlePageChange('/record');
  }, [handlePageChange, setEditTransaction, setRecordAmount, setRecordCategoryId, setRecordNote, setRecordType, setRecordDateTime]);

  // 首页智能输入解析后跳转到记账页并预填数据
  const handleQuickRecordToPage = useCallback((parsed: {
    type: TransactionType;
    amount?: string;
    categoryId?: string | null;
    note?: string;
    accountId?: string | null;
    dateTime?: Date;
  }) => {
    setEditTransaction(null);
    setRecordType(parsed.type);
    setRecordAmount(parsed.amount || '');
    setRecordCategoryId(parsed.categoryId || null);
    setRecordNote(parsed.note || '');
    if (parsed.accountId) setRecordAccountId(parsed.accountId);
    setRecordDateTime(parsed.dateTime || new Date());
    handlePageChange('/record');
  }, [handlePageChange, setEditTransaction, setRecordType, setRecordAmount, setRecordCategoryId, setRecordNote, setRecordAccountId, setRecordDateTime]);

  const handleConfirmExit = useCallback(() => {
    CapApp.exitApp();
  }, []);

  const handleSwipeBack = useCallback(() => {
    if (!canGoBack()) {
      setShowExitConfirm(true);
      return;
    }
    handleBack();
  }, [canGoBack, handleBack, setShowExitConfirm]);

  const hasModalOpen = showCalendar || showRecordDatePicker || showRecordTimePicker || showAccountPicker || showKeypad || showQuickRecordDatePicker || showQuickRecordTimePicker;

  const { swipeProgress, isSwiping, showLeftIndicator, showRightIndicator } = useSwipeBack({
    onSwipeBack: handleSwipeBack,
    enabled: !hasModalOpen && (canGoBack() || currentPage !== '/'),
    threshold: 30,
  });

  useEffect(() => {
    let listener: Awaited<ReturnType<typeof CapApp.addListener>> | undefined;

    const handleBackButton = () => {
      handleBack();
    };

    const setupListener = async () => {
      listener = await CapApp.addListener('backButton', handleBackButton);
    };

    setupListener();

    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  }, [handleBack]);

  // 处理桌面小组件启动动作
  const checkWidgetAction = useCallback(async () => {
    try {
      const { quickInput } = await WidgetLaunch.getLaunchAction();
      if (quickInput) {
        // 从小组件输入界面传来的文本，填入智能记账输入框
        resetHistory('/');
        setWidgetQuickInput(quickInput);
      }
    } catch (e) {
      // 插件不可用（如 Web 环境），忽略
    }
  }, [resetHistory]);

  // 热更新版本加载成功后确认（用于原生端失败回滚判断）
  useEffect(() => {
    markReady();
  }, [markReady]);

  // 对账迁移：老账户缺少 initialBalance 时按当前余额反推回填（方法内部幂等）
  const ensureInitialBalances = useStore((s) => s.ensureInitialBalances);
  useEffect(() => {
    ensureInitialBalances();
  }, [ensureInitialBalances]);

  // 启动解锁后延迟自动检查更新（5 分钟节流；api.github.com 国内不稳定，失败自动重试 3 次）
  useEffect(() => {
    if (!appUnlocked) return;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const attemptCheck = () => {
      checkUpdate(false).catch(() => {
        if (retries < 2) {
          retries += 1;
          retryTimer = setTimeout(attemptCheck, 2000);
        }
      });
    };
    const timer = setTimeout(attemptCheck, 1500);
    return () => {
      clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [appUnlocked, checkUpdate]);

  // 设置页手动检查更新
  const handleManualCheckUpdate = useCallback(async () => {
    try {
      const result = await checkUpdate(true);
      if (result === 'latest') {
        setToastMessage('当前已是最新版本');
        setTimeout(() => setToastMessage(null), 2000);
      }
    } catch (e) {
      setToastMessage(e instanceof Error ? e.message : '检查更新失败');
      setTimeout(() => setToastMessage(null), 2500);
    }
  }, [checkUpdate, setToastMessage]);

  useEffect(() => {
    if (!appUnlocked) return;
    checkWidgetAction();

    let resumeListener: Awaited<ReturnType<typeof CapApp.addListener>> | undefined;
    const setupResume = async () => {
      resumeListener = await CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          setTimeout(() => checkWidgetAction(), 200);
        }
      });
    };
    setupResume();

    return () => {
      if (resumeListener && typeof resumeListener.remove === 'function') {
        resumeListener.remove();
      }
    };
  }, [appUnlocked, checkWidgetAction]);

  const handleStatisticsDateChange = (date: Date) => {
    setCalendarSelectedDate(date);
    setShowCalendar(false);
  };

  const handleRecordDateChange = (date: Date) => {
    const time = recordDateTime;
    setRecordDateTime(new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes()));
    setShowRecordDatePicker(false);
  };

  const handleRecordTimeChange = (hours: number, minutes: number) => {
    const date = recordDateTime;
    setRecordDateTime(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes));
    setShowRecordTimePicker(false);
  };

  const handleRecordAccountSelect = (accountId: string) => {
    setRecordAccountId(accountId);
    setShowAccountPicker(false);
  };

  const handleRecordSubmit = useCallback(() => {
    if (!recordAmount || !recordCategoryId || !recordAccountId) return;

    if (editTransaction) {
      updateTransaction(editTransaction.id, {
        type: recordType,
        amount: parseFloat(recordAmount),
        categoryId: recordCategoryId,
        accountId: recordAccountId,
        note: recordNote,
        createdAt: recordDateTime.toISOString(),
      });
    } else {
      addTransaction({
        type: recordType,
        amount: parseFloat(recordAmount),
        categoryId: recordCategoryId,
        accountId: recordAccountId,
        note: recordNote,
        createdAt: recordDateTime.toISOString(),
      });
    }

    handleRecordSuccess();
  }, [recordAmount, recordCategoryId, recordAccountId, recordType, recordNote, recordDateTime, editTransaction, updateTransaction, addTransaction, handleRecordSuccess]);

  const handleQuickRecordSubmit = useCallback(() => {
    if (!quickRecordAmount || !quickRecordCategoryId || !quickRecordAccountId) return;

    const originalAmount = parseFloat(quickRecordAmount);
    const rate = getRate(quickRecordCurrency);
    // 外币转人民币：记账金额统一以人民币存储
    const cnyAmount = quickRecordCurrency === 'CNY' ? originalAmount : convertToCNY(originalAmount, quickRecordCurrency);

    addTransaction({
      type: quickRecordType,
      amount: cnyAmount,
      categoryId: quickRecordCategoryId,
      accountId: quickRecordAccountId,
      note: quickRecordNote,
      createdAt: quickRecordDateTime.toISOString(),
      ...(quickRecordCurrency !== 'CNY' && {
        currency: quickRecordCurrency,
        originalAmount,
        exchangeRate: rate,
      }),
    });

    setQuickRecordAmount('');
    setQuickRecordCategoryId(null);
    setQuickRecordType('expense');
    setQuickRecordNote('');
    setQuickRecordAccountId(null);
    setQuickRecordDateTime(new Date());
    setQuickRecordCurrency('CNY');
    // 记账成功后回到页面顶部，确保余额卡片在可视区域内
    window.scrollTo(0, 0);

    setToastMessage('记账成功');
    setTimeout(() => setToastMessage(null), 2000);
  }, [quickRecordAmount, quickRecordCategoryId, quickRecordAccountId, quickRecordType, quickRecordNote, quickRecordDateTime, quickRecordCurrency, addTransaction, setToastMessage]);

  // 首页智能输入「快速保存」：绕过 quickRecord state，直接用解析结果完成记账
  const handleSmartQuickSave = useCallback((parsed: {
    type: TransactionType;
    amount: string;
    categoryId: string;
    accountId: string;
    note: string;
    currency?: string;
    dateTime?: Date;
  }) => {
    if (!parsed.amount || !parsed.categoryId || !parsed.accountId) return;
    const originalAmount = parseFloat(parsed.amount);
    const currency = parsed.currency || 'CNY';
    const rate = getRate(currency);
    const cnyAmount = currency === 'CNY' ? originalAmount : convertToCNY(originalAmount, currency);
    const createdAt = (parsed.dateTime || new Date()).toISOString();

    addTransaction({
      type: parsed.type,
      amount: cnyAmount,
      categoryId: parsed.categoryId,
      accountId: parsed.accountId,
      note: parsed.note,
      createdAt,
      ...(currency !== 'CNY' && {
        currency,
        originalAmount,
        exchangeRate: rate,
      }),
    });
    window.scrollTo(0, 0);
    setToastMessage('记账成功');
    setTimeout(() => setToastMessage(null), 2000);
  }, [addTransaction, setToastMessage]);

  const handleQuickRecordDateChange = useCallback((date: Date) => {
    const time = quickRecordDateTime;
    setQuickRecordDateTime(new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes()));
    setShowQuickRecordDatePicker(false);
  }, [quickRecordDateTime]);

  const handleQuickRecordTimeChange = useCallback((hours: number, minutes: number) => {
    const date = quickRecordDateTime;
    setQuickRecordDateTime(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes));
    setShowQuickRecordTimePicker(false);
  }, [quickRecordDateTime]);

  const renderPage = () => {
    switch (currentPage) {
      case '/':
        return (
          <Dashboard
            onViewDetail={handleViewDetail}
            onGoToAccounts={() => handlePageChange('/accounts')}
            onGoToBudgets={() => handlePageChange('/budgets')}
            onGoToStats={() => handlePageChange('/records')}
            onGoToTransfer={() => handlePageChange('/transfer')}
            onGoToRecurring={() => handlePageChange('/recurring')}
            onGoToTemplates={() => handlePageChange('/templates')}
            onGoToCurrencyConverter={() => handlePageChange('/currency-converter')}
            onEditTransaction={handleEditTransaction}
            onGoToSettings={() => handlePageChange('/settings')}
            onGoToSearch={() => handlePageChange('/search')}
            onShowOCRModal={() => setShowOCRModal(true)}
            onGoToRecord={handleQuickRecordToPage}
            onFabRecord={handleFabRecord}
            quickRecordAmount={quickRecordAmount}
            quickRecordCategoryId={quickRecordCategoryId}
            quickRecordType={quickRecordType}
            quickRecordNote={quickRecordNote}
            quickRecordAccountId={quickRecordAccountId}
            quickRecordDateTime={quickRecordDateTime}
            quickRecordCurrency={quickRecordCurrency}
            onQuickRecordAmountChange={setQuickRecordAmount}
            onQuickRecordCategoryChange={setQuickRecordCategoryId}
            onQuickRecordTypeChange={setQuickRecordType}
            onQuickRecordNoteChange={setQuickRecordNote}
            onQuickRecordAccountChange={setQuickRecordAccountId}
            onQuickRecordCurrencyChange={setQuickRecordCurrency}
            onQuickRecordSubmit={handleQuickRecordSubmit}
            onSmartQuickSave={handleSmartQuickSave}
            onShowDatePicker={() => setShowQuickRecordDatePicker(true)}
            onShowTimePicker={() => setShowQuickRecordTimePicker(true)}
            widgetQuickInput={widgetQuickInput}
            onClearWidgetQuickInput={() => setWidgetQuickInput('')}
          />
        );
      case '/record':
        return (
          <Record
            editTransaction={editTransaction}
            onBack={handleBack}
            selectedDateTime={recordDateTime}
            selectedAccountId={recordAccountId}
            onShowDatePicker={() => setShowRecordDatePicker(true)}
            onShowTimePicker={() => setShowRecordTimePicker(true)}
            onShowAccountPicker={() => setShowAccountPicker(true)}
            amount={recordAmount}
            note={recordNote}
            onAmountChange={setRecordAmount}
            onNoteChange={setRecordNote}
            categoryId={recordCategoryId}
            type={recordType}
            onCategoryChange={setRecordCategoryId}
            onTypeChange={setRecordType}
            onAccountChange={setRecordAccountId}
            onSubmit={handleRecordSubmit}
          />
        );
      case '/categories':
        return <Categories onViewCategoryDetail={handleViewCategoryDetail} />;
      case '/statistics':
        return (
          <Statistics 
            selectedDate={calendarSelectedDate}
            onShowCalendar={() => setShowCalendar(true)}
          />
        );
      case '/records':
        return (
          <AllRecords
            isTab
            onBack={handleBack}
            onEditTransaction={handleEditTransaction}
          />
        );
      case '/accounts':
        return (
          <Accounts
            isTab
            onViewAccountDetail={handleViewAccountDetail}
            onGoToBudgets={() => handlePageChange('/budgets')}
            onGoToRecurring={() => handlePageChange('/recurring')}
            onGoToTemplates={() => handlePageChange('/templates')}
            onGoToCurrencyConverter={() => handlePageChange('/currency-converter')}
          />
        );
      case '/account-detail':
        return (
          <AccountDetail 
            onBack={handleBack} 
            accountId={selectedAccountId || ''}
            onEditTransaction={handleEditTransaction}
          />
        );
      case '/transfer':
        return <Transfer onBack={handleBack} />;
      case '/detail':
        return (
          <TransactionDetail 
            onBack={handleBack} 
            filterType={detailFilter} 
            categoryId={selectedCategoryId}
            onEditTransaction={handleEditTransaction}
          />
        );
      case '/all-records':
        return (
          <AllRecords 
            onBack={handleBack}
            onEditTransaction={handleEditTransaction}
          />
        );
      case '/profile':
        return (
          <Profile
            onGoToSettings={() => handlePageChange('/settings')}
            onGoToCategories={() => handlePageChange('/categories')}
            onGoToDateSelect={() => setShowCalendar(true)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            selectedDate={calendarSelectedDate}
          />
        );
      case '/settings':
        return <Settings onBack={handleBack} theme={theme} isDark={isDark} onToggleTheme={toggleTheme} onCheckUpdate={handleManualCheckUpdate} onRollback={rollback} rollbackFlow={updateFlow} onGoToCategories={() => handlePageChange('/categories')} />;
      case '/search':
        return <Search onBack={handleBack} onEditTransaction={handleEditTransaction} />;
      case '/budgets':
        return <Budgets onBack={handleBack} onToast={(msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 2000); }} />;
      case '/stats':
        return <Stats onBack={handleBack} />;
      case '/recurring':
        return <RecurringRecords onBack={handleBack} />;
      case '/templates':
        return <Templates onBack={handleBack} />;
      case '/currency-converter':
        return <CurrencyConverter onBack={handleBack} />;
      default:
        return null;
    }
  };

  const showBottomNav = currentPage !== '/detail' && currentPage !== '/account-detail' && currentPage !== '/transfer' && currentPage !== '/record';

  if (!appUnlocked) {
    return <AppLock onUnlock={() => setAppUnlocked(true)} />;
  }

  return (
    <div
      className={`min-h-screen relative page-enter ${isSwiping || hasModalOpen ? 'overflow-hidden' : ''}`}
      style={{ background: 'var(--paper)', color: 'var(--ink)' }}
    >
      {/* 状态栏遮罩：边到边模式下保证白色状态栏图标在任何页面背景上都可读 */}
      <div className="status-bar-scrim" />
      {canGoBack() && (
        <>
          <div
            className={`fixed left-0 top-0 bottom-0 w-8 flex items-center justify-center z-20 transition-opacity duration-200 ${showLeftIndicator ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={handleBack}
          >
            <div className="w-1.5 h-20 rounded-r-full" style={{ background: 'var(--primary)', opacity: 0.5 }} />
          </div>
          <div
            className={`fixed right-0 top-0 bottom-0 w-8 flex items-center justify-center z-20 transition-opacity duration-200 ${showRightIndicator ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={handleBack}
          >
            <div className="w-1.5 h-20 rounded-l-full" style={{ background: 'var(--primary)', opacity: 0.5 }} />
          </div>
        </>
      )}

      <div 
        className={`transition-all duration-300 ease-out ${isSwiping ? '' : ''}`}
        style={{ 
          transform: canGoBack() && swipeProgress !== 0 ? `translateX(${swipeProgress * 120}px) scale(${1 - Math.abs(swipeProgress) * 0.05})` : 'none',
          opacity: canGoBack() ? 1 - Math.abs(swipeProgress) * 0.3 : 1,
          boxShadow: canGoBack() ? `-${Math.abs(swipeProgress) * 20}px 0 ${Math.abs(swipeProgress) * 30}px rgba(0,0,0,0.15)` : 'none',
        }}
      >
        {renderPage()}
      </div>

      {isSwiping && canGoBack() && (
        <div
          className="fixed inset-0 pointer-events-none z-10"
          style={{ background: 'rgba(43,41,37,0.35)', opacity: Math.abs(swipeProgress) * 0.5 }}
        />
      )}

      {showBottomNav && <BottomNav currentPage={currentPage} onPageChange={handlePageChange} onRecord={handleFabRecord} />}

      {showCalendar && (
        <CalendarPicker
          selectedDate={calendarSelectedDate}
          onDateChange={handleStatisticsDateChange}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {showRecordDatePicker && (
        <CalendarPicker
          selectedDate={recordDateTime}
          onDateChange={handleRecordDateChange}
          onClose={() => setShowRecordDatePicker(false)}
        />
      )}

      {showRecordTimePicker && (
        <TimePicker
          selectedTime={{ hours: recordDateTime.getHours(), minutes: recordDateTime.getMinutes() }}
          onTimeChange={handleRecordTimeChange}
          onClose={() => setShowRecordTimePicker(false)}
        />
      )}

      {showQuickRecordDatePicker && (
        <CalendarPicker
          selectedDate={quickRecordDateTime}
          onDateChange={handleQuickRecordDateChange}
          onClose={() => setShowQuickRecordDatePicker(false)}
        />
      )}

      {showQuickRecordTimePicker && (
        <TimePicker
          selectedTime={{ hours: quickRecordDateTime.getHours(), minutes: quickRecordDateTime.getMinutes() }}
          onTimeChange={handleQuickRecordTimeChange}
          onClose={() => setShowQuickRecordTimePicker(false)}
        />
      )}

      {showAccountPicker && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in"
          style={{ background: 'rgba(43,41,37,0.45)' }}
          onClick={() => setShowAccountPicker(false)}
        >
          <div
            className="sheet w-full max-w-md max-h-[75vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="font-bold" style={{ color: 'var(--ink)' }}>选择账户</h3>
              <button onClick={() => setShowAccountPicker(false)} className="icon-btn w-9 h-9">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-6 safe-bottom">
              {accounts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--paper-deep)' }}>
                    <Wallet size={28} style={{ color: 'var(--ink-2)' }} />
                  </div>
                  <p style={{ color: 'var(--ink-2)' }}>还没有添加账户</p>
                </div>
              ) : (
                accounts.map((account) => {
                  const IconComponent = getIcon(account.icon);
                  const isSelected = recordAccountId === account.id;
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleRecordAccountSelect(account.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-button transition-all"
                      style={{
                        background: isSelected ? 'var(--primary-soft)' : 'var(--paper)',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${account.color}30`, color: account.color }}
                      >
                        <IconComponent size={20} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium" style={{ color: 'var(--ink)' }}>{account.name}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{AccountTypeNames[account.type]}</p>
                      </div>
                      <p className="font-semibold amount-num flex-shrink-0" style={{ color: 'var(--ink)' }}>
                        ¥{account.balance.toLocaleString()}
                      </p>
                      {isSelected && <CheckCircle size={18} className="flex-shrink-0" style={{ color: 'var(--primary)' }} />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[100] animate-fade-in"
          style={{ background: 'rgba(43,41,37,0.45)' }}
          onClick={() => setShowExitConfirm(false)}
        >
          <div className="card w-full max-w-sm mx-4 p-5 animate-bounce-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>确认退出</h3>
              <button onClick={() => setShowExitConfirm(false)} className="icon-btn w-9 h-9">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--ink-2)' }}>确定要退出 Bookeep 吗？</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="btn-ghost flex-1">取消</button>
              <button onClick={handleConfirmExit} className="btn-danger flex-1">退出</button>
            </div>
          </div>
        </div>
      )}

      {showOCRModal && (
        <OCRRecordModal onClose={() => setShowOCRModal(false)} />
      )}

      {updateInfo && (
        <UpdateModal
          result={updateInfo}
          flow={updateFlow}
          onUpdate={startUpdate}
          onApkUpdate={startApkUpdate}
          onClose={closeUpdateModal}
          onSkip={skipUpdate}
        />
      )}

      {toastMessage && (
        <div
          className="fixed top-1/2 left-1/2 z-[110] flex items-center gap-3 px-6 py-4 rounded-card animate-bounce-in"
          style={{
            transform: 'translate(-50%, -50%)',
            background: 'var(--card)',
            boxShadow: 'var(--shadow-card-hover)',
            minWidth: 180,
            justifyContent: 'center',
          }}
        >
          <CheckCircle size={24} style={{ color: 'var(--primary)' }} />
          <span className="font-bold" style={{ color: 'var(--ink)' }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}