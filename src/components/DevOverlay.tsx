'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface LocalStorageItem {
  key: string;
  value: string;
  size: number;
}

export default function DevOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [localStorageData, setLocalStorageData] = useState<LocalStorageItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const refreshLocalStorage = () => {
    const data: LocalStorageItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        data.push({
          key,
          value,
          size: new Blob([value]).size
        });
      }
    }
    setLocalStorageData(data);
  };

  useEffect(() => {
    refreshLocalStorage();
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const clearAllLocalStorage = () => {
    if (confirm('Are you sure you want to clear ALL localStorage data?')) {
      localStorage.clear();
      refreshLocalStorage();
      setSelectedKey(null);
    }
  };

  const clearSelectedKey = () => {
    if (selectedKey && confirm(`Are you sure you want to clear "${selectedKey}"?`)) {
      localStorage.removeItem(selectedKey);
      refreshLocalStorage();
      setSelectedKey(null);
    }
  };

  const clearSessionData = () => {
    if (confirm('Are you sure you want to clear session data?')) {
      localStorage.removeItem('serendipity_session');
      refreshLocalStorage();
      setSelectedKey(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatValue = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  const selectedItem = localStorageData.find(item => item.key === selectedKey);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition-colors"
        title="Dev Tools - localStorage"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <path d="M9 9h6v6H9z"/>
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-3/4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Development Tools - localStorage</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Controls */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex gap-2 flex-wrap">
                <Button onClick={refreshLocalStorage} variant="outline" size="sm">
                  Refresh
                </Button>
                <Button onClick={clearSessionData} variant="outline" size="sm">
                  Clear Session
                </Button>
                <Button onClick={clearSelectedKey} variant="outline" size="sm" disabled={!selectedKey}>
                  Clear Selected
                </Button>
                <Button onClick={clearAllLocalStorage} variant="destructive" size="sm">
                  Clear All
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Keys List */}
              <div className="w-1/3 border-r overflow-y-auto">
                <div className="p-2">
                  <h3 className="font-medium mb-2">Keys ({localStorageData.length})</h3>
                  {localStorageData.map((item) => (
                    <div
                      key={item.key}
                      onClick={() => setSelectedKey(item.key)}
                      className={`p-2 cursor-pointer rounded text-sm border mb-1 ${
                        selectedKey === item.key
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-mono text-xs truncate">{item.key}</div>
                      <div className="text-xs text-gray-500">{formatBytes(item.size)}</div>
                    </div>
                  ))}
                  {localStorageData.length === 0 && (
                    <div className="text-gray-500 text-sm">No localStorage data</div>
                  )}
                </div>
              </div>

              {/* Value Display */}
              <div className="flex-1 flex flex-col">
                {selectedItem ? (
                  <>
                    <div className="p-2 border-b bg-gray-50">
                      <div className="font-mono text-sm font-medium">{selectedItem.key}</div>
                      <div className="text-xs text-gray-500">{formatBytes(selectedItem.size)}</div>
                    </div>
                    <div className="flex-1 p-2 overflow-auto">
                      <pre className="text-xs bg-gray-100 p-2 rounded whitespace-pre-wrap">
                        {formatValue(selectedItem.value)}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    Select a key to view its value
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

