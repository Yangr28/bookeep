import { useState, useEffect, useCallback } from 'react';
import { Lock, Eye, EyeOff, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AppLockProps {
  onUnlock: () => void;
  isSetupMode?: boolean;
  onSetupComplete?: () => void;
}

const LOCK_KEY = 'bookeep_app_lock';
const PASSWORD_KEY = 'bookeep_password';

/** 生成 16 字节随机盐（十六进制） */
function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 加盐 SHA-256 哈希（salt$hash 格式存储） */
async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 设置密码：加盐哈希后存储 */
async function storePassword(password: string): Promise<void> {
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);
  localStorage.setItem(PASSWORD_KEY, `${salt}$${hash}`);
}

/** 校验密码：兼容旧版明文存储（校验成功后自动迁移为加盐哈希） */
async function verifyPassword(password: string): Promise<boolean> {
  const stored = localStorage.getItem(PASSWORD_KEY);
  if (!stored) return false;
  if (stored.includes('$')) {
    // 加盐哈希格式 salt$hash
    const [salt, hash] = stored.split('$');
    const computed = await hashPassword(password, salt);
    return computed === hash;
  }
  // 旧版明文存储：比对成功后自动迁移为加盐哈希
  if (password === stored) {
    await storePassword(password);
    return true;
  }
  return false;
}

export const AppLock = ({ onUnlock, isSetupMode = false, onSetupComplete }: AppLockProps) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleInput = (num: string) => {
    if (isSetupMode) {
      if (password.length < 4) {
        setPassword(password + num);
      } else if (confirmPassword.length < 4) {
        setConfirmPassword(confirmPassword + num);
      }
    } else {
      if (password.length < 4) {
        setPassword(password + num);
      }
    }
    setError('');
  };

  const handleDelete = () => {
    if (isSetupMode) {
      if (confirmPassword.length > 0) {
        setConfirmPassword(confirmPassword.slice(0, -1));
      } else if (password.length > 0) {
        setPassword(password.slice(0, -1));
      }
    } else {
      setPassword(password.slice(0, -1));
    }
    setError('');
  };

  const handleSubmit = useCallback(async () => {
    if (isSetupMode) {
      if (password.length < 4 || confirmPassword.length < 4) {
        setError(t('appLock.enter4Digits'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('appLock.mismatch'));
        setPassword('');
        setConfirmPassword('');
        return;
      }
      await storePassword(password);
      localStorage.setItem(LOCK_KEY, 'true');
      onSetupComplete?.();
    } else {
      setVerifying(true);
      try {
        const ok = await verifyPassword(password);
        if (ok) {
          onUnlock();
        } else {
          setError(t('appLock.wrongPassword'));
          setPassword('');
        }
      } finally {
        setVerifying(false);
      }
    }
  }, [password, confirmPassword, isSetupMode, onUnlock, onSetupComplete, t]);

  useEffect(() => {
    if (!isSetupMode && password.length === 4 && !verifying) {
      handleSubmit();
    }
  }, [password, isSetupMode, verifying, handleSubmit]);

  const renderDots = (text: string) => {
    return Array(4).fill(null).map((_, i) => (
      <div
        key={i}
        className="w-3.5 h-3.5 rounded-full transition-all"
        style={
          i < text.length
            ? { background: 'var(--primary)', transform: 'scale(1.1)' }
            : { background: 'transparent', border: '2px solid var(--line)' }
        }
      />
    ));
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6"
      style={{ background: 'var(--paper)' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--primary)', color: '#fff', boxShadow: 'var(--shadow-fab)' }}
          >
            {isSetupMode ? <Settings size={30} /> : <Lock size={30} />}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
            {isSetupMode ? t('appLock.setupTitle') : t('appLock.unlockTitle')}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--ink-2)' }}>
            {isSetupMode ? t('appLock.setupSubtitle') : t('appLock.unlockSubtitle')}
          </p>
        </div>

        <div className="card p-6">
          {error && (
            <div
              className="mb-4 p-3 rounded-button text-sm text-center"
              style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}
            >
              {error}
            </div>
          )}

          <div className="flex justify-center items-center gap-4 mb-6 min-h-[1.5rem]">
            {isSetupMode && confirmPassword.length > 0 ? (
              <>
                <div className="flex gap-2">
                  {renderDots(password)}
                </div>
                <span style={{ color: 'var(--ink-2)' }}>→</span>
                <div className="flex gap-2">
                  {renderDots(confirmPassword)}
                </div>
              </>
            ) : (
              <div className="flex gap-3">
                {renderDots(password)}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowPassword(!showPassword)}
            className="mx-auto mb-4 text-sm flex items-center gap-1"
            style={{ color: 'var(--ink-2)' }}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPassword ? t('appLock.hidePassword') : t('appLock.showPassword')}
          </button>

          {showPassword && (
            <div
              className="text-center mb-4 text-lg font-mono amount-num"
              style={{ color: 'var(--ink)' }}
            >
              {isSetupMode ? `${password}${confirmPassword ? ' → ' + confirmPassword : ''}` : password}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((num) => {
              if (num === '') {
                return <button key="empty" disabled className="h-14" />;
              }
              const isDelete = num === 'delete';
              return (
                <button
                  key={isDelete ? 'delete' : num}
                  onClick={() => (isDelete ? handleDelete() : handleInput(num))}
                  className="h-14 rounded-full text-xl font-semibold transition-all active:scale-95 flex items-center justify-center"
                  style={{
                    background: 'var(--paper-deep)',
                    color: isDelete ? 'var(--ink-2)' : 'var(--ink)',
                  }}
                >
                  {isDelete ? <DeleteIcon /> : num}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const isAppLocked = () => localStorage.getItem(LOCK_KEY) === 'true';

export const unlockApp = () => {
  localStorage.removeItem(LOCK_KEY);
};

export const lockApp = () => {
  localStorage.setItem(LOCK_KEY, 'true');
};
