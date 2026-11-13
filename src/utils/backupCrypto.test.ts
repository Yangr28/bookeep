import { describe, it, expect } from 'vitest';
import {
  encryptBackupText,
  decryptBackupText,
  isEncryptedBackup,
  BackupDecryptError,
} from './backupCrypto';

const sampleJson = JSON.stringify({
  transactions: [{ id: '1', amount: 12.5 }],
  accounts: [],
  categories: [],
});

describe('backupCrypto', () => {
  it('加密后带前缀且不含明文', async () => {
    const encrypted = await encryptBackupText(sampleJson, 'test1234');
    expect(isEncryptedBackup(encrypted)).toBe(true);
    expect(encrypted).not.toContain('amount');
    expect(encrypted).not.toContain('{');
  });

  it('正确密码可解密还原明文', async () => {
    const encrypted = await encryptBackupText(sampleJson, 'test1234');
    const plain = await decryptBackupText(encrypted, 'test1234');
    expect(plain).toBe(sampleJson);
  });

  it('错误密码抛 BackupDecryptError', async () => {
    const encrypted = await encryptBackupText(sampleJson, 'test1234');
    await expect(decryptBackupText(encrypted, 'wrong')).rejects.toBeInstanceOf(BackupDecryptError);
  });

  it('明文备份直接透传（向后兼容）', async () => {
    const plain = await decryptBackupText(sampleJson, 'anypassword');
    expect(plain).toBe(sampleJson);
  });

  it('损坏的密文抛 BackupDecryptError', async () => {
    const encrypted = await encryptBackupText(sampleJson, 'test1234');
    const broken = `${encrypted.slice(0, -8)}AAAAAAAA`;
    await expect(decryptBackupText(broken, 'test1234')).rejects.toBeInstanceOf(BackupDecryptError);
  });

  it('相同明文两次加密产生不同密文（随机盐/IV）', async () => {
    const a = await encryptBackupText(sampleJson, 'same');
    const b = await encryptBackupText(sampleJson, 'same');
    expect(a).not.toBe(b);
  });
});
