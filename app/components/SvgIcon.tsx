'use client';

/** Рендерит SVG иконку из сырого SVG-кода. Если не SVG — показывает текст (обратная совместимость). */
export function SvgIcon({ iconKey, className = 'w-6 h-6' }: { iconKey: string; className?: string }) {
  const trimmed = iconKey?.trim() || '';
  if (trimmed.startsWith('<')) {
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  return <span className="text-xl leading-none">{trimmed || '?'}</span>;
}
