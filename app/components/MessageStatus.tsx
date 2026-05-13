interface MessageStatusProps {
  message: {
    senderId: string;
    deliveredTo?: string[];
    readBy?: string[];
  };
  currentUserId: string;
  otherUserId?: string; // Для личных чатов
  chatMembers?: Array<{ id: string }>; // Для групповых чатов
}

export default function MessageStatus({ message, currentUserId, otherUserId, chatMembers }: MessageStatusProps) {
  // Показываем статус только для своих сообщений
  if (message.senderId !== currentUserId) {
    return null;
  }

  const deliveredTo = message.deliveredTo || [];
  const readBy = message.readBy || [];

  // Для личных чатов
  if (otherUserId) {
    const isDelivered = deliveredTo.includes(otherUserId);
    const isRead = readBy.includes(otherUserId);

    if (isRead) {
      // Прочитано - две зеленые галочки
      return (
        <div className="flex items-center gap-0.5">
          <svg className="w-4 h-4 text-[#00CC00]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
          <svg className="w-4 h-4 text-[#00CC00] -ml-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
        </div>
      );
    } else if (isDelivered) {
      // Доставлено - две серые галочки
      return (
        <div className="flex items-center gap-0.5">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
          <svg className="w-4 h-4 text-gray-400 -ml-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
        </div>
      );
    } else {
      // Отправлено - одна серая галочка
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
        </svg>
      );
    }
  }

  // Для групповых чатов
  if (chatMembers) {
    const otherMembers = chatMembers.filter(m => m.id !== currentUserId);
    const totalOthers = otherMembers.length;
    
    if (totalOthers === 0) {
      return null;
    }

    const deliveredCount = otherMembers.filter(m => deliveredTo.includes(m.id)).length;
    const readCount = otherMembers.filter(m => readBy.includes(m.id)).length;

    // Все прочитали - две зеленые галочки
    if (readCount === totalOthers) {
      return (
        <div className="flex items-center gap-0.5">
          <svg className="w-4 h-4 text-[#00CC00]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
          <svg className="w-4 h-4 text-[#00CC00] -ml-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
        </div>
      );
    }
    // Хотя бы один прочитал - две серые галочки (или одна зеленая + одна серая)
    else if (readCount > 0) {
      return (
        <div className="flex items-center gap-0.5">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
          <svg className="w-4 h-4 text-gray-400 -ml-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
        </div>
      );
    }
    // Всем доставлено - две серые галочки
    else if (deliveredCount === totalOthers) {
      return (
        <div className="flex items-center gap-0.5">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
          <svg className="w-4 h-4 text-gray-400 -ml-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
        </div>
      );
    }
    // Отправлено - одна серая галочка
    else {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
        </svg>
      );
    }
  }

  return null;
}
