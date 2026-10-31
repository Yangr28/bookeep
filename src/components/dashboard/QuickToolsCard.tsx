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
  layout?: '1x4' | '2x2';
}

/** 快捷工具：支持 1×4（默认）或 2×2 布局 */
export const QuickToolsCard = ({ tools, layout = '1x4' }: QuickToolsCardProps) => {
  const { t } = useTranslation();
  const cols = layout === '2x2' ? 'grid-cols-2' : 'grid-cols-4';

  return (
    <div className="px-4 mt-3">
      <div className={`card p-2 grid ${cols} gap-1`}>
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
