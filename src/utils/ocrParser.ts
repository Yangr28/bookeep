import { Category, TransactionType } from '../types';
import { Capacitor } from '@capacitor/core';
import { getOCREndpoints, isOCRReady, downloadOCRData, type OCRCacheStatus } from './ocrCache';
import AppUpdate from '../plugins/appUpdate';
import { findCategoryByIdentifier } from './smartParser';

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
  // 复用 smartParser 的统一分类识别（通用关键词 + 用户分类名 + 别名 + 模糊匹配）
  return findCategoryByIdentifier(categories, type, note);
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

/* ============================================================
 * 小票/账单批量解析
 *
 * 真实小票与支付截图的典型版式：
 *   XX超市 欢迎光临
 *   2026-09-28 12:11
 *   午餐              30.00
 *   可乐               3.50
 *   电影票            80.00
 *   合计             113.50
 *
 * 旧实现按「日期行」切分交易，多行商品没有日期分隔时会被合并成一条、
 * 金额互相覆盖。这里改为逐行提取「名称 + 金额」，每行独立成一笔；
 * 名称独占一行、金额在下一行（OCR 常见两行排版）时做配对；
 * 合计/支付方式/噪声行一律不作为交易。
 * ============================================================ */

/** 金额提取结果：数值 + 用于从行中抹除金额的原始片段 */
interface AmountHit {
  amount: string;
  raw: string;
  /** 正负号：- 支出 / + 收入 / 0 未指定 */
  sign: -1 | 0 | 1;
}

/** 从一行文本中提取货币金额（优先带 ¥/元/块 等明确单位的，避免误吃日期/数量/电话） */
const extractAmountFromLine = (line: string): AmountHit | null => {
  const patterns: RegExp[] = [
    /([+-]?)\s*[¥￥]\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/, // ¥30 / ￥1,200.00
    /([+-]?)\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:元|圆|块钱?|RMB|rmb)/, // 30元 / 1,200.00元
  ];
  for (const re of patterns) {
    const m = line.match(re);
    if (m) {
      const num = parseFloat(m[2].replace(/,/g, ''));
      if (isFiniteAmount(num)) {
        return { amount: String(num), raw: m[0], sign: m[1] === '-' ? -1 : m[1] === '+' ? 1 : 0 };
      }
    }
  }
  // 行尾裸数字（仅在位于行末、且前面是空白分隔时才认，降低误判率）
  const tail = line.match(/(\d+(?:\.\d{1,2})?)\s*$/);
  if (tail) {
    const num = parseFloat(tail[1]);
    if (isFiniteAmount(num) && /\s{1,}|[.、:：]/.test(line.slice(0, tail.index))) {
      return { amount: String(num), raw: tail[0], sign: 0 };
    }
  }
  return null;
};

const isFiniteAmount = (n: number) => isFinite(n) && n > 0 && n < 100000000;

/** 纯日期/时间行（小票抬头、每行的日期前缀） */
const DATE_LINE_RE = /^\s*(?:\d{4}[-/年.]\s*)?\d{1,2}\s*[-/月.]\s*\d{1,2}\s*[日号]?\s*(?:\d{1,2}:\d{2}(?::\d{2})?)?\s*$/;
const TIME_LINE_RE = /^\s*\d{1,2}:\d{2}(?::\d{2})?\s*$/;

/** 汇总/支付方式行：不是具体商品，绝不能作为一条交易 */
const SUMMARY_RE = /(合计|总计|小计|共计|总金额|价税合计|应付|实付|实收|实付金额|应收|现金|微信支付?|支付宝|云闪付|银联|刷卡|银行卡|储值卡|优惠券?|折扣|优惠|抹零|找零|退款金额|余额|积分|订单号|单号|流水号|交易号|商户单号|支付时间|交易时间|收款方|付款方|付款时间|餐盒费|服务费|配送费|运费|税费|税额|手续费)/;

/** 噪声行：店名/宣传/地址/联系方式等，不作商品名也不参与配对 */
const NOISE_RE = /(欢迎光临|谢谢惠顾|感谢惠顾|欢迎再次光临|营业时间|服务热线|订餐热线|电话|地址|官网|网址|二维码|扫码|收银员|收银|营业员|柜台|机号|工号|门店|分店|小票号|发票|抬头|税号|凭证|凭条|存根|持卡人|签单|授权号|批号|参考号|Issued|Hotline|Tel|Add|NO\.?\s*$)/i;

/** 行首序号/数量前缀： 1. / 1、 / (1) / ① / *2 / x2 个 等 */
const LEADING_INDEX_RE = /^[\s*•・\-—_:：.|、()（）[\]【】0-9①②③④⑤⑥⑦⑧⑨⑩]+/;
/** 数量×单价片段： x2 / ×3 / *2 / 2个 / 3瓶 等 */
const QTY_RE = /(?:[x×*]\s*\d+|\d+\s*(?:个|份|瓶|杯|件|盒|包|袋|只|条|本|支|罐|箱|斤|公斤|kg|g|ml|L))/gi;
/** 纯数量行：如 2 x 15.00（第二个数是单价，整行无商品名） */
const QTY_PRICE_LINE_RE = /^\s*\d+\s*[x×*]\s*\d+(?:\.\d+)?\s*$/;

/** 从金额行残余文字中清洗出商品名 */
const cleanName = (raw: string): string => raw
  .replace(QTY_RE, ' ')
  .replace(LEADING_INDEX_RE, ' ')
  .replace(/[¥￥]/g, ' ')
  .replace(/(?:支付|消费|转账|收款|收入|扣款|缴费|付款|支出|到账|红包|退款)/g, ' ')
  .replace(/[+-]/g, ' ')
  .replace(/[\s]+/g, ' ')
  .trim();

export const extractTransactionsFromText = (text: string, categories: Category[]): ParsedTransaction[] => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1) 先找小票抬头共享日期/时间
  let sharedDate = '';
  let sharedTime = '';
  for (const line of lines.slice(0, 8)) {
    const dm = line.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
    if (dm && !sharedDate) {
      sharedDate = `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}`;
    }
    const tm = line.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (tm && !sharedTime) {
      sharedTime = `${tm[1].padStart(2, '0')}:${tm[2]}`;
    }
    if (sharedDate && sharedTime) break;
  }

  interface RawItem { amount: string; note: string; type: TransactionType }
  const items: RawItem[] = [];
  /** 最近一个「纯名称行」，等待与下一金额行配对（名称与金额被 OCR 拆成两行的版式） */
  let pendingName = '';
  const seen = new Set<string>();

  const pushItem = (amount: string, rawName: string, line: string, sign: -1 | 0 | 1) => {
    let name = cleanName(rawName);
    if (!name) name = pendingName ? cleanName(pendingName) : '';
    pendingName = '';

    // 去重：同名同金额只保留一笔（小票表头/汇总重复打印的情况）
    const key = `${name}|${amount}`;
    if (seen.has(key)) return;
    seen.add(key);

    let type: TransactionType = 'expense';
    if (sign === 1 || line.includes('收入') || line.includes('收款') || line.includes('到账') || line.includes('退款') || line.includes('红包') || line.includes('工资')) {
      type = 'income';
    }

    items.push({ amount, note: name || '图片识别记账', type });
  };

  for (const originalLine of lines) {
    let line = originalLine;

    // 去掉行首内嵌日期前缀（"09-28 12:11 午餐 30.00" 账单流水中的时间戳）
    line = line
      .replace(/^\s*\d{4}[-/年.]\d{1,2}[-/月.]\d{1,2}[日号]?\s*/, '')
      .replace(/^\s*\d{1,2}[-/.]\d{1,2}\s*/, '')
      .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*/, '')
      .trim();
    if (!line) continue;

    // 纯日期/时间行
    if (DATE_LINE_RE.test(originalLine) || TIME_LINE_RE.test(originalLine)) continue;
    // 纯数量×单价行（金额是单价，不是一笔交易）
    if (QTY_PRICE_LINE_RE.test(line)) { pendingName = ''; continue; }

    const hit = extractAmountFromLine(line);

    if (hit) {
      // 汇总/支付方式/噪声行带金额：跳过并使待配对名称失效
      if (SUMMARY_RE.test(line) || NOISE_RE.test(line)) {
        pendingName = '';
        continue;
      }
      const namePart = line.replace(hit.raw, ' ');
      pushItem(hit.amount, namePart, originalLine, hit.sign);
    } else {
      // 无金额行：作为待配对名称（噪声/纯序号行除外）
      const cleaned = cleanName(line);
      if (!cleaned || NOISE_RE.test(line) || SUMMARY_RE.test(line)) {
        pendingName = '';
        continue;
      }
      // 电话号码/单号等长数字字母串不作名称
      if (/^[0-9\s-]{7,}$/.test(cleaned)) { pendingName = ''; continue; }
      pendingName = cleaned;
    }
  }

  // 2) 多行商品 → 逐笔生成；共享抬头日期时间
  const baseDate = sharedDate ? new Date(`${sharedDate}T${sharedTime || '00:00'}:00`) : new Date();
  const results: ParsedTransaction[] = items.map((it) => {
    const categoryId = findCategoryByIdentifierOCR(categories, it.type, it.note);
    return {
      amount: it.amount,
      note: it.note,
      type: it.type,
      date: new Date(baseDate),
      categoryId,
    };
  });

  if (results.length > 0) return results;

  // 3) 兜底：整页只有一笔（单张支付成功截图），走整文本单条解析
  const singleResult = parseOCRText(text);
  if (singleResult.amount) {
    return [processOCRResult(singleResult, categories)].filter(
      (r) => r.amount && parseFloat(r.amount) > 0
    );
  }

  return [];
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
    // 浏览器：直接用 CDN（版本与 tesseract.js@7 主线程一致）
    workerPath = 'https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js';
    corePath = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7';
    langPath = 'https://tessdata.projectnaptha.com/4.0.0';
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
