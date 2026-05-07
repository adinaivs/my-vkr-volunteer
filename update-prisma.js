const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Обновление Prisma клиента...');

try {
  // Удаляем старый клиент
  const clientPath = path.join(__dirname, 'node_modules', '.prisma', 'client');
  if (fs.existsSync(clientPath)) {
    console.log('📦 Удаление старого клиента...');
    fs.rmSync(clientPath, { recursive: true, force: true });
  }

  // Генерируем новый клиент
  console.log('⚙️  Генерация нового клиента...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('✅ Prisma клиент успешно обновлен!');
  console.log('🚀 Теперь перезапустите dev сервер: npm run dev');
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}
