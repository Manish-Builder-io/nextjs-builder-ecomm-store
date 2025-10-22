'use client';

import { useState } from 'react';

interface Entry {
  id: string;
  data?: {
    title?: string;
    url?: string;
    httpRequests?: Record<string, string>;
  };
}

interface ApiResponse {
  results: Entry[];
  total?: number;
}

export default function ApiDemoPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'info' | 'success' | 'error' | 'loading' } | null>(null);
  const [selectedModel, setSelectedModel] = useState('page');
  const [privateKey, setPrivateKey] = useState('bpk-private-key');
  const [updateType, setUpdateType] = useState('domain');
  const [newValue, setNewValue] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [previewUpdates, setPreviewUpdates] = useState<Array<{
    entry: Entry;
    originalValue: string;
    updatedValue: string;
    key: string;
  }>>([]);

  const API_KEY = 'YOUR API KEY';
  const BASE_URL = 'https://cdn.builder.io/api/v3/content';
  const WRITE_API_URL = 'https://builder.io/api/v1/write';

  const MODEL_OPTIONS = [
    { value: 'page', label: 'Page' },
    { value: 'symbol', label: 'Symbol' },
  ];

  const showStatus = (message: string, type: 'info' | 'success' | 'error' | 'loading') => {
    setStatus({ message, type });
  };

  const hideStatus = () => {
    setStatus(null);
  };

  const getPlaceholderText = (type: string) => {
    switch (type) {
      case 'domain': return 'newdomain.com';
      case 'apiVersion': return 'v1';
      case 'model': return 'new-model';
      case 'id': return 'new-id-123';
      case 'full': return 'https://newdomain.com/api/v1/content/model/id';
      default: return 'Enter new value';
    }
  };

  const getUpdateDescription = (type: string) => {
    switch (type) {
      case 'domain': return 'Will replace: cdn.builder.io → newdomain.com';
      case 'apiVersion': return 'Will replace: /api/v3/ → /api/v1/';
      case 'model': return 'Will replace: /content/images-data → /content/new-model';
      case 'id': return 'Will replace: /images-data/123 → /images-data/new-id-123';
      case 'full': return 'Will replace the entire URL with your new value';
      default: return 'Select an update type';
    }
  };

  const buildApiUrl = (offset = 0) => {
    const params = new URLSearchParams({
      apiKey: API_KEY,
      limit: '100',
      offset: offset.toString(),
      fetchTotalCount: 'true',
      'query.data.httpRequests.$exists': 'true',
      fields: 'id,data'
    });

    return `${BASE_URL}/${selectedModel}?${params.toString()}`;
  };

  const fetchData = async () => {
    setLoading(true);
    showStatus(`🔄 Fetching ${selectedModel} entries with httpRequests from Builder.io API...`, 'loading');

    try {
      const allEntries: Entry[] = [];
      let totalCount = 0;
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      // First request to get total count
      console.log('📊 Getting total count...');
      const firstUrl = buildApiUrl(0);
      console.log('First API URL:', firstUrl);
      
      const firstResponse = await fetch(firstUrl);
      const firstData: ApiResponse = await firstResponse.json();

      if (!firstData.results) {
        throw new Error('Invalid response format');
      }

      totalCount = firstData.total || 0;
      allEntries.push(...firstData.results);
      
      console.log(`📈 Total ${selectedModel} entries available: ${totalCount}`);
      console.log(`✅ Fetched ${allEntries.length}/${totalCount} entries (${Math.round((allEntries.length/totalCount)*100)}%)`);

      // If we got all entries in first request, we're done
      if (allEntries.length >= totalCount) {
        console.log('🎉 All entries fetched in first request!');
      } else {
        // Continue fetching remaining entries
        offset = limit;
        while (allEntries.length < totalCount && hasMore) {
          const remainingCount = totalCount - allEntries.length;
          const currentLimit = Math.min(limit, remainingCount);
          
          console.log(`📄 Fetching entries ${offset + 1}-${offset + currentLimit}...`);
          
          const url = buildApiUrl(offset);
          console.log('API URL:', url);
          
          const response = await fetch(url);
          const data: ApiResponse = await response.json();
          
          if (data.results && data.results.length > 0) {
            allEntries.push(...data.results);
            offset += currentLimit;
            
            const progress = Math.round((allEntries.length/totalCount)*100);
            console.log(`✅ Fetched ${allEntries.length}/${totalCount} entries (${progress}%)`);
            
            // Update status with progress
            showStatus(`🔄 Fetching ${selectedModel} entries... ${allEntries.length}/${totalCount} (${progress}%)`, 'loading');
          } else {
            console.log('⚠️ No more results returned, stopping...');
            hasMore = false;
          }
        }
      }

      setEntries(allEntries);
      setTotalCount(totalCount);
      showStatus(`✅ Successfully fetched ALL ${allEntries.length} ${selectedModel} entries with httpRequests`, 'success');

    } catch (error) {
      console.error('Error:', error);
      showStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setEntries([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setEntries([]);
    setTotalCount(0);
    hideStatus();
  };

  const exportResults = () => {
    if (entries.length === 0) {
      showStatus('❌ No data to export', 'error');
      return;
    }

    const dataStr = JSON.stringify(entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `builder-io-entries-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showStatus('📥 Data exported successfully!', 'success');
  };

  const updateHttpRequests = async (entry: Entry) => {
    if (!privateKey) {
      showStatus('❌ Please enter your private key first', 'error');
      return;
    }

    if (!newValue) {
      showStatus('❌ Please enter the new value', 'error');
      return;
    }

    setUpdating(true);
    showStatus(`🔄 Updating httpRequests for ${entry.id}...`, 'loading');

    try {
      // Create updated httpRequests object
      const updatedHttpRequests: Record<string, string> = {};
      if (entry.data?.httpRequests) {
        Object.entries(entry.data.httpRequests).forEach(([key, value]) => {
          let updatedValue = value;
          
          switch (updateType) {
            case 'domain':
              // Replace domain: https://cdn.builder.io -> https://newdomain.com
              updatedValue = value.replace(/https:\/\/[^\/]+/, `https://${newValue}`);
              break;
            case 'apiVersion':
              // Replace API version: /api/v3/ -> /api/v1/
              updatedValue = value.replace(/\/api\/v[0-9]+\//, `/api/${newValue}/`);
              break;
            case 'model':
              // Replace model: /content/images-data -> /content/new-model
              updatedValue = value.replace(/\/content\/[^\/]+/, `/content/${newValue}`);
              break;
            case 'id':
              // Replace ID: /content/images-data/ID -> /content/images-data/NEW_ID
              updatedValue = value.replace(/\/content\/[^\/]+\/[^?\/]+/, `/content/images-data/${newValue}`);
              break;
            case 'full':
              // Replace entire URL
              updatedValue = newValue;
              break;
          }
          
          updatedHttpRequests[key] = updatedValue;
        });
      }

      const updateData = {
        data: {
          httpRequests: updatedHttpRequests
        }
      };

      const response = await fetch(`${WRITE_API_URL}/${selectedModel}/${entry.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${privateKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        showStatus(`✅ Successfully updated httpRequests for ${entry.id}`, 'success');
        
        // Update the entry in local state
        setEntries(prevEntries => 
          prevEntries.map(e => 
            e.id === entry.id 
              ? { ...e, data: { ...e.data, httpRequests: updatedHttpRequests } }
              : e
          )
        );
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

    } catch (error) {
      console.error('Update error:', error);
      showStatus(`❌ Error updating ${entry.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const generatePreview = () => {
    if (!newValue) {
      showStatus('❌ Please enter the new value', 'error');
      return;
    }

    if (entries.length === 0) {
      showStatus('❌ No entries to preview', 'error');
      return;
    }

    const updates: Array<{
      entry: Entry;
      originalValue: string;
      updatedValue: string;
      key: string;
    }> = [];

    entries.forEach(entry => {
      if (entry.data?.httpRequests) {
        Object.entries(entry.data.httpRequests).forEach(([key, value]) => {
          let updatedValue = value;
          
          switch (updateType) {
            case 'domain':
              updatedValue = value.replace(/https:\/\/[^\/]+/, `https://${newValue}`);
              break;
            case 'apiVersion':
              updatedValue = value.replace(/\/api\/v[0-9]+\//, `/api/${newValue}/`);
              break;
            case 'model':
              updatedValue = value.replace(/\/content\/[^\/]+/, `/content/${newValue}`);
              break;
            case 'id':
              updatedValue = value.replace(/\/content\/[^\/]+\/[^?\/]+/, `/content/images-data/${newValue}`);
              break;
            case 'full':
              updatedValue = newValue;
              break;
          }

          if (updatedValue !== value) {
            updates.push({
              entry,
              originalValue: value,
              updatedValue,
              key
            });
          }
        });
      }
    });

    setPreviewUpdates(updates);
    setPreviewMode(true);
    showStatus(`📋 Generated preview for ${updates.length} updates across ${entries.length} entries`, 'success');
  };

  const applyUpdate = async (update: typeof previewUpdates[0]) => {
    if (!privateKey) {
      showStatus('❌ Please enter your private key first', 'error');
      return;
    }

    setUpdating(true);
    showStatus(`🔄 Updating ${update.entry.id}...`, 'loading');

    try {
      // Create updated httpRequests object for this entry
      const updatedHttpRequests: Record<string, string> = {};
      if (update.entry.data?.httpRequests) {
        Object.entries(update.entry.data.httpRequests).forEach(([key, value]) => {
          if (key === update.key) {
            updatedHttpRequests[key] = update.updatedValue;
          } else {
            updatedHttpRequests[key] = value;
          }
        });
      }

      const updateData = {
        data: {
          httpRequests: updatedHttpRequests
        }
      };

      const response = await fetch(`${WRITE_API_URL}/${selectedModel}/${update.entry.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${privateKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        showStatus(`✅ Successfully updated ${update.entry.id}`, 'success');
        
        // Update the entry in local state
        setEntries(prevEntries => 
          prevEntries.map(e => 
            e.id === update.entry.id 
              ? { ...e, data: { ...e.data, httpRequests: updatedHttpRequests } }
              : e
          )
        );

        // Remove this update from preview
        setPreviewUpdates(prev => prev.filter(u => !(u.entry.id === update.entry.id && u.key === update.key)));
        
        // If no more updates, exit preview mode
        if (previewUpdates.length === 1) {
          setPreviewMode(false);
          showStatus('✅ All updates completed!', 'success');
        }
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

    } catch (error) {
      console.error('Update error:', error);
      showStatus(`❌ Error updating ${update.entry.id}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const rejectUpdate = (update: typeof previewUpdates[0]) => {
    setPreviewUpdates(prev => prev.filter(u => !(u.entry.id === update.entry.id && u.key === update.key)));
    
    if (previewUpdates.length === 1) {
      setPreviewMode(false);
      showStatus('❌ All updates rejected', 'info');
    }
  };

  const updateAllHttpRequests = async () => {
    if (!privateKey) {
      showStatus('❌ Please enter your private key first', 'error');
      return;
    }

    if (!newValue) {
      showStatus('❌ Please enter the new value', 'error');
      return;
    }

    if (entries.length === 0) {
      showStatus('❌ No entries to update', 'error');
      return;
    }

    setUpdating(true);
    showStatus(`🔄 Updating httpRequests for all ${entries.length} entries...`, 'loading');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      try {
        // Create updated httpRequests object
        const updatedHttpRequests: Record<string, string> = {};
        if (entry.data?.httpRequests) {
          Object.entries(entry.data.httpRequests).forEach(([key, value]) => {
            let updatedValue = value;
            
            switch (updateType) {
              case 'domain':
                updatedValue = value.replace(/https:\/\/[^\/]+/, `https://${newValue}`);
                break;
              case 'apiVersion':
                updatedValue = value.replace(/\/api\/v[0-9]+\//, `/api/${newValue}/`);
                break;
              case 'model':
                updatedValue = value.replace(/\/content\/[^\/]+/, `/content/${newValue}`);
                break;
              case 'id':
                updatedValue = value.replace(/\/content\/[^\/]+\/[^?\/]+/, `/content/images-data/${newValue}`);
                break;
              case 'full':
                updatedValue = newValue;
                break;
            }
            
            updatedHttpRequests[key] = updatedValue;
          });
        }

        const updateData = {
          data: {
            httpRequests: updatedHttpRequests
          }
        };

        const response = await fetch(`${WRITE_API_URL}/${selectedModel}/${entry.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${privateKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          successCount++;
          
          // Update the entry in local state
          setEntries(prevEntries => 
            prevEntries.map(e => 
              e.id === entry.id 
                ? { ...e, data: { ...e.data, httpRequests: updatedHttpRequests } }
                : e
            )
          );
        } else {
          const errorText = await response.text();
          console.error(`Failed to update ${entry.id}:`, errorText);
          errorCount++;
        }

        // Update progress
        const progress = Math.round(((i + 1) / entries.length) * 100);
        showStatus(`🔄 Updating... ${i + 1}/${entries.length} (${progress}%) - Success: ${successCount}, Errors: ${errorCount}`, 'loading');

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error updating ${entry.id}:`, error);
        errorCount++;
      }
    }

    setUpdating(false);
    showStatus(`✅ Update complete! Success: ${successCount}, Errors: ${errorCount}`, 'success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-8 text-center">
          <h1 className="text-4xl font-bold mb-2">🚀 Builder.io Content API Demo</h1>
          <p className="text-lg opacity-90">Fetch entries with httpRequests data from different models</p>
        </div>

        <div className="p-8">
          {/* Controls */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="selectedModel" className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Model:
                </label>
                <select
                  id="selectedModel"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                >
                  {MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <div className="bg-blue-100 text-blue-800 px-4 py-3 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold">🔍 Filter: httpRequests exists</div>
                  <div className="text-xs opacity-75">Only entries with HTTP requests data</div>
                </div>
              </div>
            </div>

            {/* Update Controls */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">🔄 Update httpRequests URLs</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="privateKey" className="block text-sm font-semibold text-gray-700 mb-2">
                    Private Key:
                  </label>
                  <input
                    type="password"
                    id="privateKey"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="bpk-..."
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-yellow-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="updateType" className="block text-sm font-semibold text-gray-700 mb-2">
                    Update Type:
                  </label>
                  <select
                    id="updateType"
                    value={updateType}
                    onChange={(e) => setUpdateType(e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-yellow-500 focus:outline-none transition-colors"
                  >
                    <option value="domain">Domain Only</option>
                    <option value="apiVersion">API Version</option>
                    <option value="model">Model Type</option>
                    <option value="id">Content ID</option>
                    <option value="full">Full URL</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="newValue" className="block text-sm font-semibold text-gray-700 mb-2">
                    New Value:
                  </label>
                  <input
                    type="text"
                    id="newValue"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={getPlaceholderText(updateType)}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-yellow-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                <div className="text-sm text-yellow-800">
                  <strong>Example URL:</strong> <code className="bg-yellow-200 px-2 py-1 rounded">https://cdn.builder.io/api/v3/content/images-data/123?apiKey=...</code>
                </div>
                <div className="text-xs text-yellow-700 mt-2">
                  <strong>{getUpdateDescription(updateType)}</strong>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generatePreview}
                  disabled={updating || !newValue || entries.length === 0}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                >
                  👁️ Preview Changes
                </button>
                <button
                  onClick={updateAllHttpRequests}
                  disabled={updating || !privateKey || !newValue || entries.length === 0}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-yellow-700 hover:to-orange-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {updating ? '🔄 Updating...' : '🚀 Update All Entries'}
                </button>
                <div className="text-sm text-yellow-700 bg-yellow-100 px-3 py-2 rounded-lg">
                  ⚠️ "Update All" will update ALL fetched entries
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex-1 min-w-[140px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Fetching...
                  </span>
                ) : (
                  '📡 Fetch Data'
                )}
              </button>
              
              <button
                onClick={clearResults}
                className="flex-1 min-w-[140px] bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg"
              >
                🗑️ Clear Results
              </button>
              
              <button
                onClick={exportResults}
                disabled={entries.length === 0}
                className="flex-1 min-w-[140px] bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg"
              >
                📥 Export JSON
              </button>
            </div>
          </div>

          {/* Status */}
          {status && (
            <div className={`p-4 rounded-lg mb-6 border ${
              status.type === 'loading' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
              status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              status.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {status.message}
            </div>
          )}

          {/* Preview Mode */}
          {previewMode && previewUpdates.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-blue-800">📋 Preview Changes ({previewUpdates.length} updates)</h3>
                <button
                  onClick={() => {
                    setPreviewMode(false);
                    setPreviewUpdates([]);
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  ✕ Close Preview
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {previewUpdates.map((update, index) => (
                  <div key={`${update.entry.id}-${update.key}-${index}`} className="bg-white border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                            {update.entry.id}
                          </span>
                          <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-semibold">
                            {update.key}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => applyUpdate(update)}
                          disabled={updating || !privateKey}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ✅ Apply
                        </button>
                        <button
                          onClick={() => rejectUpdate(update)}
                          disabled={updating}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">ORIGINAL:</div>
                        <div className="bg-red-50 border border-red-200 rounded p-2 text-sm font-mono text-red-800 break-all">
                          {update.originalValue}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">UPDATED:</div>
                        <div className="bg-green-50 border border-green-200 rounded p-2 text-sm font-mono text-green-800 break-all">
                          {update.updatedValue}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {previewUpdates.length > 1 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-blue-700">
                      💡 Review each change individually or use "Update All" to apply all at once
                    </div>
                    <button
                      onClick={updateAllHttpRequests}
                      disabled={updating || !privateKey}
                      className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-yellow-700 hover:to-orange-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      🚀 Apply All ({previewUpdates.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {entries.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">📊 Results</h3>
              
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-xl text-center">
                  <div className="text-4xl font-bold mb-1">{entries.length}</div>
                  <div className="opacity-90">Entries Fetched</div>
                </div>
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-xl text-center">
                  <div className="text-4xl font-bold mb-1">{totalCount}</div>
                  <div className="opacity-90">Total Available</div>
                </div>
                <div className="bg-gradient-to-r from-pink-600 to-red-600 text-white p-6 rounded-xl text-center">
                  <div className="text-4xl font-bold mb-1">{Math.round((entries.length / totalCount) * 100)}%</div>
                  <div className="opacity-90">Coverage</div>
                </div>
              </div>

              {/* Entries */}
              <div className="space-y-4">
                {entries.map((entry, index) => (
                  <div key={entry.id} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        #{index + 1}
                      </span>
                      <span className="bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        ID: {entry.id}
                      </span>
                      <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {selectedModel.toUpperCase()}
                      </span>
                      {entry.data?.url && (
                        <a 
                          href={entry.data.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                        >
                          {entry.data.url}
                        </a>
                      )}
                    </div>
                    
                    {entry.data?.title && (
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">{entry.data.title}</h4>
                    )}
                    
                    {entry.data?.httpRequests && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            🌐 HTTP Requests
                          </h5>
                          <button
                            onClick={() => updateHttpRequests(entry)}
                            disabled={updating || !privateKey || !newValue}
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded text-xs font-semibold hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            {updating ? '⏳' : '🔄'} Update
                          </button>
                        </div>
                        <div className="space-y-3">
                          {Object.entries(entry.data.httpRequests).map(([key, value]) => (
                            <div key={key} className="bg-white p-3 rounded border-l-4 border-indigo-500">
                              <div className="font-semibold text-gray-800 mb-1">{key}</div>
                              <div className="text-sm text-gray-600 break-all">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
