import { Home, PlusCircle, Grid3X3, BarChart3, Wallet } from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const BottomNav = ({ currentPage, onPageChange }: BottomNavProps) => {
  const navItems = [
    { id: '/', icon: Home, label: '首页' },
    { id: '/record', icon: PlusCircle, label: '记账' },
    { id: '/categories', icon: Grid3X3, label: '分类' },
    { id: '/accounts', icon: Wallet, label: '资产' },
    { id: '/statistics', icon: BarChart3, label: '统计' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-50">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-emerald-500'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon
                size={24}
                className={`transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`}
              />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
