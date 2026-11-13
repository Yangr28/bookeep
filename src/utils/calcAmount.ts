/**
 * 金额算式求值：记账金额输入支持四则运算，如 12+8、25*4、100-12.5*2、(12+8)/2
 * 递归下降解析（禁用 eval），仅接受数字、+ - * / × ÷ ( ) 与空格。
 */

/** 是否为合法算式字符（用于快速短路） */
const EXPR_CHARS = /^[\d\s.+\-*/()×÷]+$/;

interface ParseState {
  input: string;
  pos: number;
}

const peek = (s: ParseState): string | undefined => s.input[s.pos];

const skipSpaces = (s: ParseState) => {
  while (s.pos < s.input.length && s.input[s.pos] === ' ') s.pos += 1;
};

// expr := term (('+' | '-') term)*
const parseExpr = (s: ParseState): number => {
  let value = parseTerm(s);
  for (;;) {
    skipSpaces(s);
    const c = peek(s);
    if (c === '+') {
      s.pos += 1;
      value += parseTerm(s);
    } else if (c === '-') {
      s.pos += 1;
      value -= parseTerm(s);
    } else {
      return value;
    }
  }
};

// term := factor (('*' | '/') factor)*
const parseTerm = (s: ParseState): number => {
  let value = parseFactor(s);
  for (;;) {
    skipSpaces(s);
    const c = peek(s);
    if (c === '*' || c === '×') {
      s.pos += 1;
      value *= parseFactor(s);
    } else if (c === '/' || c === '÷') {
      s.pos += 1;
      const divisor = parseFactor(s);
      if (divisor === 0) throw new Error('division by zero');
      value /= divisor;
    } else {
      return value;
    }
  }
};

// factor := number | '(' expr ')' | ('-' | '+') factor
const parseFactor = (s: ParseState): number => {
  skipSpaces(s);
  const c = peek(s);
  if (c === undefined) throw new Error('unexpected end');
  if (c === '(') {
    s.pos += 1;
    const value = parseExpr(s);
    skipSpaces(s);
    if (peek(s) !== ')') throw new Error('missing )');
    s.pos += 1;
    return value;
  }
  if (c === '-' || c === '+') {
    s.pos += 1;
    const value = parseFactor(s);
    return c === '-' ? -value : value;
  }
  // 数字（整数/小数）
  const start = s.pos;
  while (s.pos < s.input.length && /[0-9.]/.test(s.input[s.pos])) s.pos += 1;
  const numStr = s.input.slice(start, s.pos);
  if (!numStr || Number.isNaN(Number(numStr))) throw new Error('invalid number');
  const value = Number(numStr);
  if (!Number.isFinite(value)) throw new Error('invalid number');
  return value;
};

/**
 * 计算金额算式；成功返回结果（保留合理精度），失败返回 null。
 * 纯数字（无运算符）返回 null —— 走原有 parseFloat 路径，保持错误提示不变。
 */
export const calcAmount = (raw: string): number | null => {
  const input = raw.trim();
  if (!input || !EXPR_CHARS.test(input)) return null;
  // 无运算符视为纯数字，交给原有解析
  if (!/[+\-*/×÷]/.test(input)) return null;

  try {
    const state: ParseState = { input: input.replace(/×/g, '*').replace(/÷/g, '/'), pos: 0 };
    const value = parseExpr(state);
    skipSpaces(state);
    if (state.pos !== state.input.length) return null; // 有剩余字符 = 非法
    if (!Number.isFinite(value)) return null;
    // 消除浮点误差：12.1+8.2 → 20.3 而非 20.299999...
    return Number(value.toFixed(4));
  } catch {
    return null;
  }
};
