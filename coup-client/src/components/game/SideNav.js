import React from 'react';

const NAV_TABS = [
  { id: 'command',  label: 'COMMAND', icon: 'security' },
  { id: 'dossier',  label: 'DOSSIER', icon: 'account_box' },
  { id: 'logs',     label: 'LOGS',    icon: 'history' },
  { id: 'intel',    label: 'INTEL',   icon: 'menu_book' },
];

export default function SideNav({ name, activeTab, onTabChange }) {
  return (
    <aside className="fixed top-16 left-0 bottom-0 flex flex-col z-10 w-64 [@media(max-height:500px)]:w-14 bg-[#1a1208] border-r border-[#59413e]/15 shadow-[10px_0_30px_rgba(154,26,26,0.1)] transition-all duration-150">
      {/* Operator identity — hidden at short screens */}
      <div className="p-6 border-b border-outline-variant/10 [@media(max-height:500px)]:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-surface-container-highest border border-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-xl">security</span>
          </div>
          <div className="min-w-0">
            <p className="font-label text-xs tracking-widest text-primary truncate">{name}</p>
            <p className="font-label text-[10px] text-outline opacity-70">STATUS: ACTIVE</p>
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <nav className="flex-grow py-4 [@media(max-height:500px)]:py-1">
        {NAV_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-4 [@media(max-height:500px)]:justify-center p-4 [@media(max-height:500px)]:p-2 text-left transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-[#3d3327] text-[#f5edd8] border-l-4 border-[#9a1a1a]'
                : 'text-[#a88a86] opacity-50 hover:bg-[#231a0f] hover:opacity-100 border-l-4 border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-xl shrink-0">{tab.icon}</span>
            <span className="font-mono text-xs tracking-widest [@media(max-height:500px)]:hidden">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Terminate */}
      <div className="p-4 [@media(max-height:500px)]:p-1 border-t border-outline-variant/10">
        <button className="w-full flex items-center gap-4 [@media(max-height:500px)]:justify-center text-[#9a1a1a] p-4 [@media(max-height:500px)]:p-2 font-mono text-xs tracking-widest hover:bg-error-container/20 transition-all">
          <span className="material-symbols-outlined shrink-0">power_settings_new</span>
          <span className="[@media(max-height:500px)]:hidden">TERMINATE</span>
        </button>
      </div>
    </aside>
  );
}
