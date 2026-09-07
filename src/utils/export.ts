import { Transaction, Account, Category } from '../types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface ExportData {
  version: string;
  exportTime: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

export const exportData = (transactions: Transaction[], accounts: Account[], categories: Category[]): ExportData => {
  return {
    version: '4.1.0',
    exportTime: new Date().toISOString(),
    transactions,
    accounts,
    categories,
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

export const importData = (jsonString: string): ExportData => {
  return JSON.parse(jsonString);
};