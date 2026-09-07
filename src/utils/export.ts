import { Transaction, Account, Category, Transfer, RecurringRecord, RecordTemplate, FixedDeposit, Loan } from '../types';
import { Budget } from '../store/budgetsSlice';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface ExportData {
  version: string;
  exportTime: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  transfers: Transfer[];
  recurringRecords: RecurringRecord[];
  templates: RecordTemplate[];
  budgets: Budget[];
  fixedDeposits: FixedDeposit[];
  loans: Loan[];
}

export const CURRENT_EXPORT_VERSION = '4.5.0';

interface ExportParams {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  transfers: Transfer[];
  recurringRecords: RecurringRecord[];
  templates: RecordTemplate[];
  budgets: Budget[];
  fixedDeposits: FixedDeposit[];
  loans: Loan[];
}

export const exportData = (params: ExportParams): ExportData => {
  return {
    version: CURRENT_EXPORT_VERSION,
    exportTime: new Date().toISOString(),
    transactions: params.transactions,
    accounts: params.accounts,
    categories: params.categories,
    transfers: params.transfers,
    recurringRecords: params.recurringRecords,
    templates: params.templates,
    budgets: params.budgets,
    fixedDeposits: params.fixedDeposits,
    loans: params.loans,
  };
};

export const downloadExportFile = async (data: ExportData): Promise<string> => {
  const json = JSON.stringify(data, null, 2);
  const fileName = `bookeep_backup_${new Date().toISOString().split('T')[0]}.json`;
  
  try {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    
    return result.uri;
  } catch (error) {
    console.warn('Filesystem write failed, falling back to browser download:', error);
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return `downloads://${fileName}`;
  }
};

/**
 * 解析并校验导入的备份数据
 * - 校验 JSON 合法性
 * - 校验必备字段存在
 * - 兼容旧版备份（缺少 transfers 等字段时补空数组）
 */
export const parseImportData = (jsonString: string): ExportData => {
  const raw = JSON.parse(jsonString);

  if (!raw || typeof raw !== 'object') {
    throw new Error('备份文件格式无效');
  }

  // 必备字段校验
  const required = ['transactions', 'accounts', 'categories'];
  for (const key of required) {
    if (!Array.isArray(raw[key])) {
      throw new Error(`备份文件缺少必备字段: ${key}`);
    }
  }

  // 兼容旧版备份：缺少的字段补空数组
  return {
    version: raw.version || 'unknown',
    exportTime: raw.exportTime || new Date().toISOString(),
    transactions: raw.transactions,
    accounts: raw.accounts,
    categories: raw.categories,
    transfers: Array.isArray(raw.transfers) ? raw.transfers : [],
    recurringRecords: Array.isArray(raw.recurringRecords) ? raw.recurringRecords : [],
    templates: Array.isArray(raw.templates) ? raw.templates : [],
    budgets: Array.isArray(raw.budgets) ? raw.budgets : [],
    fixedDeposits: Array.isArray(raw.fixedDeposits) ? raw.fixedDeposits : [],
    loans: Array.isArray(raw.loans) ? raw.loans : [],
  };
};
