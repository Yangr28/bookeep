import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Home, ReceiptText, Wallet, User, Plus } from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  /** 中央「记一笔」按钮（单击） */
  onRecord: () => void;
  /** 中央按钮长按：以「保存并继续」模式进入记账页 */
  onRecordLongPress?: () => void;
}

/** 长按触发时长（ms） */
const LONG_PRESS_MS = 450;

const navItems = [
  { id: '/', icon: Home, labelKey: 'nav.home' },
  { id: '/records', icon: ReceiptText, labelKey: 'nav.records' },
  { id: '/accounts', icon: Wallet, labelKey: 'nav.accounts' },
  { id: '/profile', icon: User, labelKey: 'nav.profile' },
];

export const BottomNav = ({ currentPage, onPageChange, onRecord, onRecordLongPress }: BottomNavProps) => {
  const { t } = useTranslation();
  const pressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  const clearPressTimer = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handlePointerDown = () => {
    if (!onRecordLongPress) return;
    longPressFiredRef.current = false;
    pressTimerRef.current = window.setTimeout(() => {
      pressTimerRef.current = null;
      longPressFiredRef.current = true;
      onRecordLongPress();
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => clearPressTimer();

  const handleClick = () => {
    // 长按已触发过则吞掉随后的 click，避免重复进入
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    onRecord();
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'var(--glass-strong)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        borderTop: '1px solid var(--glass-border)',
        boxShadow: '0 -6px 24px rgba(15, 17, 24, 0.10)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="relative flex items-stretch px-2">
        {/* 左两项 */}
        {navItems.slice(0, 2).map((item) => (
          <NavButton
            key={item.id}
            item={item}
            label={t(item.labelKey)}
            active={currentPage === item.id}
            onClick={() => onPageChange(item.id)}
          />
        ))}

        {/* 中央凸起记账按钮：单击记一笔，长按连续记账 */}
        <div className="w-[72px] flex-shrink-0 flex justify-center">
          <button
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={t('nav.record')}
            className="w-14 h-14 rounded-full flex items-center justify-center text-white -mt-6 active:scale-95 transition-transform select-none"
            style={{
              background: 'var(--primary)',
              backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 52%)',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: 'var(--shadow-fab), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            <Plus size={28} strokeWidth={2.4} />
          </button>
        </div>

        {/* 右两项 */}
        {navItems.slice(2).map((item) => (
          <NavButton
            key={item.id}
            item={item}
            label={t(item.labelKey)}
            active={currentPage === item.id}
            onClick={() => onPageChange(item.id)}
          />
        ))}
      </div>
    </nav>
  );
};

function NavButton({
  item,
  label,
  active,
  onClick,
}: {
  item: { id: string; icon: typeof Home; labelKey: string };
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors"
      style={{ color: active ? 'var(--primary)' : 'var(--ink-2)' }}
    >
      <Icon size={22} strokeWidth={active ? 2.3 : 1.9} />
      <span className={`text-label truncate max-w-full px-0.5 ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  );
}
