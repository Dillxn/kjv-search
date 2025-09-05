'use client';

import { useState, useRef, useEffect } from 'react';
import { TabManager, TabState, TabManagerService } from './tab-manager';

interface TabBarProps {
  tabManager: TabManager;
  onTabManagerChange: (tabManager: TabManager) => void;
  isDarkMode: boolean;
  compactMode?: boolean;
}

export function TabBar({ tabManager, onTabManagerChange, isDarkMode, compactMode = false }: TabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTabId]);

  const handleTabClick = (tabId: string) => {
    if (editingTabId) return; // Don't switch tabs while editing
    onTabManagerChange(TabManagerService.switchTab(tabManager, tabId));
  };

  const handleAddTab = () => {
    onTabManagerChange(TabManagerService.addTab(tabManager));
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabManagerChange(TabManagerService.removeTab(tabManager, tabId));
  };

  const handleStartEdit = (e: React.MouseEvent, tab: TabState) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  };

  const handleFinishEdit = () => {
    if (editingTabId) {
      onTabManagerChange(TabManagerService.renameTab(tabManager, editingTabId, editingName));
    }
    setEditingTabId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEdit();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditingName('');
    }
  };

  const handleDuplicateTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabManagerChange(TabManagerService.duplicateTab(tabManager, tabId));
  };

  return (
    <div className={`flex items-center gap-1 px-2 border-b ${compactMode ? 'py-0.5' : 'py-1'} ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-thin">
        {tabManager.tabs.map((tab) => {
          const isActive = tab.id === tabManager.activeTabId;
          const isEditing = editingTabId === tab.id;

          return (
            <div
              key={tab.id}
              className={`group relative flex items-center gap-1 px-2 rounded-t-lg cursor-pointer transition-all duration-200 min-w-0 max-w-48 ${compactMode ? 'py-0.5' : 'py-1'} ${
                isActive
                  ? isDarkMode
                    ? 'bg-gray-700 text-white border-b-2 border-blue-400'
                    : 'bg-gray-100 text-gray-900 border-b-2 border-blue-500'
                  : isDarkMode
                    ? 'bg-gray-900 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => handleTabClick(tab.id)}
            >
              {isEditing ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleFinishEdit}
                  onKeyDown={handleKeyDown}
                  className={`bg-transparent border-none outline-none text-xs font-medium w-full min-w-0 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                  maxLength={20}
                />
              ) : (
                <span
                  className="text-xs font-medium truncate flex-1 min-w-0"
                  onDoubleClick={(e) => handleStartEdit(e, tab)}
                  title={tab.name}
                >
                  {tab.name}
                </span>
              )}

              {!isEditing && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleDuplicateTab(e, tab.id)}
                    className={`p-0.5 rounded hover:bg-opacity-20 ${
                      isDarkMode ? 'hover:bg-white' : 'hover:bg-black'
                    }`}
                    title="Duplicate tab"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 7h6v6H7V7zM5 5v10h10V5H5zM3 3h14v14H3V3z" />
                    </svg>
                  </button>
                  
                  {tabManager.tabs.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      className={`p-0.5 rounded hover:bg-red-500 hover:text-white transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                      title="Close tab"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tabManager.tabs.length < 10 && (
        <button
          onClick={handleAddTab}
          className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
            isDarkMode
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Add new tab"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}