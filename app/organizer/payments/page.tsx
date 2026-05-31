'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OrganizerNav from '../components/OrganizerNav';
import OrganizerSidebar from '../components/OrganizerSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';

interface User { id: string; firstName: string; lastName: string; avatarUrl?: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  succeeded: { label: 'Успешно', color: 'bg-green-100 text-green-700' },
  pending:   { label: 'Ожидание', color: 'bg-yellow-100 text-yellow-700' },
  failed:    { label: 'Ошибка', color: 'bg-red-100 text-red-700' },
};

const PROJECT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft:      { label: 'Черновик',    color: 'bg-gray-100 text-gray-600' },
  moderation: { label: 'На проверке', color: 'bg-yellow-100 text-yellow-700' },
  recruiting: { label: 'Набор',       color: 'bg-blue-100 text-blue-700' },
  active:     { label: 'Активен',     color: 'bg-green-100 text-green-700' },
  completed:  { label: 'Завершён',    color: 'bg-emerald-100 text-emerald-700' },
  rejected:   { label: 'Отклонён',    color: 'bg-red-100 text-red-700' },
};

export default function OrganizerPaymentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/login'); return; }
        const { user: u } = await meRes.json();
        if (u.role !== 'organizer') { router.push('/dashboard'); return; }
        setUser(u);

        const res = await fetch('/api/organizer/payments');
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments || []);
        }
      } catch {
        toast.error('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const totalPaid = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
    </div>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        {user && <><OrganizerNav user={user} /><OrganizerSidebar user={user} /></>}
        <DynamicContent>
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">История платежей</h1>
              <p className="hidden sm:block text-sm text-gray-500 mt-1">Все ваши транзакции за публикацию проектов</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-5">
              <p className="text-xs text-gray-500 mb-1">Всего</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{payments.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-5">
              <p className="text-xs text-gray-500 mb-1">Успешных</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{payments.filter((p) => p.status === 'succeeded').length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-5">
              <p className="text-xs text-gray-500 mb-1">Оплачено</p>
              <p className="text-xl sm:text-2xl font-bold text-[#00CC00]">{totalPaid} <span className="text-xs sm:text-sm font-normal">сом</span></p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <p className="text-sm font-medium">Платежей пока нет</p>
                <p className="text-xs mt-1">Платежи появятся после оплаты публикации проекта</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 sm:px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Проект</th>
                      <th className="hidden sm:table-cell text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Дата</th>
                      <th className="text-left px-3 sm:px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Сумма</th>
                      <th className="hidden md:table-cell text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Метод</th>
                      <th className="text-left px-3 sm:px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Статус</th>
                      <th className="hidden lg:table-cell text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">ID транзакции</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((payment) => {
                      const project = payment.projects?.[0];
                      const st = STATUS_MAP[payment.status] || { label: payment.status, color: 'bg-gray-100 text-gray-600' };
                      const pst = project ? (PROJECT_STATUS_MAP[project.status] || { label: project.status, color: 'bg-gray-100 text-gray-600' }) : null;
                      return (
                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 sm:px-5 py-3 sm:py-4">
                            {project ? (
                              <div>
                                <p className="font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[180px] text-xs sm:text-sm">{project.title}</p>
                                {pst && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${pst.color}`}>{pst.label}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="hidden sm:table-cell px-5 py-4 text-gray-600 whitespace-nowrap text-xs sm:text-sm">
                            {fmt(payment.paidAt || payment.createdAt)}
                          </td>
                          <td className="px-3 sm:px-5 py-3 sm:py-4">
                            <span className="font-semibold text-gray-900 text-xs sm:text-sm">{Number(payment.amount)} сом</span>
                          </td>
                          <td className="hidden md:table-cell px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                              {payment.paymentMethod}
                            </span>
                          </td>
                          <td className="px-3 sm:px-5 py-3 sm:py-4">
                            <span className={`text-xs font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${st.color}`}>{st.label}</span>
                          </td>
                          <td className="hidden lg:table-cell px-5 py-4">
                            <span className="text-xs text-gray-400 font-mono truncate block max-w-[140px]" title={payment.finikPaymentId}>
                              {payment.finikPaymentId}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DynamicContent>
      </div>
    </SidebarProvider>
  );
}
