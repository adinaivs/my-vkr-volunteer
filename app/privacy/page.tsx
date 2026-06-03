import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — ВолонтёрКР',
  description: 'Политика конфиденциальности платформы ВолонтёрКР',
};

const sections = [
  {
    title: '1. Общие положения',
    content: [
      'Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей платформы ВолонтёрКР (далее — «Платформа»).',
      'Используя Платформу, вы соглашаетесь с условиями настоящей Политики. Если вы не согласны с какими-либо условиями, пожалуйста, прекратите использование Платформы.',
      'Платформа ВолонтёрКР обязуется защищать вашу конфиденциальность и обрабатывать персональные данные в соответствии с законодательством Кыргызской Республики.',
    ],
  },
  {
    title: '2. Какие данные мы собираем',
    content: [
      'При регистрации: имя, фамилия, адрес электронной почты, номер телефона, город проживания.',
      'Данные профиля: фотография, биография, навыки, интересы (заполняются добровольно).',
      'Данные об активности: информация об участии в проектах, выполненных задачах, полученных достижениях.',
      'Технические данные: IP-адрес, тип браузера, устройство, дата и время посещений (собираются автоматически).',
      'Для организаторов: наименование организации, ИНН, ОКПО, юридический адрес, документы о регистрации.',
    ],
  },
  {
    title: '3. Как мы используем ваши данные',
    content: [
      'Обеспечение работы Платформы: регистрация, авторизация, управление профилем.',
      'Подбор волонтёрских проектов на основе ваших навыков и интересов.',
      'Отправка уведомлений о статусе заявок, новых проектах и обновлениях.',
      'Формирование волонтёрских книжек и отчётов о деятельности.',
      'Улучшение качества сервиса и разработка новых функций.',
      'Обеспечение безопасности и предотвращение мошенничества.',
    ],
  },
  {
    title: '4. Передача данных третьим лицам',
    content: [
      'Мы не продаём, не сдаём в аренду и не передаём ваши персональные данные третьим лицам без вашего согласия, за исключением случаев, предусмотренных законодательством.',
      'Данные могут быть переданы организаторам проектов в объёме, необходимом для участия в волонтёрской деятельности (имя, контакты — только после принятия вашей заявки).',
      'Мы используем сервисы облачного хранения (Timeweb Cloud) для хранения файлов и данных. Эти сервисы обязуются соблюдать конфиденциальность данных.',
    ],
  },
  {
    title: '5. Хранение и защита данных',
    content: [
      'Ваши данные хранятся на защищённых серверах с применением шифрования и современных мер безопасности.',
      'Пароли хранятся в зашифрованном виде (bcrypt) и не могут быть восстановлены в исходном виде даже сотрудниками Платформы.',
      'Мы регулярно обновляем меры безопасности и проводим аудит системы защиты данных.',
      'Данные хранятся в течение срока действия вашего аккаунта. После удаления аккаунта данные удаляются в течение 30 дней.',
    ],
  },
  {
    title: '6. Ваши права',
    content: [
      'Право на доступ: вы можете запросить информацию о хранящихся данных о вас.',
      'Право на исправление: вы можете обновить неточные данные в настройках профиля.',
      'Право на удаление: вы можете запросить удаление своего аккаунта и связанных данных.',
      'Право на ограничение обработки: вы можете ограничить использование ваших данных.',
      'Право на возражение: вы можете отказаться от получения маркетинговых уведомлений.',
      'Для реализации прав обратитесь по адресу: info@volonterkr.kg',
    ],
  },
  {
    title: '7. Cookies и аналитика',
    content: [
      'Платформа использует cookies (сессионные токены) для обеспечения входа в систему и безопасности.',
      'Мы не используем сторонние трекеры или рекламные системы слежения.',
      'Вы можете отключить cookies в настройках браузера, однако это может повлиять на работу Платформы.',
    ],
  },
  {
    title: '8. Изменения политики',
    content: [
      'Мы оставляем за собой право вносить изменения в настоящую Политику.',
      'О существенных изменениях мы уведомим вас по электронной почте или через уведомления в системе.',
      'Продолжение использования Платформы после уведомления означает согласие с обновлённой Политикой.',
    ],
  },
  {
    title: '9. Контактная информация',
    content: [
      'По вопросам, связанным с обработкой персональных данных, обращайтесь:',
      'Email: info@volonterkr.kg',
      'Адрес: г. Бишкек, Кыргызская Республика',
      'Мы ответим на ваш запрос в течение 5 рабочих дней.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="ВолонтёрКР" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-gray-900">
              Волонтёр<span className="text-[#00CC00]">КР</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-[#00CC00] transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            На главную
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00CC00]/10 rounded-2xl mb-5">
            <svg className="w-8 h-8 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Политика конфиденциальности
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Последнее обновление: 1 июня 2026 года
          </p>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Мы серьёзно относимся к защите ваших персональных данных и обязуемся обрабатывать их ответственно и прозрачно.
          </p>
        </div>

        {/* Оглавление */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Содержание</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {sections.map((section, i) => (
              <a
                key={i}
                href={`#section-${i}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#00CC00] transition-colors py-1 group"
              >
                <span className="w-6 h-6 rounded-lg bg-[#00CC00]/10 text-[#00CC00] text-xs font-bold flex items-center justify-center flex-shrink-0 group-hover:bg-[#00CC00] group-hover:text-white transition-colors">
                  {i + 1}
                </span>
                <span className="truncate">{section.title.replace(/^\d+\.\s/, '')}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Разделы */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <div
              key={i}
              id={`section-${i}`}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 scroll-mt-24"
            >
              <div className="flex items-start gap-4 mb-5">
                <span className="w-9 h-9 rounded-xl bg-[#00CC00] text-white text-sm font-bold flex items-center justify-center flex-shrink-0 shadow-md shadow-[#00CC00]/30">
                  {i + 1}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 pt-1">
                  {section.title.replace(/^\d+\.\s/, '')}
                </h2>
              </div>
              <ul className="space-y-3">
                {section.content.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-gray-600 leading-relaxed text-sm sm:text-base">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#00CC00] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Нижний блок */}
        <div className="mt-10 bg-gradient-to-r from-[#00CC00] to-emerald-500 rounded-3xl p-6 sm:p-8 text-white text-center">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-bold mb-2">Есть вопросы о конфиденциальности?</h3>
          <p className="text-emerald-100 text-sm mb-4">Мы готовы ответить на любые вопросы о защите ваших данных</p>
          <a
            href="mailto:info@volonterkr.kg"
            className="inline-block bg-white text-[#00CC00] font-semibold px-6 py-2.5 rounded-full hover:bg-emerald-50 transition-colors text-sm"
          >
            info@volonterkr.kg
          </a>
        </div>

        {/* Ссылка на условия */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Также ознакомьтесь с{' '}
            <Link href="/terms" className="text-[#00CC00] font-medium hover:underline">
              Условиями использования
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>© 2026 ВолонтёрКР. Все права защищены.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-[#00CC00] font-medium">Политика конфиденциальности</Link>
            <Link href="/terms" className="hover:text-[#00CC00] transition-colors">Условия использования</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
