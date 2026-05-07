import { useState } from 'react';

export default function Layout({ sidebar, filtros, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-layout">
      <button
        className={`sidebar-toggle ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '\u25C0' : '\u25B6'}
      </button>
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <h2>Rua Sem Saida</h2>
        {sidebar}
      </aside>
      <main className="main-area">
        {filtros}
        <div className="main-content">
          {children}
        </div>
      </main>
    </div>
  );
}
