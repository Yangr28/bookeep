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
    markReady,
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
    resetHistory('/');
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

  const handleViewAllRecords = useCallback(() => {
    handlePageChange('/all-records');
  }, [handlePageChange]);

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

  // 启动解锁后延迟自动检查更新（4 小时节流，失败静默）
  useEffect(() => {
    if (!appUnlocked) return;
    const timer = setTimeout(() => {
      checkUpdate(false).catch(() => {
        // 网络异常等情况静默处理
      });
    }, 3000);
    return () => clearTimeout(timer);
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
    
    setToastMessage('记账成功');
    setTimeout(() => setToastMessage(null), 2000);
  }, [quickRecordAmount, quickRecordCategoryId, quickRecordAccountId, quickRecordType, quickRecordNote, quickRecordDateTime, quickRecordCurrency, addTransaction, setToastMessage]);

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
            onGoToStats={() => handlePageChange('/stats')}
            onGoToTransfer={() => handlePageChange('/transfer')}
            onGoToRecurring={() => handlePageChange('/recurring')}
            onGoToTemplates={() => handlePageChange('/templates')}
            onGoToCurrencyConverter={() => handlePageChange('/currency-converter')}
            onEditTransaction={handleEditTransaction}
            onViewAllRecords={handleViewAllRecords}
            onGoToSettings={() => handlePageChange('/settings')}
            onGoToSearch={() => handlePageChange('/search')}
            onShowOCRModal={() => setShowOCRModal(true)}
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
      case '/accounts':
        return <Accounts onViewAccountDetail={handleViewAccountDetail} />;
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
      case '/settings':
        return <Settings onBack={handleBack} theme={theme} isDark={isDark} onToggleTheme={toggleTheme} onCheckUpdate={handleManualCheckUpdate} />;
      case '/search':
        return <Search onBack={handleBack} onEditTransaction={handleEditTransaction} />;
      case '/budgets':
        return <Budgets onBack={handleBack} />;
      case '/stats':
        return <Stats onBack={handleBack} />;
      case '/recurring':
        return <RecurringRecords onBack={handleBack} />;
      case '/templates':
        return <Templates onBack={handleBack} />;
      case '/currency-converter':
        return <CurrencyConverter onBack={handleBack} />;
      default:
        return (
          <Dashboard
            onViewDetail={handleViewDetail}
            onGoToAccounts={() => handlePageChange('/accounts')}
            onGoToCurrencyConverter={() => handlePageChange('/currency-converter')}
            onEditTransaction={handleEditTransaction}
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
            onShowDatePicker={() => setShowQuickRecordDatePicker(true)}
            onShowTimePicker={() => setShowQuickRecordTimePicker(true)}
            widgetQuickInput={widgetQuickInput}
            onClearWidgetQuickInput={() => setWidgetQuickInput('')}
          />
        );
    }
  };

  const showBottomNav = currentPage !== '/detail' && currentPage !== '/account-detail' && currentPage !== '/transfer' && currentPage !== '/record';

  if (!appUnlocked) {
    return <AppLock onUnlock={() => setAppUnlocked(true)} />;
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 relative ${isSwiping || hasModalOpen ? 'overflow-hidden' : ''}`}>
      {canGoBack() && (
        <>
          <div 
            className={`fixed left-0 top-0 bottom-0 w-8 flex items-center justify-center z-20 transition-opacity duration-200 ${showLeftIndicator ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={handleBack}
          >
            <div className="w-1.5 h-20 bg-gray-400 rounded-r-full shadow-sm" />
          </div>
          <div 
            className={`fixed right-0 top-0 bottom-0 w-8 flex items-center justify-center z-20 transition-opacity duration-200 ${showRightIndicator ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={handleBack}
          >
            <div className="w-1.5 h-20 bg-gray-400 rounded-l-full shadow-sm" />
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
        <>
          <div 
            className="fixed inset-0 bg-black/30 pointer-events-none z-10"
            style={{ opacity: Math.abs(swipeProgress) * 0.4 }}
          />
          <div 
            className="fixed left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-200 to-transparent pointer-events-none z-10"
            style={{ opacity: Math.abs(swipeProgress) * 0.6 }}
          />
        </>
      )}

      {showBottomNav && <BottomNav currentPage={currentPage} onPageChange={handlePageChange} />}

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
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[100]">
          <div className="bg-white w-full rounded-t-3xl max-h-[75vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">选择账户</h2>
              <button
                onClick={() => setShowAccountPicker(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 pb-24 space-y-3">
              {accounts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet size={28} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500">还没有添加账户</p>
                </div>
              ) : (
                accounts.map((account) => {
                  const IconComponent = getIcon(account.icon);
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleRecordAccountSelect(account.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all border-2 ${
                        recordAccountId === account.id
                          ? 'bg-emerald-50 border-emerald-500'
                          : 'bg-gray-50 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${account.color}20`, color: account.color }}
                      >
                        <IconComponent size={24} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-800">{account.name}</p>
                        <p className="text-sm text-gray-500">{AccountTypeNames[account.type]}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">{account.balance.toLocaleString()}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 mx-4 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">确认退出</h3>
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <p className="text-gray-500 mb-6">确定要退出 Bookeep 吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                退出
              </button>
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
          onClose={closeUpdateModal}
          onSkip={skipUpdate}
        />
      )}

      {toastMessage && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/90 text-white px-8 py-5 rounded-2xl z-[100] flex items-center gap-4 animate-fade-in shadow-2xl min-w-[200px] justify-center">
          <CheckCircle size={28} className="text-emerald-400" />
          <span className="font-bold text-lg">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}