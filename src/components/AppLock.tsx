import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Settings } from 'lucide-react';

interface AppLockProps {
  onUnlock: () => void;
  isSetupMode?: boolean;
  onSetupComplete?: () => void;
}

const LOCK_KEY = 'bookeep_app_lock';
const PASSWORD_KEY = 'bookeep_password';

export const AppLock = ({ onUnlock, isSetupMode = false, onSetupComplete }: AppLockProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = () => {
    if (isSetupMode) {
      if (password.length < 4 || confirmPassword.length < 4) {
        setError('请输入4位数字密码');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        setPassword('');
        setConfirmPassword('');
        return;
      }
      localStorage.setItem(PASSWORD_KEY, password);
      localStorage.setItem(LOCK_KEY, 'true');
      onSetupComplete?.();
    } else {
      const savedPassword = localStorage.getItem(PASSWORD_KEY);
      if (password === savedPassword) {
        onUnlock();
      } else {
        setError('密码错误');
        setPassword('');
      }
    }
  };

  useEffect(() => {
    if (!isSetupMode && password.length === 4) {
      handleSubmit();
    }
  }, [password, isSetupMode]);

  const renderDots = (text: string) => {
    return Array(4).fill(null).map((_, i) => (
      <div
        key={i}
        className={`w-3 h-3 rounded-full transition-all ${
          i < text.length ? 'bg-primary-500 scale-110' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      />
    ));
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center z-50">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            {isSetupMode ? <Settings size={32} className="text-white" /> : <Lock size={32} className="text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {isSetupMode ? '设置应用锁' : '请输入密码'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {isSetupMode ? '设置4位数字密码保护您的账户安全' : '输入密码解锁应用'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-card p-6 shadow-lg">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-4 mb-6">
            {isSetupMode && confirmPassword.length > 0 ? (
              <>
                <div className="flex gap-2">
                  {renderDots(password)}
                </div>
                <span className="text-gray-400">→</span>
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
            className="block mx-auto mb-4 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPassword ? '隐藏密码' : '显示密码'}
          </button>

          {showPassword && (
            <div className="text-center mb-4 text-lg font-mono text-gray-800 dark:text-white">
              {isSetupMode ? `${password}${confirmPassword ? ' → ' + confirmPassword : ''}` : password}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((num) => (
              <button
                key={num}
                onClick={() => num === 'delete' ? handleDelete() : handleInput(num)}
                disabled={num === ''}
                className={`h-14 rounded-card text-xl font-semibold transition-all ${
                  num === ''
                    ? 'bg-transparent cursor-default'
                    : num === 'delete'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95'
                }`}
              >
                {num === 'delete' ? <DeleteIcon /> : num}
              </button>
            ))}
          </div>

          {!isSetupMode && (
            <button
              onClick={() => {
                localStorage.removeItem(LOCK_KEY);
                localStorage.removeItem(PASSWORD_KEY);
                onUnlock();
              }}
              className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              跳过（不推荐）
            </button>
          )}
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