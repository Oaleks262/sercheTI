#!/bin/bash

# Скрипт для запуску сервера аналітики товарів
# Порт: 1609

echo "🚀 Запуск сервера аналітики товарів..."
echo "📊 Порт: 1609"
echo "🌐 URL: http://localhost:1609"
echo ""

# Перевіряємо чи встановлено Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js не встановлено. Будь ласка, встановіть Node.js версії 14 або вище."
    exit 1
fi

# Перевіряємо версію Node.js
NODE_VERSION=$(node --version | cut -d'v' -f2)
echo "✅ Node.js версія: $NODE_VERSION"

# Перевіряємо чи порт 1609 вільний
if lsof -Pi :1609 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Порт 1609 вже використовується!"
    echo "🔍 Процес, що використовує порт:"
    lsof -Pi :1609 -sTCP:LISTEN
    echo ""
    echo "💡 Для зупинки процесу використайте: kill -9 <PID>"
    echo "🔄 Або виберіть інший порт у файлі server.js"
    exit 1
fi

# Запускаємо сервер
echo "🏃 Запуск сервера..."
node server.js