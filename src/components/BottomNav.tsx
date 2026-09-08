import { Home, ReceiptText, Wallet, User, Plus } from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  /** 中央「记一笔」按钮 */
  onRecord: () => void;
}

const navItems = [
  { id: '/', icon: Home, label: '首页' },
  { id: '/records', icon: ReceiptText, label: '账单' },
  { id: '/accounts', icon: Wallet, label: '资产' },
  { id: '/profile', icon: User, label: '我的' },
];

export const BottomNav = ({ currentPage, onPageChange, onRecord }: BottomNavProps) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'var(--card)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="relative flex items-stretch px-2">
        {/* 左两项 */}
        {navItems.slice(0, 2).map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={currentPage === item.id}
            onClick={() => onPageChange(item.id)}
          />
        ))}

        {/* 中央凸起记账按钮 */}
        <div className="w-[72px] flex-shrink-0 flex justify-center">
          <button
            onClick={onRecord}
            aria-label="记一笔"
            className="w-14 h-14 rounded-full flex items-center justify-center text-white -mt-6 active:scale-95 transition-transform"
            style={{
              background: 'var(--primary)',
              boxShadow: 'var(--shadow-fab)',
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
  active,
  onClick,
}: {
  item: { id: string; icon: typeof Home; label: string };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
      style={{ color: active ? 'var(--primary)' : 'var(--ink-2)' }}
    >
      <Icon size={22} strokeWidth={active ? 2.3 : 1.9} />
      <span className={`text-label ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
    </button>
  );
}
