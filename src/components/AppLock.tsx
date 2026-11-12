import { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, Eye, EyeOff, Settings, X, Hash, KeyRound, Grid3x3, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AppLockProps {
  onUnlock: () => void;
  isSetupMode?: boolean;
  onSetupComplete?: () => void;
  /** 设置/验证过程中取消（不改变锁状态） */
  onCancel?: () => void;
}

export type LockType = 'pin' | 'password' | 'pattern';

const LOCK_KEY = 'bookeep_app_lock';
const PASSWORD_KEY = 'bookeep_password';
const TYPE_KEY = 'bookeep_lock_type';

export const getLockType = (): LockType => {
  const value = localStorage.getItem(TYPE_KEY);
  return value === 'password' || value === 'pattern' ? value : 'pin';
};

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
    const [salt, hash] = stored.split('$');
    const computed = await hashPassword(password, salt);
    return computed === hash;
  }
  if (password === stored) {
    await storePassword(password);
    return true;
  }
  return false;
}

/** 混合密码规则：至少 6 位，同时含字母与数字 */
const isMixedPassword = (value: string) => value.length >= 6 && /[A-Za-z]/.test(value) && /\d/.test(value);

const POINTS = Array.from({ length: 9 }, (_, i) => ({
  x: 16.67 + (i % 3) * 33.33,
  y: 16.67 + Math.floor(i / 3) * 33.33,
}));

/** 九宫格手势输入板 */
function PatternPad({
  onComplete,
  onIncomplete,
}: {
  onComplete: (sequence: string) => void;
  onIncomplete: () => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const selectingRef = useRef(false);
  const sequenceRef = useRef<number[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  const locate = (clientX: number, clientY: number): number | null => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    for (let i = 0; i < POINTS.length; i += 1) {
      const dx = POINTS[i].x - x;
      const dy = POINTS[i].y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 14) return i;
    }
    return null;
  };

  const addPoint = (index: number) => {
    if (sequenceRef.current.includes(index)) return;
    sequenceRef.current = [...sequenceRef.current, index];
    setSelected(sequenceRef.current);
  };

  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    selectingRef.current = true;
    sequenceRef.current = [];
    setSelected([]);
    const index = locate(e.clientX, e.clientY);
    if (index !== null) addPoint(index);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!selectingRef.current) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) {
      setCursor({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    }
    const index = locate(e.clientX, e.clientY);
    if (index !== null) addPoint(index);
  };

  const end = () => {
    if (!selectingRef.current) return;
    selectingRef.current = false;
    setCursor(null);
    const sequence = sequenceRef.current;
    setTimeout(() => {
      sequenceRef.current = [];
      setSelected([]);
    }, 260);
    if (sequence.length < 4) {
      onIncomplete();
      return;
    }
    onComplete(sequence.join('-'));
  };

  const lastIndex = selected.length > 0 ? selected[selected.length - 1] : null;

  return (
    <div
      ref={boxRef}
      className="relative w-full max-w-[240px] aspect-square mx-auto my-2"
      style={{ touchAction: 'none' }}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
        {selected.length > 1 && (
          <polyline
            points={selected.map((i) => `${POINTS[i].x},${POINTS[i].y}`).join(' ')}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {cursor && lastIndex !== null && (
          <line
            x1={POINTS[lastIndex].x}
            y1={POINTS[lastIndex].y}
            x2={cursor.x}
            y2={cursor.y}
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.4"
          />
        )}
      </svg>
      {POINTS.map((point, i) => {
        const active = selected.includes(i);
        return (
          <div
            key={i}
            className="absolute w-5 h-5 rounded-full transition-transform duration-150"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              transform: `translate(-50%, -50%) scale(${active ? 1.4 : 1})`,
              background: active ? 'var(--primary)' : 'var(--paper-deep)',
              border: `2px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
            }}
          />
        );
      })}
    </div>
  );
}

export const AppLock = ({ onUnlock, isSetupMode = false, onSetupComplete, onCancel }: AppLockProps) => {
  const { t } = useTranslation();
  // 设置模式先选类型；解锁模式直接读取已保存的类型
  const [lockType, setLockType] = useState<LockType | null>(isSetupMode ? null : getLockType());
  const [firstValue, setFirstValue] = useState('');
  const [input, setInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [patternKey, setPatternKey] = useState(0);

  const resetInputs = () => {
    setInput('');
    setFirstValue('');
    setPatternKey((k) => k + 1);
  };

  const finishSetup = useCallback(
    async (value: string, type: LockType) => {
      await storePassword(value);
      localStorage.setItem(TYPE_KEY, type);
      localStorage.setItem(LOCK_KEY, 'true');
      onSetupComplete?.();
    },
    [onSetupComplete],
  );

  const submitValue = useCallback(
    async (value: string) => {
      if (!lockType) return;
      if (isSetupMode) {
        if (lockType === 'password' && !isMixedPassword(value)) {
          setError(t('appLock.passwordNeedMix'));
          return;
        }
        if (!firstValue) {
          setFirstValue(value);
          setInput('');
          setError('');
          return;
        }
        if (value !== firstValue) {
          setError(lockType === 'pattern' ? t('appLock.patternMismatch') : t('appLock.mismatch'));
          resetInputs();
          return;
        }
        await finishSetup(value, lockType);
        return;
      }

      setVerifying(true);
      try {
        const ok = await verifyPassword(value);
        if (ok) {
          onUnlock();
        } else {
          setError(t('appLock.wrongPassword'));
          resetInputs();
        }
      } finally {
        setVerifying(false);
      }
    },
    [lockType, isSetupMode, firstValue, finishSetup, onUnlock, t],
  );

  // PIN 输满 4 位自动提交；手势提交后也走同一流程
  useEffect(() => {
    if (lockType !== 'pin' || input.length !== 4 || verifying) return;
    void submitValue(input);
  }, [input, lockType, verifying, submitValue]);

  const handleInput = (num: string) => {
    if (input.length < 4) setInput(input + num);
    setError('');
  };

  const handleDelete = () => {
    setInput(input.slice(0, -1));
    setError('');
  };

  const handlePasswordSubmit = () => {
    if (!input) return;
    if (isSetupMode && !isMixedPassword(input)) {
      setError(t('appLock.passwordNeedMix'));
      return;
    }
    void submitValue(input);
  };

  const renderDots = () =>
    Array(4).fill(null).map((_, i) => (
      <div
        key={i}
        className="w-3.5 h-3.5 rounded-full transition-all"
        style={
          i < input.length
            ? { background: 'var(--primary)', transform: 'scale(1.1)' }
            : { background: 'transparent', border: '2px solid var(--line)' }
        }
      />
    ));

  const typeOptions: { type: LockType; icon: typeof Hash; title: string; desc: string }[] = [
    { type: 'pin', icon: Hash, title: t('appLock.typePin'), desc: t('appLock.typePinDesc') },
    { type: 'password', icon: KeyRound, title: t('appLock.typePassword'), desc: t('appLock.typePasswordDesc') },
    { type: 'pattern', icon: Grid3x3, title: t('appLock.typePattern'), desc: t('appLock.typePatternDesc') },
  ];

  const subtitle = (() => {
    if (!isSetupMode) {
      if (lockType === 'password') return t('appLock.passwordPlaceholder');
      if (lockType === 'pattern') return t('appLock.patternUnlockHint');
      return t('appLock.unlockSubtitle');
    }
    if (!lockType) return t('appLock.chooseTypeSubtitle');
    const second = !!firstValue;
    if (lockType === 'pin') return second ? t('appLock.setPinAgain') : t('appLock.setPinHint');
    if (lockType === 'password') return second ? t('appLock.setPasswordAgain') : t('appLock.setPasswordHint');
    return second ? t('appLock.drawPatternAgain') : t('appLock.drawPatternHint');
  })();

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6 overflow-y-auto py-8"
      style={{ background: 'var(--paper)' }}
    >
      <div className="w-full max-w-sm">
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute right-4 icon-btn"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
            aria-label={t('common.cancel')}
          >
            <X size={20} />
          </button>
        )}

        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--primary)', color: '#fff', boxShadow: 'var(--shadow-fab)' }}
          >
            {isSetupMode ? <Settings size={30} /> : <Lock size={30} />}
          </div>
          <h1 className="text-2xl font-bold truncate" style={{ color: 'var(--ink)' }}>
            {isSetupMode
              ? lockType
                ? t('appLock.setupTitle')
                : t('appLock.chooseTypeTitle')
              : t('appLock.unlockTitle')}
          </h1>
          <p className="text-sm mt-2 truncate" style={{ color: 'var(--ink-2)' }}>
            {subtitle}
          </p>
        </div>

        {/* 第一步：选择锁定方式 */}
        {isSetupMode && !lockType && (
          <div className="space-y-2.5">
            {typeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.type}
                  onClick={() => {
                    setLockType(option.type);
                    setError('');
                    resetInputs();
                  }}
                  className="card w-full flex items-center gap-3 p-3.5 active:scale-[0.99] transition-transform"
                >
                  <div
                    className="w-11 h-11 rounded-button flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
                  >
                    <Icon size={21} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{option.title}</p>
                    <p className="text-sm truncate" style={{ color: 'var(--ink-2)' }}>{option.desc}</p>
                  </div>
                  <ArrowRight size={18} className="flex-shrink-0" style={{ color: 'var(--ink-2)' }} />
                </button>
              );
            })}
          </div>
        )}

        {lockType && (
          <div className="card p-5">
            {error && (
              <div
                className="mb-4 p-3 rounded-button text-sm text-center"
                style={{ background: 'var(--expense-soft)', color: 'var(--expense)' }}
              >
                {error}
              </div>
            )}

            {/* 数字密码 */}
            {lockType === 'pin' && (
              <>
                <div className="flex justify-center items-center gap-3 mb-5 min-h-[1.5rem]">
                  {renderDots()}
                </div>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="mx-auto mb-3 text-sm flex items-center gap-1"
                  style={{ color: 'var(--ink-2)' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showPassword ? t('appLock.hidePassword') : t('appLock.showPassword')}
                </button>
                {showPassword && (
                  <div className="text-center mb-3 text-lg font-mono amount-num" style={{ color: 'var(--ink)' }}>
                    {input}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((num) => {
                    if (num === '') return <button key="empty" disabled className="h-14" />;
                    const isDelete = num === 'delete';
                    return (
                      <button
                        key={isDelete ? 'delete' : num}
                        onClick={() => (isDelete ? handleDelete() : handleInput(num))}
                        className="h-14 rounded-full text-xl font-semibold transition-all active:scale-95 flex items-center justify-center"
                        style={{ background: 'var(--paper-deep)', color: isDelete ? 'var(--ink-2)' : 'var(--ink)' }}
                      >
                        {isDelete ? <DeleteIcon /> : num}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* 混合密码 */}
            {lockType === 'password' && (
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handlePasswordSubmit();
                    }}
                    placeholder={t('appLock.passwordPlaceholder')}
                    autoFocus
                    className="w-full rounded-button px-4 py-3 pr-11 text-base outline-none"
                    style={{ background: 'var(--paper-deep)', color: 'var(--ink)' }}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    aria-label={t('appLock.showPassword')}
                  >
                    {showPassword ? <EyeOff size={16} style={{ color: 'var(--ink-2)' }} /> : <Eye size={16} style={{ color: 'var(--ink-2)' }} />}
                  </button>
                </div>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={!input}
                  className="w-full py-3 rounded-button font-semibold text-white active:scale-[0.99] transition-transform disabled:opacity-50"
                  style={{ background: 'var(--primary)' }}
                >
                  {isSetupMode ? (firstValue ? t('appLock.confirm') : t('appLock.next')) : t('appLock.unlock')}
                </button>
              </div>
            )}

            {/* 手势密码 */}
            {lockType === 'pattern' && (
              <PatternPad
                key={patternKey}
                onComplete={(sequence) => void submitValue(sequence)}
                onIncomplete={() => setError(t('appLock.patternTooShort'))}
              />
            )}
          </div>
        )}
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

/** 是否已开启应用锁（开关 + 已设置密码） */
export const isAppLockEnabled = () =>
  localStorage.getItem(LOCK_KEY) === 'true' && !!localStorage.getItem(PASSWORD_KEY);

/** App 启动时是否需要上锁 */
export const isAppLocked = isAppLockEnabled;

/** 关闭应用锁，同时清除密码与锁定方式 */
export const disableAppLock = () => {
  localStorage.removeItem(LOCK_KEY);
  localStorage.removeItem(PASSWORD_KEY);
  localStorage.removeItem(TYPE_KEY);
};
