import { useState, useCallback } from 'react';
import { Transaction } from '../types';

type FilterType = 'today-income' | 'today-expense' | 'month-income' | 'month-expense' | 'total-balance' | 'month-balance';

interface ModalState {
  showCalendar: boolean;
  showRecordDatePicker: boolean;
  showRecordTimePicker: boolean;
  showAccountPicker: boolean;
  showKeypad: boolean;
  showExitConfirm: boolean;
  calendarSelectedDate: Date;
  recordDateTime: Date;
  recordAccountId: string | null;
  recordAmount: string;
  recordNote: string;
  recordCategoryId: string | null;
  recordType: 'expense' | 'income';
  editTransaction: Transaction | null;
  detailFilter: FilterType;
  selectedCategoryId: string | null;
  selectedAccountId: string | null;
}

export const useModal = () => {
  const [state, setState] = useState<ModalState>({
    showCalendar: false,
    showRecordDatePicker: false,
    showRecordTimePicker: false,
    showAccountPicker: false,
    showKeypad: false,
    showExitConfirm: false,
    calendarSelectedDate: new Date(),
    recordDateTime: new Date(),
    recordAccountId: null,
    recordAmount: '',
    recordNote: '',
    recordCategoryId: null,
    recordType: 'expense',
    editTransaction: null,
    detailFilter: 'today-income',
    selectedCategoryId: null,
    selectedAccountId: null,
  });

  const hasModalOpen = () => {
    return state.showCalendar || state.showRecordDatePicker || state.showRecordTimePicker || state.showAccountPicker || state.showKeypad;
  };

  const setModal = useCallback(<K extends keyof ModalState>(key: K, value: ModalState[K]) => {
    setState(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const closeAllModals = useCallback(() => {
    setState(prev => ({
      ...prev,
      showCalendar: false,
      showRecordDatePicker: false,
      showRecordTimePicker: false,
      showAccountPicker: false,
      showKeypad: false,
      showExitConfirm: false,
    }));
  }, []);

  const openModal = useCallback(<K extends keyof ModalState>(key: K) => {
    setState(prev => ({
      ...prev,
      [key]: true,
    }));
  }, []);

  const closeModal = useCallback(<K extends keyof ModalState>(key: K) => {
    setState(prev => ({
      ...prev,
      [key]: false,
    }));
  }, []);

  const toggleModal = useCallback(<K extends keyof ModalState>(key: K) => {
    setState(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const setShowExitConfirm = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, showExitConfirm: value }));
  }, []);

  const setShowCalendar = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, showCalendar: value }));
  }, []);

  const setShowRecordDatePicker = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, showRecordDatePicker: value }));
  }, []);

  const setShowRecordTimePicker = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, showRecordTimePicker: value }));
  }, []);

  const setShowAccountPicker = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, showAccountPicker: value }));
  }, []);

  const setShowKeypad = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, showKeypad: value }));
  }, []);

  const setCalendarSelectedDate = useCallback((value: Date) => {
    setState(prev => ({ ...prev, calendarSelectedDate: value }));
  }, []);

  const setRecordDateTime = useCallback((value: Date) => {
    setState(prev => ({ ...prev, recordDateTime: value }));
  }, []);

  const setRecordAccountId = useCallback((value: string | null) => {
    setState(prev => ({ ...prev, recordAccountId: value }));
  }, []);

  const setRecordAmount = useCallback((value: string) => {
    setState(prev => ({ ...prev, recordAmount: value }));
  }, []);

  const setRecordNote = useCallback((value: string) => {
    setState(prev => ({ ...prev, recordNote: value }));
  }, []);

  const setRecordCategoryId = useCallback((value: string | null) => {
    setState(prev => ({ ...prev, recordCategoryId: value }));
  }, []);

  const setRecordType = useCallback((value: 'expense' | 'income') => {
    setState(prev => ({ ...prev, recordType: value }));
  }, []);

  const setEditTransaction = useCallback((value: Transaction | null) => {
    setState(prev => ({ ...prev, editTransaction: value }));
  }, []);

  const setDetailFilter = useCallback((value: FilterType) => {
    setState(prev => ({ ...prev, detailFilter: value }));
  }, []);

  const setSelectedCategoryId = useCallback((value: string | null) => {
    setState(prev => ({ ...prev, selectedCategoryId: value }));
  }, []);

  const setSelectedAccountId = useCallback((value: string | null) => {
    setState(prev => ({ ...prev, selectedAccountId: value }));
  }, []);

  return {
    ...state,
    hasModalOpen,
    setModal,
    closeAllModals,
    openModal,
    closeModal,
    toggleModal,
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
  };
};