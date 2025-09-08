'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Tab } from '../components/ui/tab';
import { TabState } from '../hooks/use-tab-reducer';

interface TabBarProps {
  tabs: TabState[];
  activeTabId: string;
  isDarkMode: boolean;
  onSwitchTab: (tabId: string) => void;
  onAddTab: () => void;
  onRemoveTab: (tabId: string) => void;
  onRenameTab: (tabId: string, name: string) => void;
  onDuplicateTab: (tabId: string) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  isDarkMode,
  onSwitchTab,
  onAddTab,
  onRemoveTab,
  onRenameTab,
  onDuplicateTab,
}: TabBarProps) {
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
    onSwitchTab(tabId);
  };

  const handleAddTab = () => {
    onAddTab();
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onRemoveTab(tabId);
  };

  const handleStartEdit = (e: React.MouseEvent, tab: TabState) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  };

  const handleFinishEdit = () => {
    if (editingTabId) {
      onRenameTab(editingTabId, editingName);
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
    onDuplicateTab(tabId);
  };

  return (
    <div className={`flex items-center`}>
      <div className='flex items-center gap-2 overflow-x-auto scrollbar-thin'>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = editingTabId === tab.id;

          return (
            <Tab
              key={tab.id}
              isActive={isActive}
              isDarkMode={isDarkMode}
              onClick={() => handleTabClick(tab.id)}
              variant="complex"
            >
              {isEditing ? (
                <input
                  ref={editInputRef}
                  type='text'
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
                  className='text-xs font-medium truncate flex-1 min-w-0'
                  onDoubleClick={(e) => handleStartEdit(e, tab)}
                  title={tab.name}
                >
                  {tab.name}
                </span>
              )}

              {!isEditing && (
                <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <button
                    onClick={(e) => handleDuplicateTab(e, tab.id)}
                    className={`p-0.5 rounded ${
                      isDarkMode ? 'hover:bg-white/20' : 'hover:bg-black/20'
                    }`}
                    title='Duplicate tab'
                  >
                    <svg
                      className='w-3 h-3'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path d='M7 7h6v6H7V7zM5 5v10h10V5H5zM3 3h14v14H3V3z' />
                    </svg>
                  </button>

                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      className={`p-0.5 rounded hover:bg-red-500 hover:text-white transition-colors ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                      title='Close tab'
                    >
                      <svg
                        className='w-3 h-3'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </Tab>
          );
        })}
        
        {tabs.length < 10 && (
          <button
            onClick={handleAddTab}
            className={`flex items-center justify-center w-6 h-6 ml-1 rounded transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title='Add new tab'
          >
            <Plus className='w-3 h-3' />
          </button>
        )}
      </div>
    </div>
  );
}
