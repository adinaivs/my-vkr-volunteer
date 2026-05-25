'use client';

import { SvgIcon } from '@/app/components/SvgIcon';

/** Поле ввода SVG иконки с превью */
export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-start">
        {/* Превью */}
        <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200 flex-shrink-0 text-gray-700 overflow-hidden">
          {value?.trim() ? (
            <SvgIcon iconKey={value} className="w-7 h-7" />
          ) : (
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Textarea для SVG кода */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={'<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">\n  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="..." />\n</svg>'}
          rows={3}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00CC00] resize-none"
        />
      </div>
      <p className="text-xs text-gray-400">Вставьте SVG-код иконки. Иконки можно взять на <a href="https://heroicons.com" target="_blank" rel="noreferrer" className="text-[#00CC00] hover:underline">heroicons.com</a> или <a href="https://lucide.dev" target="_blank" rel="noreferrer" className="text-[#00CC00] hover:underline">lucide.dev</a></p>
    </div>
  );
}
