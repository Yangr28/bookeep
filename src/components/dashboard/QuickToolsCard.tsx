import { useTranslation } from 'react-i18next';
import { LucideIcon } from 'lucide-react';

interface QuickTool {
  icon: LucideIcon;
  labelKey: string;
  onClick: () => void;
  color: string;
  bg: string;
}

interface QuickToolsCardProps {
  tools: QuickTool[];
}

/** 快捷工具四宫格：转账 / 周期记账 / 模板 / 预算 */
export const QuickToolsCard = ({ tools }: QuickToolsCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="px-4 mt-3">
      <div className="card p-2 grid grid-cols-4 gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.labelKey}
              onClick={tool.onClick}
              className="flex flex-col items-center gap-1 py-1.5 rounded-button transition-colors active:scale-95 min-w-0"
            >
              <div className="w-9 h-9 rounded-button flex items-center justify-center" style={{ background: tool.bg }}>
                <Icon size={18} style={{ color: tool.color }} />
              </div>
              <span className="text-xs font-medium w-full text-center truncate" style={{ color: 'var(--ink)' }}>{t(tool.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
