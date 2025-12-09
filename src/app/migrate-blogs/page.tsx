'use client';

import { useState, useRef } from 'react';

interface ContentData {
  name: string;
  published: string;
  data: {
    title: string;
    slug: string;
    blocks: unknown[];
    [key: string]: unknown;
  };
  meta?: Record<string, unknown>;
  createdDate?: number;
}

interface MigrationResult {
  success: boolean;
  entryId?: string;
  message: string;
  error?: string;
  timestamp: string;
}

export default function MigrateBlogsPage() {
  const [jsonContent, setJsonContent] = useState<string>('');
  const [parsedContent, setParsedContent] = useState<ContentData | null>(null);
  const [modelName, setModelName] = useState('resource-guide-model');
  const [publishedStatus, setPublishedStatus] = useState<'draft' | 'published'>('draft');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load example JSON file
  const loadExampleJson = async () => {
    try {
      const response = await fetch('/how-does-online-couples-therapy-work.json');
      if (!response.ok) {
        throw new Error('Failed to load example JSON');
      }
      const data = await response.json();
      setJsonContent(JSON.stringify(data, null, 2));
      setParsedContent(data as ContentData);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load example JSON');
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        setJsonContent(content);
        setParsedContent(parsed as ContentData);
        setError(null);
      } catch {
        setError('Invalid JSON file. Please check the file format.');
        setJsonContent('');
        setParsedContent(null);
      }
    };
    reader.readAsText(file);
  };

  // Parse JSON from textarea
  const handleJsonChange = (value: string) => {
    setJsonContent(value);
      try {
        if (value.trim()) {
          const parsed = JSON.parse(value);
          setParsedContent(parsed as ContentData);
          setError(null);
        } else {
          setParsedContent(null);
        }
      } catch {
        setParsedContent(null);
        // Don't set error on every keystroke, only on blur/submit
      }
  };

  // Validate JSON before migration
  const validateJson = (): boolean => {
    if (!jsonContent.trim()) {
      setError('Please provide JSON content');
      return false;
    }

    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.name) {
        setError('JSON must have a "name" field');
        return false;
      }
      if (!parsed.data) {
        setError('JSON must have a "data" field');
        return false;
      }
      if (!parsed.data.title) {
        setError('JSON data must have a "title" field');
        return false;
      }
      if (!parsed.data.blocks || !Array.isArray(parsed.data.blocks)) {
        setError('JSON data must have a "blocks" array');
        return false;
      }
      setError(null);
      return true;
    } catch (err) {
      setError('Invalid JSON format: ' + (err instanceof Error ? err.message : 'Unknown error'));
      return false;
    }
  };

  // Migrate single content
  const migrateContent = async () => {
    if (!validateJson()) {
      return;
    }

    setIsMigrating(true);
    setError(null);

    try {
      const content = JSON.parse(jsonContent) as ContentData;
      
      const payload = {
        model: modelName,
        name: content.name,
        published: publishedStatus,
        data: content.data,
        meta: content.meta || {},
        ...(content.createdDate && { createdDate: content.createdDate }),
      };

      const response = await fetch('/api/content/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      const migrationResult: MigrationResult = {
        success: result.success || false,
        entryId: result.entryId,
        message: result.message || result.error || 'Migration completed',
        error: result.error,
        timestamp: new Date().toISOString(),
      };

      setMigrationResults((prev) => [migrationResult, ...prev]);

      if (!result.success) {
        setError(result.error || 'Failed to migrate content');
      }
    } catch (err) {
      const migrationResult: MigrationResult = {
        success: false,
        message: 'Migration failed',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
      setMigrationResults((prev) => [migrationResult, ...prev]);
      setError(err instanceof Error ? err.message : 'Failed to migrate content');
    } finally {
      setIsMigrating(false);
    }
  };

  // Clear all data
  const handleClear = () => {
    setJsonContent('');
    setParsedContent(null);
    setError(null);
    setMigrationResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Blog Migration Tool
          </h1>
          <p className="text-gray-600">
            Migrate blog articles to Builder.io using the Write API
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Configuration */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="resource-guide-model"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Published Status
                  </label>
                  <select
                    value={publishedStatus}
                    onChange={(e) => setPublishedStatus(e.target.value as 'draft' | 'published')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Upload JSON</h2>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Upload JSON File
                  </button>
                  <button
                    onClick={loadExampleJson}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Load Example
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {parsedContent && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      <strong>✓ Loaded:</strong> {parsedContent.name || parsedContent.data?.title}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {parsedContent.data?.blocks?.length || 0} blocks found
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* JSON Editor */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">JSON Content</h2>
                <button
                  onClick={handleClear}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear
                </button>
              </div>
              
              <textarea
                value={jsonContent}
                onChange={(e) => handleJsonChange(e.target.value)}
                onBlur={validateJson}
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Paste JSON content here or upload a file..."
              />
              
              {error && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>

            {/* Migrate Button */}
            <button
              onClick={migrateContent}
              disabled={isMigrating || !parsedContent}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isMigrating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Migrating...
                </span>
              ) : (
                'Migrate to Builder.io'
              )}
            </button>
          </div>

          {/* Right Column - Preview & Results */}
          <div className="space-y-6">
            {/* Content Preview */}
            {parsedContent && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Content Preview</h2>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Name:</span>
                    <p className="text-gray-900">{parsedContent.name || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Title:</span>
                    <p className="text-gray-900">{parsedContent.data?.title || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Slug:</span>
                    <p className="text-gray-900 font-mono text-sm">{parsedContent.data?.slug || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Blocks:</span>
                    <p className="text-gray-900">{parsedContent.data?.blocks?.length || 0} blocks</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Published:</span>
                    <p className="text-gray-900">{parsedContent.published || 'draft'}</p>
                  </div>

                  {parsedContent.data?.blocks && parsedContent.data.blocks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <span className="text-sm font-medium text-gray-500">Block Types:</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Array.from(
                          new Set(
                            (parsedContent.data.blocks as Array<Record<string, unknown>>)
                              .map((block) => 
                                (block?.component as Record<string, unknown>)?.name as string
                              )
                              .filter(Boolean)
                          )
                        ).map((blockType: string) => (
                          <span
                            key={blockType}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {blockType}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Migration Results */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Migration Results</h2>
                {migrationResults.length > 0 && (
                  <button
                    onClick={() => setMigrationResults([])}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {migrationResults.length === 0 ? (
                <p className="text-gray-500 text-sm">No migrations yet. Upload JSON and click migrate to start.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {migrationResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-md border ${
                        result.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {result.success ? (
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                            <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                              {result.message}
                            </p>
                          </div>
                          
                          {result.entryId && (
                            <p className="text-xs text-gray-600 mt-1">
                              Entry ID: <span className="font-mono">{result.entryId}</span>
                            </p>
                          )}
                          
                          {result.error && (
                            <p className="text-xs text-red-600 mt-1">{result.error}</p>
                          )}
                          
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(result.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

