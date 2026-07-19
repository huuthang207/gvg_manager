import type { Tab } from './activeTabStorage.ts';

export function AppHeader({ activeTab }: { activeTab: Tab }) {
  return (
    <header className="h-14 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/45 px-6 backdrop-blur-md z-10 shrink-0">
      <h1 className="text-lg font-bold text-white">{activeTab === 'dashboard' ? 'Quản Lý Thành Viên' : activeTab === 'gvg-lineup' ? 'Đội Hình Bang Chiến' : 'Điểm Danh Bang Chiến'}</h1>
    </header>
  );
}
