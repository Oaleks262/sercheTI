/**
 * Утилітарні функції для парсера товарів
 */

/**
 * Перевіряє чи є рядок валідним URL
 * @param {string} string - рядок для перевірки
 * @returns {boolean}
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Завантажує контент сторінки через CORS проксі
 * @param {string} url - URL сторінки для завантаження
 * @returns {Promise<string>} - HTML контент сторінки
 */
async function fetchPageContent(url) {
    const proxies = CORS_PROXIES.map(proxy => {
        if (proxy.includes('allorigins')) {
            return `${proxy}${encodeURIComponent(url)}`;
        }
        return `${proxy}${url}`;
    });
    
    for (const proxyUrl of proxies) {
        try {
            console.log(`Спроба завантаження через: ${proxyUrl}`);
            const response = await fetch(proxyUrl);
            
            if (response.ok) {
                let data;
                
                // Для allorigins API потрібно парсити JSON
                if (proxyUrl.includes('allorigins')) {
                    const jsonData = await response.json();
                    data = jsonData.contents;
                } else {
                    data = await response.text();
                }
                
                if (data && data.length > 1000) { // Перевіряємо що отримали справжню сторінку
                    console.log(`Успішно завантажено через: ${proxyUrl}`);
                    return data;
                }
            }
        } catch (error) {
            console.log(`Проксі ${proxyUrl} не працює:`, error.message);
            continue;
        }
    }
    
    throw new Error('Не вдалося завантажити сторінку через жоден з проксі серверів');
}


/**
 * Очищає текст від HTML тегів та зайвих пробілів
 * @param {string} html - HTML рядок
 * @returns {string} - очищений текст
 */
function stripHtml(html) {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Фільтрує зображення, виключаючи іконки, логотипи тощо
 * @param {string} src - URL зображення
 * @returns {boolean} - чи є зображення фотографією товару
 */
function isProductImage(src) {
    if (!src || src.includes('data:') || src.includes('base64')) {
        return false;
    }
    
    const filename = src.toLowerCase();
    const excludeKeywords = ANALYSIS_CONFIG.images.excludeKeywords;
    const allowedExtensions = ANALYSIS_CONFIG.images.allowedExtensions;
    
    // Перевіряємо чи не містить заборонені ключові слова
    for (const keyword of excludeKeywords) {
        if (filename.includes(keyword)) {
            return false;
        }
    }
    
    // Перевіряємо чи має дозволене розширення
    return allowedExtensions.some(ext => filename.includes(ext));
}

/**
 * Підраховує слова в тексті
 * @param {string} text - текст для підрахунку
 * @returns {number} - кількість слів
 */
function countWords(text) {
    return stripHtml(text)
        .split(/\s+/)
        .filter(word => word.length > 0).length;
}

/**
 * Підраховує параграфи в тексті
 * @param {string} text - текст для підрахунку
 * @returns {number} - кількість параграфів
 */
function countParagraphs(text) {
    const sentences = stripHtml(text).split(/\.\s+/).filter(s => s.trim().length > 0);
    return Math.max(1, sentences.length);
}

/**
 * Визначає статус на основі відсотка завершеності
 * @param {number} percentage - відсоток завершеності (0-100)
 * @param {Object} thresholds - пороги для визначення статусу
 * @returns {string} - статус (success, warning, error)
 */
function getStatusByPercentage(percentage, thresholds = {}) {
    const { error = 50, warning = 80 } = thresholds;
    
    if (percentage >= warning) return STATUS_TYPES.SUCCESS;
    if (percentage >= error) return STATUS_TYPES.WARNING;
    return STATUS_TYPES.ERROR;
}

/**
 * Визначає статус для кількості елементів
 * @param {number} count - кількість елементів
 * @param {Object} thresholds - пороги для визначення статусу
 * @returns {string} - статус (success, warning, error)
 */
function getStatusByCount(count, thresholds = {}) {
    const { error = 0, warning = 1 } = thresholds;
    
    if (count > warning) return STATUS_TYPES.SUCCESS;
    if (count > error) return STATUS_TYPES.WARNING;
    return STATUS_TYPES.ERROR;
}

/**
 * Форматує число з розділювачами тисяч
 * @param {number} num - число для форматування
 * @returns {string} - відформатоване число
 */
function formatNumber(num) {
    return num.toLocaleString('uk-UA');
}

/**
 * Створює унікальний ідентифікатор
 * @returns {string} - унікальний ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Затримка виконання
 * @param {number} ms - кількість мілісекунд
 * @returns {Promise}
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Логування з часовою міткою
 * @param {string} message - повідомлення для логування
 * @param {string} level - рівень логування (info, warn, error)
 */
function log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString('uk-UA');
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
        case 'warn':
            console.warn(`${prefix} ${message}`);
            break;
        case 'error':
            console.error(`${prefix} ${message}`);
            break;
        default:
            console.log(`${prefix} ${message}`);
    }
}

/**
 * Безпечне отримання значення з об'єкта
 * @param {Object} obj - об'єкт
 * @param {string} path - шлях до значення (напр. 'a.b.c')
 * @param {*} defaultValue - значення за замовчуванням
 * @returns {*} - значення або значення за замовчуванням
 */
function safeGet(obj, path, defaultValue = null) {
    try {
        return path.split('.').reduce((current, key) => current[key], obj) || defaultValue;
    } catch {
        return defaultValue;
    }
}