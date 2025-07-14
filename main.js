/**
 * Головний файл додатку - точка входу
 */

// Глобальні змінні
let currentAnalysis = null;
let currentUrl = '';

/**
 * Ініціалізація додатку
 */
document.addEventListener('DOMContentLoaded', function() {
    log('Ініціалізація додатку', 'info');
    
    // Ініціалізуємо UI
    initializeUI();
    
    // Додаємо обробники подій
    setupEventListeners();
    
    // Перевіряємо підтримку браузера
    checkBrowserSupport();
    
    log('Додаток готовий до роботи', 'info');
});

/**
 * Налаштування обробників подій
 */
function setupEventListeners() {
    // Обробник для Enter в полі URL
    const urlInput = document.getElementById('urlInput');
    if (urlInput) {
        urlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                analyzeUrl();
            }
        });
    }
    
    // Обробник для зміни категорії
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            if (currentAnalysis && this.value) {
                log(`Категорія змінена на: ${this.value}`, 'info');
                showNotification('Категорія змінена. Перезапустіть аналіз для оновлення результатів.', 'info');
            }
        });
    }
}

/**
 * Головна функція аналізу URL
 */
async function analyzeUrl() {
    const urlInput = document.getElementById('urlInput');
    const categorySelect = document.getElementById('categorySelect');
    
    if (!urlInput) {
        log('Елемент urlInput не знайдено', 'error');
        return;
    }
    
    const url = urlInput.value.trim();
    const selectedCategory = categorySelect ? categorySelect.value : '';
    
    // Валідація URL
    if (!url) {
        showNotification('Будь ласка, введіть посилання на сторінку товару', 'warning');
        urlInput.focus();
        return;
    }
    
    if (!isValidUrl(url)) {
        showNotification('Будь ласка, введіть коректне посилання', 'error');
        urlInput.focus();
        return;
    }
    
    // Зберігаємо URL для експорту
    currentUrl = url;
    
    // Показуємо індикатор завантаження
    showLoading(true);
    
    try {
        log(`Початок аналізу URL: ${url}`, 'info');
        
        // Завантажуємо сторінку
        showNotification('Завантажуємо сторінку...', 'info', 2000);
        const htmlContent = await fetchPageContent(url);
        
        // Визначаємо категорію
        const detectedCategory = selectedCategory || detectCategory(htmlContent);
        log(`Використовуємо категорію: ${detectedCategory}`, 'info');
        
        // Оновлюємо селект категорії, якщо вона була визначена автоматично
        if (!selectedCategory && categorySelect) {
            categorySelect.value = detectedCategory;
        }
        
        // Аналізуємо сторінку
        showNotification('Аналізуємо контент...', 'info', 2000);
        const analysis = await analyzePage(htmlContent, detectedCategory);
        
        // Зберігаємо результати
        currentAnalysis = analysis;
        
        // Показуємо результати
        displayResults(analysis, detectedCategory);
        
        // Показуємо успішне повідомлення
        showNotification('Аналіз завершено успішно!', 'success');
        
        log('Аналіз завершено успішно', 'info');
        
    } catch (error) {
        log(`Помилка під час аналізу: ${error.message}`, 'error');
        showError(`Помилка завантаження сторінки: ${error.message}`);
        showNotification('Помилка під час аналізу', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Повторний аналіз з тією ж URL але іншою категорією
 */
async function reanalyzeWithCategory(newCategory) {
    if (!currentUrl) {
        showNotification('Спочатку проведіть аналіз сторінки', 'warning');
        return;
    }
    
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.value = newCategory;
    }
    
    await analyzeUrl();
}

/**
 * Експорт результатів
 */
function exportCurrentResults() {
    if (!currentAnalysis) {
        showNotification('Немає результатів для експорту', 'warning');
        return;
    }
    
    exportResults(currentAnalysis, currentUrl);
}

/**
 * Очищення форми та результатів
 */
function clearAll() {
    // Очищуємо поля
    const urlInput = document.getElementById('urlInput');
    const categorySelect = document.getElementById('categorySelect');
    const results = document.getElementById('results');
    
    if (urlInput) {
        urlInput.value = '';
        urlInput.focus();
    }
    
    if (categorySelect) {
        categorySelect.value = '';
    }
    
    if (results) {
        results.style.display = 'none';
    }
    
    // Скидаємо кнопку
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
        analyzeBtn.textContent = '🔍 Аналізувати сторінку';
    }
    
    // Очищуємо глобальні змінні
    currentAnalysis = null;
    currentUrl = '';
    
    showNotification('Форму очищено', 'info');
    log('Форму та результати очищено', 'info');
}

/**
 * Показати детальну інформацію про аналіз
 */
function showAnalysisDetails() {
    if (!currentAnalysis) {
        showNotification('Немає даних для показу', 'warning');
        return;
    }
    
    const details = `
        <h3>📊 Детальна статистика</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div>
                <h4>🖼️ Фотографії</h4>
                <ul>
                    <li>Знайдено: ${currentAnalysis.images.total}</li>
                    <li>Статус: ${currentAnalysis.images.status}</li>
                    <li>Рекомендації: ${currentAnalysis.images.total < ANALYSIS_CONFIG.images.minRecommended ? 'Додати більше фото' : 'Достатньо'}</li>
                </ul>
            </div>
            <div>
                <h4>⚙️ Характеристики</h4>
                <ul>
                    <li>Заповнено: ${currentAnalysis.specs.found.length}/${currentAnalysis.specs.total}</li>
                    <li>Відсоток: ${currentAnalysis.specs.completeness}%</li>
                    <li>Статус: ${currentAnalysis.specs.status}</li>
                </ul>
            </div>
        </div>
        
        <h4>📝 Опис товару</h4>
        <ul>
            <li>Слів: ${formatNumber(currentAnalysis.description.words)}</li>
            <li>Параграфів: ${currentAnalysis.description.paragraphs}</li>
            <li>Зображень в описі: ${currentAnalysis.description.images}</li>
            <li>Заголовків: ${currentAnalysis.description.headings}</li>
        </ul>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
            <button onclick="exportCurrentResults()" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                📥 Експортувати JSON
            </button>
            <button onclick="document.getElementById('details-modal').remove()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                Закрити
            </button>
        </div>
    `;
    
    showModal('Детальна інформація про аналіз', details);
}

/**
 * Перевірка підтримки браузера
 */
function checkBrowserSupport() {
    const unsupportedFeatures = [];
    
    // Перевіряємо fetch API
    if (!window.fetch) {
        unsupportedFeatures.push('Fetch API');
    }
    
    // Перевіряємо URL API
    if (!window.URL) {
        unsupportedFeatures.push('URL API');
    }
    
    // Перевіряємо Promise
    if (!window.Promise) {
        unsupportedFeatures.push('Promises');
    }
    
    // Перевіряємо async/await (непрямо через try/catch)
    try {
        new Function('async () => {}');
    } catch (e) {
        unsupportedFeatures.push('Async/Await');
    }
    
    if (unsupportedFeatures.length > 0) {
        const message = `Ваш браузер не підтримує: ${unsupportedFeatures.join(', ')}. Будь ласка, оновіть браузер.`;
        showNotification(message, 'error', 10000);
        log(`Браузер не підтримує: ${unsupportedFeatures.join(', ')}`, 'error');
    } else {
        log('Браузер повністю підтримується', 'info');
    }
}

/**
 * Обробка помилок на рівні додатку
 */
window.addEventListener('error', function(event) {
    log(`Глобальна помилка: ${event.error?.message || event.message}`, 'error');
    showNotification('Виникла неочікувана помилка. Перезавантажте сторінку.', 'error');
});

/**
 * Обробка необроблених Promise rejection
 */
window.addEventListener('unhandledrejection', function(event) {
    log(`Необроблена помилка Promise: ${event.reason}`, 'error');
    showNotification('Виникла помилка мережі або обробки даних.', 'error');
    event.preventDefault();
});

/**
 * Функції для консольного API (для налагодження)
 */
window.ParserAPI = {
    // Публічні методи для налагодження
    analyze: analyzeUrl,
    clear: clearAll,
    export: exportCurrentResults,
    details: showAnalysisDetails,
    reanalyze: reanalyzeWithCategory,
    
    // Геттери для отримання поточного стану
    get currentAnalysis() { return currentAnalysis; },
    get currentUrl() { return currentUrl; },
    get config() { return ANALYSIS_CONFIG; },
    
    // Утилітарні функції
    utils: {
        isValidUrl,
        detectCategory,
        formatNumber,
        log
    }
};

// Логування готовності API
log('Parser API доступний через window.ParserAPI', 'info');