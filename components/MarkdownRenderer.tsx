'use client';

// Простой компонент для рендеринга Markdown
export function MarkdownRenderer({ content }: { content: string }) {
  // Проверяем, содержит ли контент Markdown таблицу
  const hasTable = content.includes('|') && content.includes('---');

  if (!hasTable) {
    // Если нет таблицы, обрабатываем как обычный текст с Markdown форматированием
    return <div className="whitespace-pre-wrap">{parseMarkdown(content)}</div>;
  }

  // Разбиваем контент на части (текст, таблицы, разделители)
  const parts = content.split(/(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)+|---|###[^\n]+|\*\*[^*]+\*\*)/g);

  return (
    <div>
      {parts.map((part, index) => {
        // Проверяем, является ли часть разделителем
        if (part === '---') {
          return <hr key={index} className="my-4 border-gray-300" />;
        }
        
        // Проверяем, является ли часть заголовком ### 
        if (part.startsWith('###')) {
          const text = part.slice(3).trim();
          return <h3 key={index} className="font-bold text-base mb-2 mt-3 text-gray-800">{text}</h3>;
        }
        
        // Проверяем, является ли часть жирным текстом
        if (part.startsWith('**') && part.endsWith('**')) {
          const text = part.slice(2, -2);
          return <strong key={index} className="font-bold text-gray-800">{text}</strong>;
        }
        
        // Проверяем, является ли часть таблицей
        if (part.includes('|') && part.includes('---')) {
          return <MarkdownTable key={index} markdown={part} />;
        }
        
        // Обычный текст с обработкой Markdown
        if (part.trim()) {
          return (
            <div key={index} className="whitespace-pre-wrap mb-1">
              {parseMarkdown(part)}
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
}

// Функция для парсинга простого Markdown (жирный текст, курсив)
function parseMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  
  // Регулярное выражение для поиска **текст** (жирный)
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Добавляем текст до совпадения
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }
    
    // Добавляем жирный текст
    parts.push(
      <strong key={match.index} className="font-semibold text-gray-800">
        {match[1]}
      </strong>
    );
    
    currentIndex = match.index + match[0].length;
  }
  
  // Добавляем оставшийся текст
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

// Компонент для рендеринга Markdown таблицы
function MarkdownTable({ markdown }: { markdown: string }) {
  const lines = markdown.trim().split('\n').filter(line => line.trim());
  
  if (lines.length < 2) return <pre>{markdown}</pre>;

  // Первая строка - заголовки
  const headers = lines[0]
    .split('|')
    .map(h => h.trim())
    .filter(h => h);

  // Вторая строка - разделитель (пропускаем)
  // Остальные строки - данные
  const rows = lines.slice(2).map(line =>
    line
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell)
  );

  return (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border-collapse border border-gray-300 text-sm bg-white rounded-lg overflow-hidden shadow-sm">
        <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700"
              >
                {cleanMarkdown(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, j) => (
                <td 
                  key={j} 
                  className={`border border-gray-300 px-4 py-2 ${j === 0 ? 'font-medium text-gray-700' : 'text-gray-600'}`}
                >
                  {cleanMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Функция для очистки Markdown символов из текста
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '') // Убираем **
    .replace(/\*/g, '')   // Убираем *
    .replace(/###/g, '')  // Убираем ###
    .trim();
}
