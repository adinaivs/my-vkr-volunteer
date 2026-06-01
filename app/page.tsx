'use client';

import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n';
import LanguageSwitcher from '@/app/i18n/LanguageSwitcher';
import AiSupportButton from '@/app/components/AiSupportButton';

export default function Home() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const { t, locale, setLocale } = useTranslation('landing');
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          router.push('/dashboard');
          return;
        }
      } catch {
        // не авторизован — продолжаем
      }
      setChecking(false);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const steps = [
    {
      num: '1',
      title: t.howItWorks?.steps?.registration?.title || 'Регистрация',
      desc: t.howItWorks?.steps?.registration?.description || 'Создайте профиль и укажите свои навыки или организацию',
      details: t.howItWorks?.steps?.registration?.details || 'Заполните анкету, добавьте фото и расскажите о своих интересах',
      icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
    },
    {
      num: '2',
      title: t.howItWorks?.steps?.projectSelection?.title || 'Выбор проекта',
      desc: t.howItWorks?.steps?.projectSelection?.description || 'Найдите проект или создайте свой собственный',
      details: t.howItWorks?.steps?.projectSelection?.details || 'Используйте фильтры по категориям, городам и датам',
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
    },
    {
      num: '3',
      title: t.howItWorks?.steps?.participation?.title || 'Участие',
      desc: t.howItWorks?.steps?.participation?.description || 'Выполняйте задачи или управляйте командой волонтёров',
      details: t.howItWorks?.steps?.participation?.details || 'Отмечайте выполненные задачи и общайтесь с командой',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      num: '4',
      title: t.howItWorks?.steps?.results?.title || 'Результаты',
      desc: t.howItWorks?.steps?.results?.description || 'Получайте достижения и формируйте отчёты',
      details: t.howItWorks?.steps?.results?.details || 'Скачивайте волонтёрскую книжку и делитесь успехами',
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
    }
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1 >= steps.length ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [steps.length]);

  const testimonials = t.testimonials?.items || [
    { name: 'Айгуль Касымова', role: 'Волонтёр', initials: 'АК', text: 'Платформа помогла мне найти проекты, которые соответствуют моим интересам. Удобный интерфейс и система достижений мотивируют продолжать помогать людям.' },
    { name: 'Тимур Бекмуратов', role: 'Организатор', initials: 'ТБ', text: 'Как организатор, я ценю возможность быстро находить надёжных волонтёров. Система рейтингов значительно упростила управление нашими проектами.' },
    { name: 'Нургуль Асанова', role: 'Волонтёр', initials: 'НА', text: 'Благодаря платформе я нашла единомышленников и участвую в проектах, которые меняют жизнь людей к лучшему.' },
    { name: 'Эрлан Токтогулов', role: 'Организатор НПО', initials: 'ЭТ', text: 'Отличный инструмент для координации волонтёров! Мы смогли увеличить количество участников в два раза.' },
    { name: 'Жанара Сулайманова', role: 'Волонтёр', initials: 'ЖС', text: 'Волонтёрская книжка — это просто находка! Теперь у меня есть подтверждение всей деятельности.' },
    { name: 'Азамат Исаков', role: 'Координатор проектов', initials: 'АИ', text: 'Система аналитики помогает понимать эффективность проектов и улучшать их.' }
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Swipe handlers for mobile carousels
  const handleStepTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleStepTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setActiveStep(prev => (prev + 1) % steps.length);
      else setActiveStep(prev => (prev - 1 + steps.length) % steps.length);
    }
  };
  const handleTestimonialTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTestimonialTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setActiveTestimonial(prev => (prev + 1) % testimonials.length);
      else setActiveTestimonial(prev => (prev - 1 + testimonials.length) % testimonials.length);
    }
  };

  const STEP_OFFSET = isMobile ? 320 : 400;
  const TESTIMONIAL_OFFSET = isMobile ? 320 : 420;

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CC00] mx-auto" />
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 overflow-x-hidden">

      {/* ── HEADER ── */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo.png" alt="ВолонтёрКР" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {locale === 'kg' ? 'Ыктыярчы' : 'Волонтёр'}<span className="text-[#00CC00]">КР</span>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <a href="#features" className="text-gray-600 hover:text-[#00CC00] font-medium transition-colors text-sm lg:text-base">
              {t.header?.nav?.features || 'Возможности'}
            </a>
            <a href="#how-it-works" className="text-gray-600 hover:text-[#00CC00] font-medium transition-colors text-sm lg:text-base">
              {t.header?.nav?.howItWorks || 'Как работает'}
            </a>
            <a href="#for-organizers" className="text-gray-600 hover:text-[#00CC00] font-medium transition-colors text-sm lg:text-base">
              {t.header?.nav?.forOrganizers || 'Организаторам'}
            </a>
            <a href="#testimonials" className="text-gray-600 hover:text-[#00CC00] font-medium transition-colors text-sm lg:text-base">
              {t.header?.nav?.testimonials || 'Отзывы'}
            </a>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageSwitcher currentLocale={locale} onLocaleChange={setLocale} />
            <a href="/login" className="px-4 sm:px-6 py-2 bg-[#00CC00] text-white rounded-full font-medium hover:bg-[#00b300] transition-colors text-sm sm:text-base whitespace-nowrap">
              {t.header?.authButton || 'Войти'}
            </a>
            {/* Hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label="Меню"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4 shadow-lg">
            <nav className="flex flex-col gap-1 pt-2">
              {[
                { href: '#features', label: t.header?.nav?.features || 'Возможности' },
                { href: '#how-it-works', label: t.header?.nav?.howItWorks || 'Как работает' },
                { href: '#for-organizers', label: t.header?.nav?.forOrganizers || 'Организаторам' },
                { href: '#testimonials', label: t.header?.nav?.testimonials || 'Отзывы' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="py-3 px-2 text-gray-700 hover:text-[#00CC00] font-medium border-b border-gray-50 last:border-0 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Декоративные карточки — только на планшете+ */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
          <div className="absolute left-10 top-32 opacity-20 rotate-12">
            <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-[#00CC00]/30 w-32">
              <div className="w-8 h-8 bg-[#00CC00] rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <p className="text-xs font-bold text-gray-700">{t.hero?.decorativeCards?.helpPeople || 'Помощь людям'}</p>
            </div>
          </div>
          <div className="absolute right-16 top-40 opacity-20 -rotate-6">
            <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-[#00CC00]/30 w-32">
              <div className="w-8 h-8 bg-[#00CC00] rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <p className="text-xs font-bold text-gray-700">{t.hero?.decorativeCards?.projects || '150+ проектов'}</p>
            </div>
          </div>
          <div className="absolute left-20 bottom-32 opacity-20 -rotate-12">
            <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-[#00CC00]/30 w-32">
              <div className="w-8 h-8 bg-[#00CC00] rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
              </div>
              <p className="text-xs font-bold text-gray-700">{t.hero?.decorativeCards?.awards || 'Награды'}</p>
            </div>
          </div>
          <div className="absolute right-24 bottom-40 opacity-20 rotate-6">
            <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-[#00CC00]/30 w-32">
              <div className="w-8 h-8 bg-[#00CC00] rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </div>
              <p className="text-xs font-bold text-gray-700">{t.hero?.decorativeCards?.community || 'Сообщество'}</p>
            </div>
          </div>
          <div className="absolute left-1/4 top-24 opacity-15 rotate-3">
            <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-[#00CC00]/30 w-28">
              <div className="w-8 h-8 bg-[#00CC00] rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <p className="text-xs font-bold text-gray-700">{t.hero?.decorativeCards?.schedule || 'Расписание'}</p>
            </div>
          </div>
          <div className="absolute right-1/4 bottom-28 opacity-15 -rotate-3">
            <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-[#00CC00]/30 w-28">
              <div className="w-8 h-8 bg-[#00CC00] rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <p className="text-xs font-bold text-gray-700">{t.hero?.decorativeCards?.find || 'Найти'}</p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
            {t.hero?.title || 'Стань частью перемен и меняй мир'}{' '}
            <span className="text-[#00CC00]">{t.hero?.titleHighlight || 'к лучшему вместе с нами'}</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            {t.hero?.subtitle || 'Платформа для волонтёров и организаторов социальных проектов в Кыргызстане'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <a href="/register" className="px-6 sm:px-8 py-3 sm:py-4 bg-[#00CC00] text-white rounded-full font-bold hover:bg-[#00b300] transition-colors shadow-lg inline-block text-center">
              {t.hero?.findProjectButton || 'Найти проект'}
            </a>
            <a href="/register" className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-[#00CC00] border-2 border-[#00CC00] rounded-full font-bold hover:bg-emerald-50 transition-colors inline-block text-center">
              {t.hero?.createProjectButton || 'Создать проект'}
            </a>
          </div>
        </div>
      </section>

      {/* ── STATISTICS ── */}
      <section className="relative py-8 sm:py-12 pb-20 sm:pb-24 px-4 sm:px-6 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl sm:rounded-[3rem] p-5 sm:p-10 border border-gray-200/50 shadow-2xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {[
                { value: '500+', label: t.statistics?.volunteers || 'Активных волонтёров' },
                { value: '150+', label: t.statistics?.projects || 'Завершённых проектов' },
                { value: '50+', label: t.statistics?.partners || 'Организаций-партнёров' },
                { value: '10K+', label: t.statistics?.hours || 'Часов волонтёрства' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#00CC00] mb-1">{stat.value}</div>
                  <div className="text-gray-600 text-xs sm:text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] rotate-180">
          <svg className="relative block w-full h-[60px] sm:h-[80px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-white" />
          </svg>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-3 sm:mb-4">
            {t.features?.title || 'Возможности платформы'}
          </h2>
          <p className="text-center text-gray-600 mb-8 sm:mb-12 text-base sm:text-lg">
            {t.features?.subtitle || 'Всё необходимое для эффективной волонтёрской деятельности'}
          </p>
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl sm:rounded-[3rem] p-6 sm:p-12 border border-gray-200/50 shadow-[0_0_40px_rgba(240,253,244,0.8)]">
            <div className="grid sm:grid-cols-2 gap-x-8 lg:gap-x-16 gap-y-8 sm:gap-y-12 max-w-6xl mx-auto">
              {/* Колонка 1 */}
              <div className="relative space-y-7 sm:space-y-8">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-gray-300 hidden sm:block" />
                {[
                  { title: t.features?.items?.projectSearch?.title || 'Поиск проектов', desc: t.features?.items?.projectSearch?.description || 'Находите проекты по категориям, городам и навыкам', color: 'bg-[#00CC00]', shadow: 'shadow-[0_0_30px_rgba(0,204,0,0.6)]', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
                  { title: t.features?.items?.taskCalendar?.title || 'Календарь задач', desc: t.features?.items?.taskCalendar?.description || 'Управляйте своим расписанием волонтёрской деятельности', color: 'bg-emerald-500', shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.6)]', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                  { title: t.features?.items?.achievements?.title || 'Достижения', desc: t.features?.items?.achievements?.description || 'Получайте награды и скидки от партнёров за активность', color: 'bg-[#00CC00]', shadow: 'shadow-[0_0_30px_rgba(0,204,0,0.6)]', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
                ].map(item => (
                  <div key={item.title} className="relative flex gap-4 sm:gap-6 items-start">
                    <div className="relative z-10 flex-shrink-0">
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full ${item.color} flex items-center justify-center ${item.shadow}`}>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{item.title}</h3>
                      <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Колонка 2 */}
              <div className="relative space-y-7 sm:space-y-8">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-gray-300 hidden sm:block" />
                {[
                  { title: t.features?.items?.volunteerBook?.title || 'Волонтёрская книжка', desc: t.features?.items?.volunteerBook?.description || 'Формируйте отчёты о своей деятельности в PDF', color: 'bg-emerald-500', shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.6)]', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                  { title: t.features?.items?.aiAssistant?.title || 'ИИ-помощник', desc: t.features?.items?.aiAssistant?.description || 'Получайте ответы на вопросы от умного чат-бота', color: 'bg-[#00CC00]', shadow: 'shadow-[0_0_30px_rgba(0,204,0,0.6)]', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
                  { title: t.features?.items?.reliabilityRating?.title || 'Рейтинг надёжности', desc: t.features?.items?.reliabilityRating?.description || 'Повышайте свой рейтинг выполняя задачи качественно', color: 'bg-emerald-500', shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.6)]', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
                ].map(item => (
                  <div key={item.title} className="relative flex gap-4 sm:gap-6 items-start">
                    <div className="relative z-10 flex-shrink-0">
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full ${item.color} flex items-center justify-center ${item.shadow}`}>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{item.title}</h3>
                      <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative py-14 sm:py-16 px-4 sm:px-6 bg-[#00CC00] text-white overflow-hidden">
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0]">
          <svg className="relative block w-full h-[60px] sm:h-[80px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-white" />
          </svg>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3 sm:mb-4 text-white">{t.howItWorks?.title || 'Как это работает'}</h2>
          <p className="text-center text-white/90 mb-6 sm:mb-8 text-base sm:text-lg">
            {t.howItWorks?.subtitle || 'Простые шаги для начала волонтёрской деятельности'}
          </p>

          {/* Mobile: single card display with swipe */}
          <div
            className="md:hidden relative overflow-hidden"
            onTouchStart={handleStepTouchStart}
            onTouchEnd={handleStepTouchEnd}
          >
            {steps.map((step, index) => (
              <div
                key={index}
                className="absolute inset-0 transition-all duration-500"
                style={{
                  transform: `translateX(${(index - activeStep) * 100}%)`,
                  opacity: index === activeStep ? 1 : 0,
                }}
              >
                <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl p-6 border-2 border-[#00CC00]/30 shadow-[0_0_40px_rgba(0,204,0,0.4)] mx-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-4xl font-bold text-[#00CC00]">{step.num}</div>
                    <div className="w-10 h-10 bg-[#00CC00]/10 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{step.desc}</p>
                  <p className="text-xs text-gray-500 italic border-l-2 border-[#00CC00]/30 pl-3">{step.details}</p>
                </div>
              </div>
            ))}
            {/* placeholder height */}
            <div className="invisible px-2">
              <div className="bg-white rounded-2xl p-6">
                <div className="text-4xl font-bold mb-3">1</div>
                <h3 className="text-lg font-bold mb-2">{steps[0].title}</h3>
                <p className="text-sm mb-3">{steps[0].desc}</p>
                <p className="text-xs">{steps[0].details}</p>
              </div>
            </div>
          </div>

          {/* Desktop: 3-card carousel */}
          <div className="hidden md:flex relative h-[350px] items-center justify-center overflow-hidden">
            {steps.map((step, index) => {
              let position = index - activeStep;
              if (position < -2) position = steps.length + position;
              else if (position > 2) position = position - steps.length;
              if (activeStep === steps.length - 1 && index === 0) position = 1;
              if (activeStep === 0 && index === steps.length - 1) position = -1;
              const isActive = index === activeStep;
              const isVisible = Math.abs(position) <= 1;
              return (
                <div
                  key={index}
                  onClick={() => { if (Math.abs(position) === 1) setActiveStep(index); }}
                  className={`absolute transition-all duration-700 ease-out cursor-pointer ${isActive ? 'z-30' : 'z-10'}`}
                  style={{
                    transform: `translateX(${position * STEP_OFFSET}px) scale(${isActive ? 1 : 0.85})`,
                    opacity: isVisible ? (isActive ? 1 : 0.6) : 0,
                    pointerEvents: isVisible ? 'auto' : 'none',
                  }}
                >
                  <div className={`bg-gradient-to-br from-white to-emerald-50 rounded-2xl p-8 flex gap-5 transition-all duration-700 border-2 border-[#00CC00]/30 relative overflow-hidden ${isActive ? 'shadow-[0_0_40px_rgba(0,204,0,0.4)] w-[380px] lg:w-[420px]' : 'shadow-[0_0_20px_rgba(0,204,0,0.2)] w-[360px] lg:w-[400px]'}`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#00CC00]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-[#00CC00]/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                    <div className={`rounded-full flex-shrink-0 bg-[#00CC00] shadow-[0_0_20px_rgba(0,204,0,0.6)] ${isActive ? 'w-2' : 'w-1.5'}`} />
                    <div className="relative z-10 flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`font-bold text-[#00CC00] ${isActive ? 'text-4xl' : 'text-3xl'}`}>{step.num}</div>
                        {isActive && (
                          <div className="w-10 h-10 bg-[#00CC00]/10 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#00CC00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className={`font-bold mb-2 text-gray-900 ${isActive ? 'text-xl' : 'text-lg'}`}>{step.title}</h3>
                      <p className={`text-gray-600 mb-2 ${isActive ? 'text-sm' : 'text-xs'}`}>{step.desc}</p>
                      {isActive && <p className="text-xs text-gray-500 italic border-l-2 border-[#00CC00]/30 pl-3 mt-3">{step.details}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-3 mt-4 sm:mt-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`transition-all duration-300 rounded-full ${activeStep === index ? 'w-8 h-2.5 bg-white' : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/70'}`}
                aria-label={`Шаг ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] rotate-180">
          <svg className="relative block w-full h-[60px] sm:h-[80px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-white" />
          </svg>
        </div>
      </section>

      {/* ── FOR ORGANIZERS ── */}
      <section id="for-organizers" className="py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-white via-emerald-50/30 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16 relative">
            <div className="absolute left-1/2 -translate-x-1/2 -top-6 sm:-top-8 w-20 h-1 bg-[#00CC00] rounded-full" />
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              {t.forOrganizers?.title || 'Для организаторов'}
            </h2>
            <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
              {t.forOrganizers?.subtitle || 'Инструменты для эффективного управления волонтёрскими проектами'}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-8">
            {[
              { num: '01', title: t.forOrganizers?.items?.createProjects?.title || 'Создание проектов', desc: t.forOrganizers?.items?.createProjects?.description || 'Публикуйте проекты с описанием и требованиями', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', grad: 'from-[#00CC00] to-emerald-400' },
              { num: '02', title: t.forOrganizers?.items?.volunteerDatabase?.title || 'База волонтёров', desc: t.forOrganizers?.items?.volunteerDatabase?.description || 'Ищите волонтёров по навыкам и опыту', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', grad: 'from-emerald-500 to-[#00CC00]' },
              { num: '03', title: t.forOrganizers?.items?.analytics?.title || 'Аналитика', desc: t.forOrganizers?.items?.analytics?.description || 'Формируйте отчёты и отслеживайте прогресс', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', grad: 'from-[#00CC00] to-emerald-400' },
            ].map(card => (
              <div key={card.num} className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00CC00] to-emerald-300 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
                <div className="relative bg-white rounded-2xl p-6 sm:p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  <div className="mb-5 sm:mb-6 relative">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${card.grad} rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                      </svg>
                    </div>
                    <div className="absolute -top-3 -right-3 w-7 h-7 sm:w-8 sm:h-8 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg">
                      {card.num}
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-[#00CC00] transition-colors">{card.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{card.desc}</p>
                  <div className="mt-5 sm:mt-6 h-0.5 bg-gradient-to-r from-[#00CC00] to-transparent w-0 group-hover:w-full transition-all duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section id="benefits" className="relative py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0]">
          <svg className="relative block w-full h-[60px] sm:h-[80px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-white" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto relative z-10 pt-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-3 sm:mb-4">
            {t.benefits?.title || 'Почему выбирают нас'}
          </h2>
          <p className="text-center text-gray-600 mb-8 sm:mb-12 text-base sm:text-lg">
            {t.benefits?.subtitle || 'Преимущества платформы'}
          </p>
          <div className="max-w-6xl mx-auto bg-white rounded-3xl sm:rounded-[3rem] p-6 sm:p-12 border border-gray-200/50 shadow-[0_0_40px_rgba(240,253,244,0.8)]">
            <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12">
              <div className="w-full lg:w-1/2 flex justify-center">
                <img src="/whyus.jpg" alt={t.benefits?.imageAlt || 'Почему выбирают нас'} className="w-full max-w-sm sm:max-w-lg object-cover rounded-2xl" />
              </div>
              <div className="w-full lg:w-1/2">
                <div className="relative space-y-6 sm:space-y-8">
                  <div className="absolute left-5 sm:left-6 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-gray-300" />
                  {[
                    { title: t.benefits?.items?.convenientSearch?.title || 'Удобный поиск', desc: t.benefits?.items?.convenientSearch?.description || 'Фильтруйте проекты по категориям и навыкам', color: 'bg-[#00CC00]', shadow: 'shadow-[0_0_30px_rgba(0,204,0,0.6)]', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
                    { title: t.benefits?.items?.gamification?.title || 'Геймификация', desc: t.benefits?.items?.gamification?.description || 'Получайте достижения и награды от партнёров', color: 'bg-emerald-500', shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.6)]', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
                    { title: t.benefits?.items?.transparency?.title || 'Прозрачность', desc: t.benefits?.items?.transparency?.description || 'Отслеживайте статус и получайте обратную связь', color: 'bg-[#00CC00]', shadow: 'shadow-[0_0_30px_rgba(0,204,0,0.6)]', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                    { title: t.benefits?.items?.automation?.title || 'Автоматизация', desc: t.benefits?.items?.automation?.description || 'Управляйте проектами в одном месте', color: 'bg-emerald-500', shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.6)]', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                  ].map(item => (
                    <div key={item.title} className="relative flex gap-4 sm:gap-6 items-start">
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${item.color} flex items-center justify-center ${item.shadow}`}>
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{item.title}</h3>
                        <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-14 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              {t.testimonials?.title || 'Отзывы, которые говорят о'}{' '}
              <span className="text-[#00CC00]">{t.testimonials?.titleHighlight || 'наших результатах'}</span>
            </h2>
            <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
              {t.testimonials?.subtitle || 'Что говорят волонтёры и организаторы о платформе'}
            </p>
          </div>

          {/* Mobile: single card swipe */}
          <div
            className="md:hidden relative overflow-hidden"
            onTouchStart={handleTestimonialTouchStart}
            onTouchEnd={handleTestimonialTouchEnd}
          >
            {testimonials.map((testimonial: any, index: number) => (
              <div
                key={index}
                className="absolute inset-0 transition-all duration-500"
                style={{
                  transform: `translateX(${(index - activeTestimonial) * 100}%)`,
                  opacity: index === activeTestimonial ? 1 : 0,
                }}
              >
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 border border-[#00CC00]/30 shadow-[0_0_30px_rgba(0,204,0,0.2)] mx-2">
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-[#00CC00]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-2 text-white font-bold text-sm">5.0</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-4 text-sm">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-700/50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00CC00] to-emerald-400 flex items-center justify-center text-sm font-bold text-white ring-4 ring-[#00CC00]/20">
                      {testimonial.initials}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{testimonial.name}</h4>
                      <p className="text-gray-400 text-xs">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* placeholder */}
            <div className="invisible mx-2">
              <div className="bg-gray-800 rounded-2xl p-5">
                <div className="flex gap-1 mb-3">{[...Array(5)].map((_, i) => <span key={i} className="w-4 h-4" />)}</div>
                <p className="text-sm mb-4">{testimonials[0].text}</p>
                <div className="flex items-center gap-3 pt-3 border-t border-gray-700/50">
                  <div className="w-10 h-10 rounded-full" />
                  <div><h4 className="text-sm">{testimonials[0].name}</h4><p className="text-xs">{testimonials[0].role}</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: 3-card carousel */}
          <div className="hidden md:flex relative h-[280px] items-center justify-center overflow-hidden max-w-6xl mx-auto">
            {testimonials.map((testimonial: any, index: number) => {
              let position = index - activeTestimonial;
              if (position < -2) position = testimonials.length + position;
              else if (position > 2) position = position - testimonials.length;
              const isActive = index === activeTestimonial;
              const isVisible = Math.abs(position) <= 1;
              return (
                <div
                  key={index}
                  onClick={() => { if (Math.abs(position) === 1) setActiveTestimonial(index); }}
                  className={`absolute transition-all duration-700 ease-out cursor-pointer ${isActive ? 'z-30' : 'z-10'}`}
                  style={{
                    transform: `translateX(${position * TESTIMONIAL_OFFSET}px) scale(${isActive ? 1 : 0.85})`,
                    opacity: isVisible ? (isActive ? 1 : 0.5) : 0,
                    pointerEvents: isVisible ? 'auto' : 'none',
                  }}
                >
                  <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 transition-all duration-700 border border-gray-700/50 ${isActive ? 'shadow-[0_0_30px_rgba(0,204,0,0.2)] border-[#00CC00]/30 w-[380px] lg:w-[400px]' : 'w-[360px] lg:w-[380px]'}`}>
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-[#00CC00]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-2 text-white font-bold text-sm">5.0</span>
                    </div>
                    <p className="text-gray-300 leading-relaxed mb-4 text-sm">"{testimonial.text}"</p>
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-700/50">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00CC00] to-emerald-400 flex items-center justify-center text-sm font-bold text-white ring-4 ring-[#00CC00]/20">
                        {testimonial.initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{testimonial.name}</h4>
                        <p className="text-gray-400 text-xs">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nav buttons */}
          <div className="flex justify-center gap-4 mt-6 sm:mt-8">
            <button onClick={() => setActiveTestimonial(prev => (prev - 1 + testimonials.length) % testimonials.length)} className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors border border-gray-300">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => setActiveTestimonial(prev => (prev + 1) % testimonials.length)} className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#00CC00] hover:bg-[#00b300] flex items-center justify-center transition-colors shadow-[0_0_20px_rgba(0,204,0,0.4)]">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="flex justify-center gap-2 mt-4 sm:mt-6">
            {testimonials.map((_: any, index: number) => (
              <button key={index} onClick={() => setActiveTestimonial(index)} className={`transition-all duration-300 rounded-full ${activeTestimonial === index ? 'w-8 h-2.5 bg-[#00CC00]' : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'}`} aria-label={`Отзыв ${index + 1}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-[#00CC00] to-[#00aa00] text-white overflow-hidden">
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0]">
          <svg className="relative block w-full h-[60px] sm:h-[80px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-emerald-50" />
          </svg>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6">{t.cta?.title || 'Готовы начать?'}</h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-emerald-100">{t.cta?.subtitle || 'Присоединяйтесь к сообществу волонтёров и организаторов'}</p>
          <a href="/register" className="inline-block px-8 py-4 bg-white text-[#00CC00] rounded-full font-bold text-lg hover:bg-emerald-50 transition-colors shadow-xl">
            {t.cta?.button || 'Зарегистрироваться'}
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-300 py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            {/* О платформе */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#00CC00] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div className="text-xl font-bold text-white">
                  {locale === 'kg' ? 'Ыктыярчы' : 'Волонтёр'}<span className="text-[#00CC00]">КР</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                {t.footer?.description || 'Платформа для объединения волонтёров и организаторов в Кыргызстане'}
              </p>
            </div>
            {/* Быстрые ссылки */}
            <div>
              <h3 className="text-white font-bold mb-3 sm:mb-4 text-sm sm:text-base">{t.footer?.quickLinks?.title || 'Быстрые ссылки'}</h3>
              <ul className="space-y-2">
                {[
                  { href: '#features', label: t.footer?.quickLinks?.features || 'Возможности' },
                  { href: '#how-it-works', label: t.footer?.quickLinks?.howItWorks || 'Как работает' },
                  { href: '#for-organizers', label: t.footer?.quickLinks?.forOrganizers || 'Для организаторов' },
                  { href: '#testimonials', label: t.footer?.quickLinks?.testimonials || 'Отзывы' },
                ].map(link => (
                  <li key={link.href}>
                    <a href={link.href} className="text-gray-400 hover:text-[#00CC00] transition-colors text-xs sm:text-sm">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Для пользователей */}
            <div>
              <h3 className="text-white font-bold mb-3 sm:mb-4 text-sm sm:text-base">{t.footer?.forUsers?.title || 'Для пользователей'}</h3>
              <ul className="space-y-2">
                {[
                  t.footer?.forUsers?.findProject || 'Найти проект',
                  t.footer?.forUsers?.createProject || 'Создать проект',
                  t.footer?.forUsers?.volunteerBook || 'Волонтёрская книжка',
                  t.footer?.forUsers?.support || 'Помощь и поддержка',
                ].map(label => (
                  <li key={label}>
                    <a href="#" className="text-gray-400 hover:text-[#00CC00] transition-colors text-xs sm:text-sm">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Контакты */}
            <div>
              <h3 className="text-white font-bold mb-3 sm:mb-4 text-sm sm:text-base">{t.footer?.contacts?.title || 'Контакты'}</h3>
              <ul className="space-y-2 sm:space-y-3">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#00CC00] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <a href="mailto:info@volonterkr.kg" className="text-gray-400 hover:text-[#00CC00] transition-colors text-xs sm:text-sm break-all">{t.footer?.contacts?.email || 'info@volonterkr.kg'}</a>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#00CC00] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <a href="tel:+996555123456" className="text-gray-400 hover:text-[#00CC00] transition-colors text-xs sm:text-sm">{t.footer?.contacts?.phone || '+996 555 123 456'}</a>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#00CC00] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-gray-400 text-xs sm:text-sm">{t.footer?.contacts?.address || 'г. Бишкек, Кыргызстан'}</span>
                </li>
              </ul>
              <div className="mt-4 sm:mt-6">
                <h4 className="text-white font-semibold mb-3 text-xs sm:text-sm">{t.footer?.contacts?.socialMedia || 'Мы в соцсетях'}</h4>
                <div className="flex gap-3">
                  {['M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z', 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z', 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z'].map((path, i) => (
                    <a key={i} href="#" className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-800 hover:bg-[#00CC00] rounded-lg flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d={path} /></svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 sm:pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-xs sm:text-sm text-gray-400">{t.footer?.copyright || '© 2026 ВолонтёрКР. Все права защищены.'}</p>
              <div className="flex gap-4 sm:gap-6">
                <a href="#" className="text-xs sm:text-sm text-gray-400 hover:text-[#00CC00] transition-colors">{t.footer?.privacyPolicy || 'Политика конфиденциальности'}</a>
                <a href="#" className="text-xs sm:text-sm text-gray-400 hover:text-[#00CC00] transition-colors">{t.footer?.termsOfUse || 'Условия использования'}</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <AiSupportButton />
    </div>
  );
}
