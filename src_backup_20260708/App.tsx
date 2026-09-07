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
import { BottomNav } from './components/BottomNav';
import { CalendarPicker } from './components/CalendarPicker';
import { TimePicker } from './components/TimePicker';
import { NumericKeypad } from './components/NumericKeypad';
import { Transaction } from './types';
import { X, ChevronLeft } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { useStore } from './store/useStore';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AccountTypeNames } from './types';

const iconMap: Record<string, LucideIcon> = Icons as unknown as Record<string, LucideIcon>;

type FilterType = 'today-income' | 'today-expense' | 'month-income' | 'month-expense' | 'total-balance' | 'month-balance';

export default function App() {
  const [currentPage, setCurrentPage] = useState('/');
  const [detailFilter, setDetailFilter] = useState<FilterType>('today-income');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [history, setHistory] = useState<string[]>(['/']);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(new Date());
  const [showRecordDatePicker, setShowRecordDatePicker] = useState(false);
  const [showRecordTimePicker, setShowRecordTimePicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [recordDateTime, setRecordDateTime] = useState(new Date());
  const [recordAccountId, setRecordAccountId] = useState<string | null>(null);
  const [recordAmount, setRecordAmount] = useState('');
  const [recordNote, setRecordNote] = useState('');
  const [recordCategoryId, setRecordCategoryId] = useState<string | null>(null);
  const [recordType, setRecordType] = useState<'expense' | 'income'>('expense');

  const accounts = useStore((state) => state.accounts);
  const categories = useStore((state) => state.categories);
  const addTransaction = useStore((state) => state.addTransaction);
  const updateTransaction = useStore((state) => state.updateTransaction);

  const mainPages = ['/', '/record', '/categories', '/statistics', '/accounts'];

  const canGoBack = history.length > 1;

  const handlePageChange = useCallback((page: string) => {
    setCurrentPage(page);
    
    if (mainPages.includes(page)) {
      let currentMainIndex = -1;
      for (let i = history.length - 1; i >= 0; i--) {
        if (mainPages.includes(history[i])) {
          currentMainIndex = i;
          break;
        }
      }
      if (currentMainIndex >= 0) {
        setHistory(prev => [...prev.slice(0, currentMainIndex + 1), page]);
      } else {
        setHistory([page]);
      }
    } else {
      setHistory(prev => [...prev, page]);
    }
  }, [history]);

  const handleBack = useCallback(() => {
    if (history.length <= 1) {
      setShowExitConfirm(true);
      return;
    }

    const newHistory = history.slice(0, -1);
    const prevPage = newHistory[newHistory.length - 1];
    
    setHistory(newHistory);
    setCurrentPage(prevPage);

    if (prevPage === '/') {
      setSelectedCategoryId(null);
      setSelectedAccountId(null);
      setEditTransaction(null);
    }
  }, [history]);

  const handleAddRecord = useCallback(() => {
    handlePageChange('/record');
  }, [handlePageChange]);

  const handleRecordSuccess = useCallback(() => {
    setHistory(['/']);
    setCurrentPage('/');
    setEditTransaction(null);
  }, []);

  const handleViewDetail = useCallback((filterType: FilterType) => {
    setDetailFilter(filterType);
    setSelectedCategoryId(null);
    handlePageChange('/detail');
  }, [handlePageChange]);

  const handleViewCategoryDetail = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
    handlePageChange('/detail');
  }, [handlePageChange]);

  const handleEditTransaction = useCallback((transaction: Transaction) => {
    setEditTransaction(transaction);
    setRecordDateTime(new Date(transaction.createdAt));
    setRecordAccountId(transaction.accountId);
    setRecordAmount(transaction.amount.toString());
    setRecordNote(transaction.note || '');
    setRecordCategoryId(transaction.categoryId);
    setRecordType(transaction.type);
    handlePageChange('/record');
  }, [handlePageChange]);

  const handleViewAccountDetail = useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
    setTimeout(() => {
      handlePageChange('/account-detail');
    }, 0);
  }, [handlePageChange]);

  const handleViewAllRecords = useCallback(() => {
    handlePageChange('/all-records');
  }, [handlePageChange]);

  const handleConfirmExit = useCallback(() => {
    CapApp.exitApp();
  }, []);

  const handleSwipeBack = useCallback(() => {
    if (!canGoBack) {
      setShowExitConfirm(true);
      return;
    }
    handleBack();
  }, [canGoBack, handleBack]);

  useEffect(() => {
    let listener: any;

    const handleBackButton = () => {
      handleBack();
    };

    const setupListener = async () => {
      listener = await CapApp.addListener('backButton', handleBackButton);
    };

    setupListener();

    return () => {
      if (listener && listener.remove) {
        listener.remove();
      }
    };
  }, [handleBack]);

  useEffect(() => {
    const startX = { value: 0 };
    const startY = { value: 0 };
    const isSwipingRef = { value: false };
    const hasTriggered = { value: false };
    const isHorizontal = { value: false };

    const threshold = 30;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const swipeZoneWidth = Math.min(screenWidth * 0.2, 150);

    const handleTouchStart = (e: TouchEvent) => {
      if (!canGoBack && currentPage === '/') return;
      
      const touch = e.touches[0];
      const touchX = touch.clientX;

      const isFromLeft = touchX < swipeZoneWidth;
      const isFromRight = touchX > screenWidth - swipeZoneWidth;

      if (!isFromLeft && !isFromRight) return;

      startX.value = touchX;
      startY.value = touch.clientY;
      isSwipingRef.value = true;
      hasTriggered.value = false;
      isHorizontal.value = false;
      setIsSwiping(true);
      setSwipeProgress(0);
      
      if (isFromLeft) setShowLeftIndicator(true);
      if (isFromRight) setShowRightIndicator(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipingRef.value || hasTriggered.value) return;
      if (!canGoBack && currentPage === '/') return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startX.value;
      const deltaY = touch.clientY - startY.value;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX > 10 && absDeltaX > absDeltaY * 1.5) {
        isHorizontal.value = true;

        const isFromLeft = startX.value < swipeZoneWidth;
        const directionCorrect = isFromLeft ? deltaX > 0 : deltaX < 0;

        if (directionCorrect) {
          const progress = Math.min(absDeltaX / 100, 1);
          setSwipeProgress(isFromLeft ? progress : -progress);

          if (absDeltaX > threshold) {
            hasTriggered.value = true;
            isSwipingRef.value = false;
            setIsSwiping(false);
            setSwipeProgress(0);
            setShowLeftIndicator(false);
            setShowRightIndicator(false);
            handleSwipeBack();
          }
        }
      } else if (absDeltaY > 10 && !isHorizontal.value) {
        isSwipingRef.value = false;
        setIsSwiping(false);
        setSwipeProgress(0);
        setShowLeftIndicator(false);
        setShowRightIndicator(false);
      }
    };

    const handleTouchEnd = () => {
      isSwipingRef.value = false;
      hasTriggered.value = false;
      isHorizontal.value = false;
      setIsSwiping(false);
      setSwipeProgress(0);
      setShowLeftIndicator(false);
      setShowRightIndicator(false);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canGoBack, currentPage, handleSwipeBack]);

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

  const handleKeypadNumberClick = (num: string) => {
    if (num === '.') {
      if (!recordAmount.includes('.')) {
        setRecordAmount(recordAmount + num);
      }
    } else if (num === 'del') {
      setRecordAmount(recordAmount.slice(0, -1));
    } else {
      if (recordAmount.length < 12) {
        setRecordAmount(recordAmount + num);
      }
    }
  };

  const handleKeypadClear = () => {
    setRecordAmount('');
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

    setRecordAmount('');
    setRecordCategoryId(null);
    setRecordNote('');
    setRecordType('expense');
    setShowKeypad(false);
    handleRecordSuccess();
  }, [recordAmount, recordCategoryId, recordAccountId, recordType, recordNote, recordDateTime, editTransaction, updateTransaction, addTransaction, handleRecordSuccess]);

  const renderPage = () => {
    switch (currentPage) {
      case '/':
        return <Dashboard onAddRecord={handleAddRecord} onViewDetail={handleViewDetail} onGoToAccounts={() => handlePageChange('/accounts')} onEditTransaction={handleEditTransaction} onViewAllRecords={handleViewAllRecords} />;
      case '/record':
        return (
          <Record 
            onSuccess={handleRecordSuccess} 
            onBack={handleBack} 
            editTransaction={editTransaction}
            selectedDateTime={recordDateTime}
            onDateTimeChange={setRecordDateTime}
            selectedAccountId={recordAccountId}
            onShowDatePicker={() => setShowRecordDatePicker(true)}
            onShowTimePicker={() => setShowRecordTimePicker(true)}
            onShowAccountPicker={() => setShowAccountPicker(true)}
            amount={recordAmount}
            note={recordNote}
            showKeypad={showKeypad}
            onShowKeypad={() => setShowKeypad(true)}
            onHideKeypad={() => setShowKeypad(false)}
            onAmountChange={setRecordAmount}
            onNoteChange={setRecordNote}
            categoryId={recordCategoryId}
            type={recordType}
            onCategoryChange={setRecordCategoryId}
            onTypeChange={setRecordType}
          />
        );
      case '/categories':
        return <Categories onViewCategoryDetail={handleViewCategoryDetail} onBack={handleBack} />;
      case '/statistics':
        return (
          <Statistics 
            onBack={handleBack} 
            selectedDate={calendarSelectedDate}
            onShowCalendar={() => setShowCalendar(true)}
            onDateChange={setCalendarSelectedDate}
          />
        );
      case '/accounts':
        return <Accounts onBack={handleBack} onViewAccountDetail={handleViewAccountDetail} />;
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
      default:
        return <Dashboard onAddRecord={handleAddRecord} onViewDetail={handleViewDetail} onGoToAccounts={() => handlePageChange('/accounts')} onEditTransaction={handleEditTransaction} />;
    }
  };

  const showBottomNav = currentPage !== '/detail' && currentPage !== '/account-detail' && currentPage !== '/transfer';

  const hasModalOpen = showCalendar || showRecordDatePicker || showRecordTimePicker || showAccountPicker || showKeypad;

  return (
    <div className={`min-h-screen bg-gray-50 relative ${isSwiping || hasModalOpen ? 'overflow-hidden' : ''}`}>
      {canGoBack && (
        <>
          <div 
            className={`fixed left-0 top-0 bottom-0 w-8 flex items-center justify-center z-20 transition-opacity duration-200 ${showLeftIndicator ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleBack}
          >
            <div className="w-1.5 h-20 bg-gray-400 rounded-r-full shadow-sm" />
          </div>
          <div 
            className={`fixed right-0 top-0 bottom-0 w-8 flex items-center justify-center z-20 transition-opacity duration-200 ${showRightIndicator ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleBack}
          >
            <div className="w-1.5 h-20 bg-gray-400 rounded-l-full shadow-sm" />
          </div>
        </>
      )}

      <div 
        className={`transition-all duration-300 ease-out ${isSwiping ? '' : ''}`}
        style={{ 
          transform: canGoBack ? `translateX(${swipeProgress * 120}px) scale(${1 - Math.abs(swipeProgress) * 0.05})` : 'none',
          opacity: canGoBack ? 1 - Math.abs(swipeProgress) * 0.3 : 1,
          boxShadow: canGoBack ? `-${Math.abs(swipeProgress) * 20}px 0 ${Math.abs(swipeProgress) * 30}px rgba(0,0,0,0.15)` : 'none',
        }}
      >
        {renderPage()}
      </div>

      {isSwiping && canGoBack && (
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
                    <Icons.Wallet size={28} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500">还没有添加账户</p>
                </div>
              ) : (
                accounts.map((account) => {
                  const IconComponent = iconMap[account.icon] || Icons.Wallet;
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

      {currentPage === '/record' && (
        <NumericKeypad
          amount={recordAmount}
          note={recordNote}
          isFormValid={!!recordAmount && !!recordCategoryId && !!recordAccountId}
          onNumberClick={(num: string) => {
            if (num === '') {
              handleKeypadClear();
            } else {
              handleKeypadNumberClick(num);
            }
          }}
          onNoteChange={setRecordNote}
          onSubmit={handleRecordSubmit}
          onToggle={() => setShowKeypad(!showKeypad)}
          isExpanded={showKeypad}
          submitLabel={!!editTransaction ? '保存' : undefined}
        />
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
    </div>
  );
}
