import { Category, TransactionType } from '../types';
import { Capacitor } from '@capacitor/core';
import { getOCREndpoints, isOCRReady, downloadOCRData, type OCRCacheStatus } from './ocrCache';
import AppUpdate from '../plugins/appUpdate';

export interface OCRParseResult {
  amount: string;
  note: string;
  type: TransactionType;
  date: string;
  time: string;
}

export interface ParsedTransaction {
  amount: string;
  note: string;
  type: TransactionType;
  date: Date;
  categoryId: string | null;
}

const currencyUnits = ['元', '块', '钱', '¥', '￥'];

const expenseKeywords = ['支付', '消费', '支出', '扣款', '转账', '缴费', '购物', '外卖', '打车', '充值', '还款', '账单'];
const incomeKeywords = ['收入', '收款', '转入', '到账', '红包', '退款', '转账收入'];

const categoryKeywords: Record<string, string[]> = {
  food: ['餐饮', '吃饭', '外卖', '午餐', '晚餐', '早餐', '零食', '奶茶', '咖啡', '饭店', '餐厅'],
  transport: ['打车', '滴滴', '出行', '地铁', '公交', '加油', '停车', '租车'],
  shopping: ['购物', '淘宝', '京东', '拼多多', '超市', '便利店', '商城'],
  entertainment: ['电影', '游戏', 'KTV', '娱乐', '演出', '门票'],
  daily: ['水电', '缴费', '话费', '网费', '快递', '理发', '洗浴'],
  health: ['医院', '买药', '挂号', '体检', '健身'],
  education: ['培训', '课程', '书籍', '学习', '学费'],
  salary: ['工资', '薪资', '收入', '奖金'],
  bonus: ['红包', '奖励', '补贴'],
  investment: ['理财', '利息', '股票', '基金'],
  transfer: ['转账', '还款', '借款'],
};

export const parseOCRText = (text: string): OCRParseResult => {
  const result: OCRParseResult = {
    amount: '',
    note: '',
    type: 'expense',
    date: '',
    time: '',
  };

  let foundAmount = '';
  let foundAmountMatch = '';

  for (const unit of currencyUnits) {
    const pattern = new RegExp(`(\\d+(?:\\.\\d{1,2})?)\\s*${unit}`);
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) {
        foundAmount = num.toString();
        foundAmountMatch = match[0];
        break;
      }
    }
  }

  if (!foundAmount) {
    const pattern = /(?:支付|消费|转账|收款|收入)\s*([\d.]+)/;
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) {
        foundAmount = num.toString();
        foundAmountMatch = match[0];
      }
    }
  }

  if (!foundAmount) {
    const pattern = /([\d.]+)\s*(?:元|元整|元人民币)/;
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) {
        foundAmount = num.toString();
        foundAmountMatch = match[0];
      }
    }
  }

  result.amount = foundAmount;

  let noteText = text;
  if (foundAmountMatch) {
    noteText = noteText.replace(foundAmountMatch, '');
  }

  const datePattern = /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日号]?/;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    result.date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    noteText = noteText.replace(dateMatch[0], '');
  }

  const timePattern = /(\d{1,2}):(\d{2})(?::(\d{2}))?/;
  const timeMatch = text.match(timePattern);
  if (timeMatch) {
    result.time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    noteText = noteText.replace(timeMatch[0], '');
  }

  for (const keyword of incomeKeywords) {
    if (text.includes(keyword)) {
      result.type = 'income';
      noteText = noteText.replace(keyword, '');
      break;
    }
  }

  for (const keyword of expenseKeywords) {
    if (text.includes(keyword)) {
      noteText = noteText.replace(keyword, '');
      break;
    }
  }

  noteText = noteText.replace(/[\s]+/g, ' ').trim();
  noteText = noteText.replace(/^[\d\s.-]+/, '').replace(/[\d\s.-]+$/, '');
  result.note = noteText || '图片识别记账';

  return result;
};

export const findCategoryByIdentifierOCR = (categories: Category[], type: TransactionType, note: string): string | null => {
  const filteredCategories = categories.filter(c => c.type === type);
  
  for (const [categoryId, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (note.includes(keyword)) {
        const category = filteredCategories.find(c => c.id === categoryId);
        if (category) {
          return category.id;
        }
      }
    }
  }

  return null;
};

export const processOCRResult = (result: OCRParseResult, categories: Category[]): ParsedTransaction => {
  const date = result.date 
    ? new Date(result.date)
    : new Date();

  if (result.time) {
    const [hours, minutes] = result.time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
  }

  const categoryId = findCategoryByIdentifierOCR(categories, result.type, result.note);

  return {
    amount: result.amount,
    note: result.note,
    type: result.type,
    date,
    categoryId,
  };
};

export const extractTransactionsFromText = (text: string, categories: Category[]): ParsedTransaction[] => {
  const results: ParsedTransaction[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentTransaction: OCRParseResult | null = null;
  let currentDate = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    const datePattern = /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日号]?/;
    const dateMatch = trimmedLine.match(datePattern);
    if (dateMatch) {
      currentDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      if (currentTransaction && currentTransaction.amount) {
        currentTransaction.date = currentTransaction.date || currentDate;
        results.push(processOCRResult(currentTransaction, categories));
      }
      currentTransaction = {
        amount: '',
        note: '',
        type: 'expense',
        date: currentDate,
        time: '',
      };
      continue;
    }

    if (!currentTransaction) {
      currentTransaction = {
        amount: '',
        note: '',
        type: 'expense',
        date: currentDate || '',
        time: '',
      };
    }

    const amountPattern = /(?:支付|消费|转账|收款|收入)?\s*(?:¥|￥)?\s*(\d+(?:\.\d{1,2})?)\s*(?:元)?/;
    const amountMatch = trimmedLine.match(amountPattern);
    if (amountMatch && parseFloat(amountMatch[1]) > 0) {
      currentTransaction.amount = amountMatch[1];

      for (const keyword of incomeKeywords) {
        if (trimmedLine.includes(keyword)) {
          currentTransaction.type = 'income';
          break;
        }
      }

      if (trimmedLine.includes('收款') || trimmedLine.includes('收入') || trimmedLine.includes('到账')) {
        currentTransaction.type = 'income';
      }

      if (trimmedLine.includes('支付') || trimmedLine.includes('消费') || trimmedLine.includes('扣款')) {
        currentTransaction.type = 'expense';
      }

      const descPattern = /(?:支付|消费|转账|收款|收入)\s*(.+?)\s*(?:¥|￥|\d)/;
      const descMatch = trimmedLine.match(descPattern);
      if (descMatch) {
        currentTransaction.note = descMatch[1].trim();
      }
    } else {
      if (currentTransaction.note) {
        currentTransaction.note += ' ' + trimmedLine;
      } else {
        currentTransaction.note = trimmedLine;
      }
    }
  }

  if (currentTransaction && currentTransaction.amount) {
    results.push(processOCRResult(currentTransaction, categories));
  }

  if (results.length === 0) {
    const singleResult = parseOCRText(text);
    if (singleResult.amount) {
      results.push(processOCRResult(singleResult, categories));
    }
  }

  return results.filter(r => r.amount && parseFloat(r.amount) > 0);
};

export interface RecognizeOptions {
  onProgress?: (status: OCRCacheStatus) => void;
}

export const recognizeImage = async (imageDataUrl: string, options?: RecognizeOptions): Promise<string> => {
  const { createWorker } = await import('tesseract.js');

  let workerPath: string;
  let corePath: string;
  let langPath: string;

  if (Capacitor.isNativePlatform()) {
    // 优先：从 APK 内置 assets 复制 OCR 资源（Java AssetManager，不受热更新 basePath 影响）
    // 新基座 APK 内置了 ocr 资源，复制仅需 1-2 秒；旧基座返回 false 则走 CDN
    try {
      const result = await AppUpdate.prepareOcrAssets();
      if (!result.ready) {
        const ready = await isOCRReady();
        if (!ready) {
          await downloadOCRData(options?.onProgress);
        }
      }
    } catch {
      // 旧基座无 prepareOcrAssets 方法，降级到原流程
      const ready = await isOCRReady();
      if (!ready) {
        await downloadOCRData(options?.onProgress);
      }
    }
    // 用 Filesystem URL（Capacitor.convertFileSrc 转换）—— 已验证在 Android WebView 可创建 Worker
    const local = await getOCREndpoints();
    workerPath = local.workerPath;
    corePath = local.corePath;
    langPath = local.langPath;
  } else {
    // 浏览器：直接用 CDN
    workerPath = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js';
    corePath = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5';
    langPath = 'https://tessdata.project.files.com/4.0.0';
  }

  // 超时保护：60 秒未完成则报错，防止永远转圈
  const timeoutMs = 60000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('OCR 识别超时，请重试')), timeoutMs);
  });

  const worker = await Promise.race([
    createWorker('chi_sim', 1, { workerPath, corePath, langPath }),
    timeoutPromise,
  ]);

  try {
    const { data: { text } } = await Promise.race([
      worker.recognize(imageDataUrl),
      timeoutPromise,
    ]);
    return text;
  } finally {
    await worker.terminate();
  }
};
