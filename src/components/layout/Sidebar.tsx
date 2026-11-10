import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import type { MenuNode } from '@/types/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Icon KEYS are stored in the DB (Page.icon); the SVG paths they resolve to
// live only here on the client, so the backend never has to know about SVGs.
const ICONS: Record<string, string> = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  factory: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  beaker: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  clipboard: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  database: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s4.332.477 5.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  doc: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  users: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 4v-2a4 4 0 00-3-3.87M9 12a4 4 0 100-8 4 4 0 000 8z',
  key: 'M15.232 5.232l3.536 3.536M9 11l-6 6v4h4l6-6m-3-3l3-3a3.5 3.5 0 114 4l-3 3',
  menu: 'M4 6h16M4 12h16M4 18h16',
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
};
const DEFAULT_ICON = ICONS.menu;

const Ic: React.FC<{ iconKey?: string | null; className?: string }> = ({ iconKey, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={(iconKey && ICONS[iconKey]) || DEFAULT_ICON} />
  </svg>
);

const Chevron: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    className={`w-4 h-4 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

interface NavNodeProps {
  node: MenuNode;
  activePath: string;
  onNavigate: (key: string) => void;
}

/** Renders one sidebar entry. If it has children it's an expandable submenu group. */
const NavNode: React.FC<NavNodeProps> = ({ node, activePath, onNavigate }) => {
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState<boolean>(
    hasChildren && node.children.some((c) => c.key === activePath),
  );

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <span className="flex items-center gap-3">
            <Ic iconKey={node.icon} />
            <span>{node.label}</span>
          </span>
          <Chevron expanded={expanded} />
        </button>
        {expanded && (
          <div className="ml-4 mt-1 space-y-1 border-l border-gray-100 pl-3">
            {node.children.map((child) => (
              <NavNode key={child.id} node={child} activePath={activePath} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = activePath === node.key;
  return (
    <button
      onClick={() => onNavigate(node.key)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
        ${isActive
          ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
      <Ic iconKey={node.icon} />
      <span>{node.label}</span>
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();

  // Menu is entirely DB-driven — see UserInfo.menu from /api/auth/login and
  // /api/auth/me, built server-side from the Page table filtered to what
  // this user's role (or super-admin override) may access.
  const menu = user?.menu ?? [];

  const handleNavigate = (key: string) => {
    navigate(key);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 z-30
          transition-transform duration-300 lg:translate-x-0 flex flex-col overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <nav className="p-4 space-y-1 flex-1">
          {menu.map((node) => (
            <NavNode key={node.id} node={node} activePath={location.pathname} onNavigate={handleNavigate} />
          ))}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-gray-100">
          {user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role_label}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>

          <div className="mt-3 rounded-lg bg-primary-50 p-3">
            <p className="text-xs font-medium text-primary-800">
              {user?.is_super_admin ? 'Super Admin Access' : 'AI Decision Platform'}
            </p>
            <p className="text-xs text-primary-600 mt-1">Menu managed from Administration</p>
          </div>
        </div>
      </aside>
    </>
  );
};
