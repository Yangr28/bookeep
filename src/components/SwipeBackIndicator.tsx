export const SwipeBackIndicator = () => {
  return (
    <div className="fixed right-2 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
      {/* 用 ink 变量 + 透明度：浅色模式为浅灰、深色模式自动变柔白，双向适配 */}
      <div className="w-1.5 h-12 rounded-full" style={{ background: 'var(--ink)', opacity: 0.18 }} />
    </div>
  );
};