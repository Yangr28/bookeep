import { create } from 'zustand';
import { createTransactionsSlice, TransactionsSlice } from './transactionsSlice';
import { createCategoriesSlice, CategoriesSlice } from './categoriesSlice';
import { createAccountsSlice, AccountsSlice } from './accountsSlice';
import { createFixedDepositsSlice, FixedDepositsSlice } from './fixedDepositsSlice';
import { createLoansSlice, LoansSlice } from './loansSlice';
import { createTransfersSlice, TransfersSlice } from './transfersSlice';
import { createCalculationsSlice, CalculationsSlice } from './calculationsSlice';
import { createPreferencesSlice, PreferencesSlice } from './preferencesSlice';
import { createBudgetsSlice, BudgetsSlice } from './budgetsSlice';
import { createRecurringSlice, RecurringSlice } from './recurringSlice';
import { createTemplatesSlice, TemplatesSlice } from './templatesSlice';

type Store = TransactionsSlice & CategoriesSlice & AccountsSlice & FixedDepositsSlice & LoansSlice & TransfersSlice & CalculationsSlice & PreferencesSlice & BudgetsSlice & RecurringSlice & TemplatesSlice;

export const useStore = create<Store>()(
  (...args) => ({
    ...createTransactionsSlice(...args),
    ...createCategoriesSlice(...args),
    ...createAccountsSlice(...args),
    ...createFixedDepositsSlice(...args),
    ...createLoansSlice(...args),
    ...createTransfersSlice(...args),
    ...createCalculationsSlice(...args),
    ...createPreferencesSlice(...args),
    ...createBudgetsSlice(...args),
    ...createRecurringSlice(...args),
    ...createTemplatesSlice(...args),
  })
);