import { describe, it, expect } from 'vitest';
import { calcAmount } from './calcAmount';

describe('calcAmount', () => {
  it('加法', () => {
    expect(calcAmount('12+8')).toBe(20);
  });

  it('减法', () => {
    expect(calcAmount('100-12.5')).toBe(87.5);
  });

  it('乘除优先级', () => {
    expect(calcAmount('2+3*4')).toBe(14);
    expect(calcAmount('10/4')).toBe(2.5);
  });

  it('括号', () => {
    expect(calcAmount('(12+8)/2')).toBe(10);
  });

  it('浮点误差消除', () => {
    expect(calcAmount('12.1+8.2')).toBe(20.3);
    expect(calcAmount('0.1+0.2')).toBe(0.3);
  });

  it('负数与一元负号', () => {
    expect(calcAmount('-5+12')).toBe(7);
    expect(calcAmount('12* -2')).toBe(-24);
  });

  it('中文乘除符号', () => {
    expect(calcAmount('6×8')).toBe(48);
    expect(calcAmount('9÷3')).toBe(3);
  });

  it('空格容忍', () => {
    expect(calcAmount(' 12 + 8 ')).toBe(20);
  });

  it('纯数字返回 null（走原路径）', () => {
    expect(calcAmount('12.5')).toBeNull();
    expect(calcAmount('88')).toBeNull();
  });

  it('非法输入返回 null', () => {
    expect(calcAmount('12++')).toBeNull();
    expect(calcAmount('(1+2')).toBeNull();
    expect(calcAmount('10/0')).toBeNull();
    expect(calcAmount('1+2abc')).toBeNull();
    expect(calcAmount('')).toBeNull();
    expect(calcAmount('abc')).toBeNull();
  });
});
