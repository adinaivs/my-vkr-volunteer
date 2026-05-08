// Хелперы для работы с категориями и переводами

export function getCategoryInclude(locale: string = 'ru') {
  return {
    category: {
      include: {
        translations: {
          where: {
            locale: locale as 'ru' | 'kg'
          }
        }
      }
    }
  };
}

export function formatCategoryWithTranslation(category: any) {
  if (!category) return null;
  
  return {
    id: category.id,
    slug: category.slug,
    icon: category.icon,
    name: category.translations?.[0]?.name || category.slug
  };
}

export function getSkillInclude(locale: string = 'ru') {
  return {
    skill: {
      include: {
        translations: {
          where: {
            locale: locale as 'ru' | 'kg'
          }
        }
      }
    }
  };
}

export function formatSkillWithTranslation(skill: any) {
  if (!skill) return null;
  
  return {
    id: skill.id,
    name: skill.translations?.[0]?.name || skill.name
  };
}