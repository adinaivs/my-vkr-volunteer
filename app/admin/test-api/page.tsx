'use client';

import { useState } from 'react';

export default function TestAPIPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async (endpoint: string) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      setResult({
        status: response.status,
        ok: response.ok,
        data,
      });
      console.log('API Response:', { status: response.status, data });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : String(error),
      });
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Test Page</h1>

        <div className="space-y-4 mb-8">
          <button
            onClick={() => testAPI('/api/auth/me')}
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Test /api/auth/me
          </button>

          <button
            onClick={() => testAPI('/api/admin/organizers?status=all')}
            disabled={loading}
            className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            Test /api/admin/organizers?status=all
          </button>

          <button
            onClick={() => testAPI('/api/admin/organizers?status=pending')}
            disabled={loading}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            Test /api/admin/organizers?status=pending
          </button>

          <button
            onClick={() => testAPI('/api/admin/organizers?status=approved')}
            disabled={loading}
            className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
          >
            Test /api/admin/organizers?status=approved
          </button>

          <button
            onClick={() => testAPI('/api/admin/statistics')}
            disabled={loading}
            className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
          >
            Test /api/admin/statistics
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        )}

        {result && !loading && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Result:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
