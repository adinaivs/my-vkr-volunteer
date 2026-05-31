'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import AdminSidebar from '../components/AdminSidebar';
import DynamicContent from '@/app/components/DynamicContent';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { useToast } from '@/app/components/ToastContainer';
import CustomSelect from '@/app/components/CustomSelect';

interface AdminUser { id: string; firstName: string; lastName: string; email: string; role: string; avatarUrl?: string; }

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

export default function AdminPaymentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, succeeded: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.push('/admin/login'); return; }
        const { user } = await meRes.json();
        if (user.role !== 'admin') { router.push('/'); return; }
        setMe(user);

        const res = await fetch('/api/admin/payments');
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments || []);
          setStats(data.stats || { total: 0, succeeded: 0, totalAmount: 0 });
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

  const filtered = payments.filter((p) => {
    const orgName = p.user?.organizerProfile?.organizationName || '';
    const fullName = `${p.user?.firstName} ${p.user?.lastName}`;
    const projectTitle = p.projects?.[0]?.title || '';
    const matchSearch =
      !search ||
      orgName.toLowerCase().includes(search.toLowerCase()) ||
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      projectTitle.toLowerCase().includes(search.toLowerCase()) ||
      p.finikPaymentId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00]" />
    </div>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50">
        {me && <><AdminNav user={me} /><AdminSidebar user={me} /></>}
        <DynamicContent>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Управление платежами</h1>
              <p className="text-sm text-gray-500 mt-1">Все транзакции платёжной системы Finik</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1">Всего транзакций</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1">Успешных</p>
              <p className="text-2xl font-bold text-green-600">{stats.succeeded}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1">Общая выручка</p>
              <p className="text-2xl font-bold text-[#00CC00]">{stats.totalAmount} сом</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по организатору, проекту, ID..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00CC00]"
              />
            </div>
            <CustomSelect
              value={filterStatus}
              onChange={setFilterStatus}
              className="w-44"
              options={[
                { value: 'all', label: 'Все статусы' },
                { value: 'succeeded', label: 'Успешные' },
                { value: 'pending', label: 'Ожидание' },
                { value: 'failed', label: 'Ошибка' },
              ]}
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <p className="text-sm font-medium">{search || filterStatus !== 'all' ? 'Ничего не найдено' : 'Платежей пока нет'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Организатор</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Проект</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Дата</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Сумма</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Статус</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">ID транзакции</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((payment) => {
                      const project = payment.projects?.[0];
                      const st = STATUS_MAP[payment.status] || { label: payment.status, color: 'bg-gray-100 text-gray-600' };
                      const pst = project ? (PROJECT_STATUS_MAP[project.status] || { label: project.status, color: 'bg-gray-100 text-gray-600' }) : null;
                      const orgName = payment.user?.organizerProfile?.organizationName || `${payment.user?.firstName} ${payment.user?.lastName}`;
                      return (
                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-medium text-gray-900 truncate max-w-[160px]">{orgName}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[160px]">{payment.user?.email}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {project ? (
                              <div>
                                <p className="font-medium text-gray-900 truncate max-w-[160px]">{project.title}</p>
                                {pst && <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${pst.color}`}>{pst.label}</span>}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                            {fmt(payment.paidAt || payment.createdAt)}
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-semibold text-gray-900">{Number(payment.amount)} сом</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                          </td>
                          <td className="px-5 py-4">
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
