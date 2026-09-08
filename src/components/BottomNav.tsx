import { Home, ReceiptText, Wallet, User } from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navItems = [
  { id: '/', icon: Home, label: '首页' },
  { id: '/records', icon: ReceiptText, label: '账单' },
  { id: '/accounts', icon: Wallet, label: '资产' },
  { id: '/profile', icon: User, label: '我的' },
];

export const BottomNav = ({ currentPage, onPageChange }: BottomNavProps) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'var(--card)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-stretch px-2">
        {navItems.map((item) => (
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
      className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
      style={{ color: active ? 'var(--primary)' : 'var(--ink-2)' }}
    >
      <Icon size={22} strokeWidth={active ? 2.3 : 1.9} />
      <span className={`text-label ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
    </button>
  );
}
