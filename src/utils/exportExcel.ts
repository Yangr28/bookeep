import { Filesystem, Directory } from '@capacitor/filesystem';
import type { Account, Category, Transfer, Transaction } from '../types';

interface ExcelExportInput {
  transactions: Transaction[];
  transfers: Transfer[];
  accounts: Account[];
  categories: Category[];
}

const pad = (n: number) => String(n).padStart(2, '0');

const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** ArrayBuffer → base64（分块处理，避免大数组展开导致调用栈溢出） */
const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

/**
 * 将账单导出为 .xlsx 文件。
 * 明细放在「账单明细」表，转账单独放在「转账记录」表，避免与收支混算。
 */
export const exportToExcel = async ({
  transactions,
  transfers,
  accounts,
  categories,
}: ExcelExportInput): Promise<{ fileName: string; uri: string }> => {
  const mod = await import('xlsx');
  const XLSX = (mod as unknown as { default?: typeof import('xlsx') }).default ?? mod;

  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  const txHeader = ['日期', '时间', '类型', '分类', '账户', '金额(元)', '币种', '原币金额', '汇率', '备注', '标签'];
  const txRows = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((tx) => {
      const d = new Date(tx.createdAt);
      return {
        '日期': formatDate(d),
        '时间': formatTime(d),
        '类型': tx.type === 'income' ? '收入' : '支出',
        '分类': categoryNames.get(tx.categoryId) || '未分类',
        '账户': accountNames.get(tx.accountId) || '-',
        '金额(元)': tx.type === 'income' ? tx.amount : -tx.amount,
        '币种': tx.currency || 'CNY',
        '原币金额': tx.originalAmount ?? tx.amount,
        '汇率': tx.exchangeRate ?? 1,
        '备注': tx.note || '',
        '标签': (tx.tags ?? []).join('、'),
      };
    });

  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(txRows, { header: txHeader });
  ws['!cols'] = [
    { wch: 11 }, { wch: 8 }, { wch: 7 }, { wch: 14 }, { wch: 16 },
    { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 18 },
  ];
  // 金额列千分位、汇率列四位小数
  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let r = 1; r <= range.e.r; r += 1) {
      [5, 7, 8].forEach((c) => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && typeof cell.v === 'number') {
          cell.z = c === 8 ? '0.0000' : '#,##0.00';
        }
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, '账单明细');

  if (transfers.length > 0) {
    const transferHeader = ['日期', '时间', '转出账户', '转入账户', '金额(元)', '备注'];
    const transferRows = [...transfers]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((tr) => {
        const d = new Date(tr.createdAt);
        return {
          '日期': formatDate(d),
          '时间': formatTime(d),
          '转出账户': accountNames.get(tr.fromAccountId) || '-',
          '转入账户': accountNames.get(tr.toAccountId) || '-',
          '金额(元)': tr.amount,
          '备注': tr.note || '',
        };
      });
    const wsTransfer = XLSX.utils.json_to_sheet(transferRows, { header: transferHeader });
    wsTransfer['!cols'] = [{ wch: 11 }, { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsTransfer, '转账记录');
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const fileName = `bookeep_bills_${formatDate(new Date())}.xlsx`;
  const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  try {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: toBase64(buffer),
      directory: Directory.Documents,
    });
    return { fileName, uri: result.uri };
  } catch {
    // 浏览器/WebView 环境下回退为下载
    const blob = new Blob([buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { fileName, uri: `downloads://${fileName}` };
  }
};
