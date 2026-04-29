// Типы для переводов landing страницы
export interface LandingTranslations {
  header: {
    logo: string;
    nav: {
      features: string;
      howItWorks: string;
      forOrganizers: string;
      testimonials: string;
    };
    authButton: string;
  };
  hero: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    findProjectButton: string;
    createProjectButton: string;
    decorativeCards: {
      helpPeople: string;
      projects: string;
      awards: string;
      community: string;
      schedule: string;
      find: string;
    };
  };
  statistics: {
    volunteers: string;
    projects: string;
    partners: string;
    hours: string;
  };
  features: {
    title: string;
    subtitle: string;
    items: {
      projectSearch: {
        title: string;
        description: string;
      };
      taskCalendar: {
        title: string;
        description: string;
      };
      achievements: {
        title: string;
        description: string;
      };
      volunteerBook: {
        title: string;
        description: string;
      };
      aiAssistant: {
        title: string;
        description: string;
      };
      reliabilityRating: {
        title: string;
        description: string;
      };
    };
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: {
      registration: {
        title: string;
        description: string;
        details: string;
      };
      projectSelection: {
        title: string;
        description: string;
        details: string;
      };
      participation: {
        title: string;
        description: string;
        details: string;
      };
      results: {
        title: string;
        description: string;
        details: string;
      };
    };
    ariaLabel: string;
  };
  forOrganizers: {
    title: string;
    subtitle: string;
    items: {
      createProjects: {
        title: string;
        description: string;
      };
      volunteerDatabase: {
        title: string;
        description: string;
      };
      analytics: {
        title: string;
        description: string;
      };
    };
  };
  benefits: {
    title: string;
    subtitle: string;
    imageAlt: string;
    items: {
      convenientSearch: {
        title: string;
        description: string;
      };
      gamification: {
        title: string;
        description: string;
      };
      transparency: {
        title: string;
        description: string;
      };
      automation: {
        title: string;
        description: string;
      };
    };
  };
  testimonials: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    rating: string;
    items: Array<{
      name: string;
      role: string;
      initials: string;
      text: string;
    }>;
    ariaLabel: string;
  };
  cta: {
    title: string;
    subtitle: string;
    button: string;
  };
  footer: {
    logo: string;
    description: string;
    quickLinks: {
      title: string;
      features: string;
      howItWorks: string;
      forOrganizers: string;
      benefits: string;
      testimonials: string;
    };
    forUsers: {
      title: string;
      findProject: string;
      createProject: string;
      volunteerBook: string;
      support: string;
      faq: string;
    };
    contacts: {
      title: string;
      email: string;
      phone: string;
      address: string;
      socialMedia: string;
    };
    copyright: string;
    privacyPolicy: string;
    termsOfUse: string;
  };
}

// Типы для других страниц можно добавить здесь
// export interface DashboardTranslations { ... }
// export interface ProfileTranslations { ... }
