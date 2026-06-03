import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Условия использования — ВолонтёрКР',
  description: 'Условия использования платформы ВолонтёрКР',
};

const sections = [
  {
    title: '1. Принятие условий',
    content: [
      'Настоящие Условия использования (далее — «Условия») регулируют использование платформы ВолонтёрКР (далее — «Платформа»).',
      'Регистрируясь и используя Платформу, вы подтверждаете, что ознакомились с настоящими Условиями и согласны их соблюдать.',
      'Если вы не согласны с Условиями, вы не вправе использовать Платформу.',
      'Платформа предназначена для лиц, достигших 14 лет. Несовершеннолетние пользователи должны иметь согласие родителей или законных представителей.',
    ],
  },
  {
    title: '2. Описание сервиса',
    content: [
      'ВолонтёрКР — платформа для координации волонтёрской деятельности в Кыргызстане, соединяющая волонтёров и организаторов социальных проектов.',
      'Платформа предоставляет инструменты для поиска проектов, подачи заявок, управления волонтёрами, формирования отчётности и получения достижений.',
      'Платформа предоставляется «как есть». Мы стремимся к бесперебойной работе, однако не гарантируем постоянную доступность сервиса.',
    ],
  },
  {
    title: '3. Регистрация и аккаунт',
    content: [
      'Для использования большинства функций Платформы необходима регистрация с указанием достоверных данных.',
      'Вы несёте ответственность за сохранность данных для входа в аккаунт и за все действия, совершённые с вашего аккаунта.',
      'Один человек может иметь только один аккаунт. Создание нескольких аккаунтов запрещено.',
      'При обнаружении несанкционированного доступа к аккаунту незамедлительно сообщите нам по адресу info@volonterkr.kg.',
      'Для организаторов: регистрация организации требует предоставления действительных юридических документов и проходит проверку администрацией.',
    ],
  },
  {
    title: '4. Правила поведения',
    content: [
      'Запрещено размещать ложную, вводящую в заблуждение или оскорбительную информацию.',
      'Запрещено использовать Платформу в коммерческих целях без согласования с администрацией.',
      'Запрещено совершать действия, нарушающие права других пользователей или законодательство Кыргызской Республики.',
      'Запрещено пытаться получить несанкционированный доступ к системе или данным других пользователей.',
      'Запрещено использовать автоматизированные средства для сбора данных с Платформы (парсинг).',
      'Уважительное отношение к другим участникам сообщества является обязательным условием использования Платформы.',
    ],
  },
  {
    title: '5. Волонтёрская деятельность',
    content: [
      'Платформа является посредником между волонтёрами и организаторами и не является работодателем.',
      'Участие в проектах осуществляется на добровольной и безвозмездной основе, если иное явно не указано в описании проекта.',
      'Организаторы несут ответственность за безопасность проводимых мероприятий и достоверность информации о проектах.',
      'Волонтёры несут ответственность за выполнение принятых на себя обязательств в рамках проекта.',
      'Платформа не несёт ответственности за ущерб, причинённый в ходе волонтёрской деятельности.',
    ],
  },
  {
    title: '6. Контент пользователей',
    content: [
      'Размещая материалы на Платформе (фото, описания, отчёты), вы предоставляете нам право на их использование в рамках работы сервиса.',
      'Вы гарантируете, что размещаемый контент не нарушает авторские права третьих лиц.',
      'Мы оставляем за собой право удалять контент, нарушающий настоящие Условия или законодательство.',
      'Администрация не несёт ответственности за контент, размещённый пользователями.',
    ],
  },
  {
    title: '7. Интеллектуальная собственность',
    content: [
      'Все материалы Платформы (дизайн, логотип, тексты, программный код) являются интеллектуальной собственностью ВолонтёрКР.',
      'Запрещается копировать, воспроизводить или распространять материалы Платформы без письменного разрешения.',
      'Использование логотипа и фирменного стиля ВолонтёрКР допускается только с письменного согласия администрации.',
    ],
  },
  {
    title: '8. Ограничение ответственности',
    content: [
      'Платформа не несёт ответственности за прямой или косвенный ущерб, возникший в результате использования или невозможности использования сервиса.',
      'Мы не гарантируем успешного результата волонтёрской деятельности или трудоустройства через Платформу.',
      'Платформа не несёт ответственности за действия третьих лиц, в том числе организаторов проектов.',
    ],
  },
  {
    title: '9. Блокировка и удаление аккаунта',
    content: [
      'Администрация вправе заблокировать или удалить аккаунт при нарушении настоящих Условий без предварительного уведомления.',
      'Вы можете самостоятельно удалить свой аккаунт в настройках профиля или обратившись к администрации.',
      'При удалении аккаунта данные удаляются в соответствии с Политикой конфиденциальности.',
    ],
  },
  {
    title: '10. Изменения условий',
    content: [
      'Мы оставляем за собой право изменять настоящие Условия в любое время.',
      'О существенных изменениях мы уведомим пользователей по электронной почте за 7 дней до вступления в силу.',
      'Продолжение использования Платформы после вступления изменений в силу означает их принятие.',
      'Актуальная версия Условий всегда доступна на данной странице.',
    ],
  },
  {
    title: '11. Применимое право',
    content: [
      'Настоящие Условия регулируются законодательством Кыргызской Республики.',
      'Все споры, возникающие в связи с использованием Платформы, разрешаются путём переговоров.',
      'При невозможности урегулирования спора в досудебном порядке он передаётся на рассмотрение в суд по месту нахождения Платформы.',
      'По всем вопросам обращайтесь: info@volonterkr.kg',
    ],
  },
];

export default function TermsPage() {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Условия использования
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Последнее обновление: 1 июня 2026 года
          </p>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Пожалуйста, внимательно ознакомьтесь с условиями перед использованием платформы ВолонтёрКР.
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-bold mb-2">Остались вопросы?</h3>
          <p className="text-emerald-100 text-sm mb-4">Свяжитесь с нами, и мы поможем разобраться</p>
          <a
            href="mailto:info@volonterkr.kg"
            className="inline-block bg-white text-[#00CC00] font-semibold px-6 py-2.5 rounded-full hover:bg-emerald-50 transition-colors text-sm"
          >
            info@volonterkr.kg
          </a>
        </div>

        {/* Ссылка на политику */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Также ознакомьтесь с{' '}
            <Link href="/privacy" className="text-[#00CC00] font-medium hover:underline">
              Политикой конфиденциальности
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>© 2026 ВолонтёрКР. Все права защищены.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#00CC00] transition-colors">Политика конфиденциальности</Link>
            <Link href="/terms" className="text-[#00CC00] font-medium">Условия использования</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
