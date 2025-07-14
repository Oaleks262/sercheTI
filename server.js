const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Налаштування сервера
const PORT = 1609;
const HOST = '0.0.0.0';

// MIME типи для різних файлів
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Функція для обробки запитів
function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Якщо запит до кореневої директорії, повертаємо index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Повний шлях до файлу
  const filePath = path.join(__dirname, pathname);
  
  // Перевіряємо чи файл існує
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // Файл не знайдено - повертаємо 404
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - Сторінка не знайдена</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #dc3545; }
            p { color: #666; }
            a { color: #007bff; text-decoration: none; }
          </style>
        </head>
        <body>
          <h1>404 - Сторінка не знайдена</h1>
          <p>Запитуваний файл не існує: ${pathname}</p>
          <a href="/">← Повернутись на головну</a>
        </body>
        </html>
      `);
      return;
    }
    
    // Отримуємо розширення файлу
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'text/plain';
    
    // Читаємо та відправляємо файл
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>500 - Помилка сервера</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #dc3545; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <h1>500 - Внутрішня помилка сервера</h1>
            <p>Не вдалося прочитати файл: ${pathname}</p>
          </body>
          </html>
        `);
        return;
      }
      
      // Встановлюємо заголовки для CORS (дозволяємо запити з будь-якого домену)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Відправляємо файл
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
}

// Створюємо HTTP сервер
const server = http.createServer(handleRequest);

// Запускаємо сервер
server.listen(PORT, HOST, () => {
  console.log(`🚀 Сервер запущено на http://${HOST}:${PORT}`);
  console.log(`📊 Аналітика товарів доступна за адресою: http://localhost:${PORT}`);
  console.log(`🔧 Для зупинки сервера натисніть Ctrl+C`);
});

// Обробка помилок сервера
server.on('error', (err) => {
  console.error('❌ Помилка сервера:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Порт ${PORT} вже використовується. Спробуйте інший порт.`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Отримано сигнал зупинки сервера...');
  server.close(() => {
    console.log('✅ Сервер успішно зупинено.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Отримано сигнал завершення...');
  server.close(() => {
    console.log('✅ Сервер успішно завершено.');
    process.exit(0);
  });
});