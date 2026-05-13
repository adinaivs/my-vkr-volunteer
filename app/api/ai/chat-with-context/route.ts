import { NextRequest } from 'next/server';
import { openai, AI_CONFIG, SYSTEM_PROMPT } from '@/lib/openai';
import { getSession } from '@/lib/auth';
import { AI_FUNCTIONS, executeFunction } from '@/lib/ai-functions';

// Конвертируем функции в формат tools для нового API OpenAI
const AI_TOOLS = AI_FUNCTIONS.map(func => ({
  type: 'function' as const,
  function: func,
}));

// Определяем, нужны ли функции для запроса
function detectIfNeedsFunctions(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Ключевые слова, которые требуют данных из БД
  const keywords = [
    'проект',
    'категори',
    'статистик',
    'заявк',
    'мои',
    'покажи',
    'список',
    'какие',
    'сколько',
    'найди',
    'поиск',
    'предстоящ',
    'активн',
    'доступн',
  ];
  
  return keywords.some(keyword => lowerMessage.includes(keyword));
}

// Умный чат с доступом к данным платформы через Function Calling + Streaming
export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Сообщение обязательно' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Получаем сессию пользователя
    const session = await getSession();
    const userId = session?.userId;
    const userRole = session?.role;

    // Ограничиваем историю последними 5 сообщениями для экономии токенов
    const limitedHistory = conversationHistory.slice(-5);

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...limitedHistory,
      { role: 'user', content: message },
    ];

    // Первый запрос к OpenAI с функциями
    console.log('📤 Отправка запроса в OpenAI с функциями...');
    console.log('📝 Сообщение пользователя:', message);
    console.log('👤 userId:', userId, 'role:', userRole);
    console.log('🔧 Доступно функций:', AI_TOOLS.length);
    
    // Определяем, нужны ли функции для этого запроса
    const needsFunctions = detectIfNeedsFunctions(message);
    
    console.log('🤔 Нужны ли функции?', needsFunctions ? 'ДА' : 'НЕТ');
    
    let completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: messages,
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.max_tokens,
      tools: AI_TOOLS,
      tool_choice: needsFunctions ? 'required' : 'auto',
      stream: false, // Сначала без streaming для обработки функций
    });

    console.log('📥 Получен ответ от OpenAI');
    
    let responseMessage = completion.choices[0]?.message;
    const functionCallsExecuted: string[] = [];

    console.log('🔍 Проверка на вызов функций:', responseMessage?.tool_calls ? 'ДА (' + responseMessage.tool_calls.length + ')' : 'НЕТ');

    // Обрабатываем вызовы функций (может быть несколько итераций)
    let iterationCount = 0;
    const maxIterations = 5;

    while (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0 && iterationCount < maxIterations) {
      iterationCount++;

      messages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

        if (userId) {
          functionArgs.userId = userId;
        }
        if (userRole) {
          functionArgs.userRole = userRole;
        }

        console.log(`🔧 Вызов функции: ${functionName}`, functionArgs);
        functionCallsExecuted.push(functionName);

        const functionResult = await executeFunction(functionName, functionArgs);

        console.log(`✅ Результат функции ${functionName}:`, functionResult.substring(0, 200) + '...');

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: functionResult,
        });
      }

      console.log('🔄 Отправка нового запроса с результатами функций...');
      
      completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: messages,
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.max_tokens,
        tools: AI_TOOLS,
        tool_choice: 'auto',
        stream: false,
      });

      responseMessage = completion.choices[0]?.message;
      console.log('🔍 Проверка на новые вызовы функций:', responseMessage?.tool_calls ? 'ДА (' + responseMessage.tool_calls.length + ')' : 'НЕТ');
    }

    console.log('✅ Финальный ответ готов. Использовано функций:', functionCallsExecuted.length);
    console.log('🌊 Начинаем streaming ответа...');

    // Теперь делаем streaming запрос для финального ответа
    const streamCompletion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: messages,
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.max_tokens,
      stream: true, // Включаем streaming
    });

    // Создаем ReadableStream для отправки данных клиенту
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamCompletion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              // Отправляем каждый кусочек текста
              const data = JSON.stringify({ content, done: false });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          
          // Отправляем сигнал завершения
          const doneData = JSON.stringify({ 
            content: '', 
            done: true,
            functionsUsed: functionCallsExecuted,
            iterations: iterationCount,
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          controller.close();
        } catch (error) {
          console.error('❌ Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('❌ AI Chat with Context Error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Ошибка AI помощника: ' + error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
