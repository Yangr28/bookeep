/**
 * 备份文件加密（WebCrypto AES-256-GCM + PBKDF2 派生密钥）
 * 文件格式：BOOKEEP-ENC1:<base64(salt)>:<base64(iv)>:<base64(ciphertext)>
 * 明文 JSON 备份完全兼容：不带前缀的文件按原样解析。
 */

const PREFIX = 'BOOKEEP-ENC1:';
const PBKDF2_ITERATIONS = 150000;

/** 解密失败（密码错误或文件损坏） */
export class BackupDecryptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupDecryptError';
  }
}

/** 需要用户提供密码（应用内恢复加密备份时抛出） */
export class BackupPasswordRequiredError extends Error {
  constructor() {
    super('backup password required');
    this.name = 'BackupPasswordRequiredError';
  }
}

export const isEncryptedBackup = (text: string): boolean => text.startsWith(PREFIX);

/** ArrayBuffer → base64（分块转换，避免大数组展开溢出调用栈） */
const bytesToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

/** 加密备份文本（参数为任意 JSON 字符串），返回带前缀的密文文本 */
export const encryptBackupText = async (json: string, password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(json),
  );
  return `${PREFIX}${bytesToBase64(salt.buffer as ArrayBuffer)}:${bytesToBase64(iv.buffer as ArrayBuffer)}:${bytesToBase64(cipher)}`;
};

/** 解密备份文本，返回明文 JSON；密码错误或文件损坏抛 BackupDecryptError */
export const decryptBackupText = async (text: string, password: string): Promise<string> => {
  if (!isEncryptedBackup(text)) return text;
  try {
    const [, saltB64, ivB64, dataB64] = text.split(':');
    if (!saltB64 || !ivB64 || !dataB64) throw new Error('malformed');
    const key = await deriveKey(password, base64ToBytes(saltB64));
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(ivB64) as BufferSource },
      key,
      base64ToBytes(dataB64),
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new BackupDecryptError('密码错误或文件已损坏');
  }
};
