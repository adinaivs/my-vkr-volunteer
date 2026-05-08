'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import AiSupportButton from '@/app/components/AiSupportButton';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import CustomDatePicker from '@/app/components/CustomDatePicker';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface ReportHistory {
  id: string;
  name: string;
  period: string;
  createdAt: string;
  format: 'pdf' | 'excel';
}

export default function OrganizerReports() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportHistory] = useState<ReportHistory[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (data.user.role !== 'organizer') {
          router.push('/dashboard');
          return;
        }
        setUser(data.user);
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleGenerateReport = async (format: 'pdf' | 'excel') => {
    if (!startDate || !endDate) {
      toast.error('Пожалуйста, выберите период для отчёта');
      return;
    }

    setGenerating(true);
    
    // TODO: Implement actual report generation
    setTimeout(() => {
      setGenerating(false);
      toast.success(`Отчёт в формате ${format.toUpperCase()} будет готов через несколько секунд`);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        <OrganizerSidebar user={user} />
        <OrganizerNav user={user} />

        {/* Main Content */}
        <DynamicContent maxWidth="max-w-5xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Отчёты</h1>
          <p className="text-gray-600">Создавайте и скачивайте отчёты по вашим проектам</p>
        </div>

        {/* Report Generator */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Создать новый отчёт</h2>

          <div className="space-y-6">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Тип отчёта
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setReportType('all')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    reportType === 'all'
                      ? 'bg-[#00CC00] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Все проекты
                </button>
                <button
                  onClick={() => setReportType('active')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    reportType === 'active'
                      ? 'bg-[#00CC00] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Активные проекты
                </button>
                <button
                  onClick={() => setReportType('completed')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    reportType === 'completed'
                      ? 'bg-[#00CC00] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Завершённые проекты
                </button>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Период отчёта
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Дата начала</label>
                  <CustomDatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Выберите дату начала"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Дата окончания</label>
                  <CustomDatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Выберите дату окончания"
                    minDate={startDate}
                  />
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Формат отчёта
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleGenerateReport('pdf')}
                  disabled={generating}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">Скачать PDF</div>
                    <div className="text-sm text-gray-600">Для печати и просмотра</div>
                  </div>
                </button>

                <button
                  onClick={() => handleGenerateReport('excel')}
                  disabled={generating}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">Скачать Excel</div>
                    <div className="text-sm text-gray-600">Для анализа данных</div>
                  </div>
                </button>
              </div>
            </div>

            {generating && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-sm text-blue-800">Генерация отчёта...</p>
              </div>
            )}
          </div>
        </div>

        {/* Report History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">История отчётов</h2>

          {reportHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">История отчётов пуста</h3>
              <p className="text-gray-600">Созданные отчёты будут отображаться здесь</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportHistory.map((report) => (
                <div 
                  key={report.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      report.format === 'pdf' ? 'bg-red-100' : 'bg-green-100'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        report.format === 'pdf' ? 'text-red-600' : 'text-green-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{report.name}</div>
                      <div className="text-sm text-gray-600">
                        {report.period} • {report.createdAt}
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 text-sm font-medium text-[#00CC00] hover:bg-[#00CC00]/10 rounded-lg transition-colors">
                    Скачать
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DynamicContent>

      {/* AI Support Button */}
      <AiSupportButton />
    </div>
    </SidebarProvider>
  );
}
