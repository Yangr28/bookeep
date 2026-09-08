export const VersionInfo = () => {
  const version = import.meta.env.APP_VERSION || '2.0.0';

  return (
    <div className="text-center py-4">
      <p className="text-xs" style={{ color: 'var(--ink-2)' }}>版本号: v{version}</p>
    </div>
  );
};
