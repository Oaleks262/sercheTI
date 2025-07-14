/**
 * Модуль для аналізу сторінок товарів
 */

/**
 * Основна функція аналізу сторінки
 * @param {string} html - HTML контент сторінки
 * @param {string} category - категорія товару
 * @returns {Object} - результати аналізу
 */
async function analyzePage(html, category) {
    log('Початок аналізу сторінки', 'info');
    
    try {
        const results = {
            images: analyzeImages(html),
            specs: analyzeSpecs(html, category),
            description: analyzeDescription(html),
            category: category,
            timestamp: new Date().toISOString()
        };
        
        log('Аналіз завершено успішно', 'info');
        return results;
    } catch (error) {
        log(`Помилка під час аналізу: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Аналізує фотографії товару
 * @param {string} html - HTML контент
 * @returns {Object} - результати аналізу фотографій
 */
function analyzeImages(html) {
    log('Аналіз фотографій...', 'info');
    
    const images = [];
    let match;
    
    // Спочатку шукаємо основні фотографії в div.js-product-modal
    const modalImages = extractModalImages(html);
    images.push(...modalImages);
    
    // Якщо не знайшли в модальних вікнах, шукаємо всі зображення
    if (images.length === 0) {
        const imgRegex = REGEX_PATTERNS.images;
        while ((match = imgRegex.exec(html)) !== null) {
            const src = match[1];
            if (isProductImage(src)) {
                images.push(src);
            }
        }
    }
    
    // Видаляємо дублікати
    const uniqueImages = [...new Set(images)];
    
    // Фільтруємо тільки товарні фотографії
    const productImages = uniqueImages.filter(src => {
        // Додаткова фільтрація для більш точного визначення
        const url = src.toLowerCase();
        return !url.includes('thumbnail') && 
               !url.includes('preview') && 
               !url.includes('_small') &&
               (url.includes('product') || url.includes('item') || url.match(/\d{6,}/)); // Зазвичай товарні фото мають довгі числові ID
    });
    
    const totalImages = productImages.length;
    const minRecommended = ANALYSIS_CONFIG.images.minRecommended;
    
    // Визначаємо статус
    let status;
    if (totalImages === 0) {
        status = STATUS_TYPES.ERROR;
    } else if (totalImages < minRecommended) {
        status = STATUS_TYPES.WARNING;
    } else {
        status = STATUS_TYPES.SUCCESS;
    }
    
    log(`Знайдено ${totalImages} фотографій товару`, 'info');
    
    return {
        total: totalImages,
        status: status,
        images: productImages.slice(0, 10), // Показуємо перші 10
        message: generateImageMessage(totalImages, status)
    };
}

/**
 * Витягує фотографії з модальних вікон продукту
 * @param {string} html - HTML контент
 * @returns {Array} - масив URL фотографій
 */
function extractModalImages(html) {
    const images = [];
    
    // Шукаємо div з класом js-product-modal
    const modalRegex = /<div[^>]*class="[^"]*js-product-modal[^"]*"[^>]*>.*?<\/div>/gis;
    const modalMatches = html.match(modalRegex) || [];
    
    modalMatches.forEach(modalDiv => {
        // В кожному модальному div'і шукаємо img теги
        const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
        let imgMatch;
        
        while ((imgMatch = imgRegex.exec(modalDiv)) !== null) {
            const src = imgMatch[1];
            if (src && src.startsWith('http')) {
                images.push(src);
            }
        }
    });
    
    log(`Знайдено ${images.length} фотографій в модальних вікнах`, 'info');
    return images;
}

/**
 * Аналізує характеристики товару
 * @param {string} html - HTML контент
 * @param {string} category - категорія товару
 * @returns {Object} - результати аналізу характеристик
 */
function analyzeSpecs(html, category) {
    log(`Аналіз характеристик для категорії: ${category}`, 'info');
    
    const requiredList = REQUIRED_SPECS[category] || [];
    const foundSpecs = [];
    const missingSpecs = [];
    
    // Збираємо весь текст з таблиць та блоків характеристик
    let allSpecsText = '';
    
    // Аналізуємо таблиці
    const tables = html.match(REGEX_PATTERNS.tables) || [];
    tables.forEach(table => {
        allSpecsText += stripHtml(table) + ' ';
    });
    
    // Аналізуємо блоки з характеристиками
    const specsDivs = html.match(REGEX_PATTERNS.specs) || [];
    specsDivs.forEach(div => {
        allSpecsText += stripHtml(div) + ' ';
    });
    
    // Також шукаємо в загальному контенті
    const generalSpecs = extractSpecsFromGeneral(html);
    allSpecsText += generalSpecs + ' ';
    
    // Перевіряємо наявність обов'язкових характеристик
    requiredList.forEach(required => {
        const found = checkSpecPresence(allSpecsText, required);
        if (found) {
            foundSpecs.push(required);
        } else {
            missingSpecs.push(required);
        }
    });
    
    const totalRequired = requiredList.length;
    const completeness = totalRequired > 0 ? Math.round((foundSpecs.length / totalRequired) * 100) : 100;
    
    // Визначаємо статус
    const status = getStatusByPercentage(completeness, {
        error: ANALYSIS_CONFIG.specs.minCompleteness,
        warning: ANALYSIS_CONFIG.specs.warningThreshold
    });
    
    log(`Характеристики: ${foundSpecs.length}/${totalRequired} (${completeness}%)`, 'info');
    
    return {
        found: foundSpecs,
        missing: missingSpecs,
        completeness: completeness,
        status: status,
        total: totalRequired,
        message: generateSpecsMessage(foundSpecs.length, totalRequired, completeness)
    };
}

/**
 * Аналізує опис товару
 * @param {string} html - HTML контент
 * @returns {Object} - результати аналізу опису
 */
function analyzeDescription(html) {
    log('Аналіз опису товару...', 'info');
    
    let descriptionContent = '';
    let ptovarCount = 0;
    let descriptionImages = 0;
    
    // Спочатку шукаємо блок section-about-text-block
    const aboutTextBlock = extractAboutTextBlock(html);
    if (aboutTextBlock.content) {
        descriptionContent = aboutTextBlock.content;
        ptovarCount = aboutTextBlock.ptovarCount;
        descriptionImages = aboutTextBlock.imagesCount;
    }
    
    // Якщо не знайшли спеціальний блок, шукаємо блоки з описом через регулярні вирази
    if (!descriptionContent.trim()) {
        const descMatches = html.match(REGEX_PATTERNS.description) || [];
        descMatches.forEach(match => {
            descriptionContent += match + ' ';
        });
    }
    
    // Якщо не знайшли через класи, шукаємо параграфи
    if (!descriptionContent.trim()) {
        const paragraphs = [];
        let match;
        const pRegex = REGEX_PATTERNS.paragraphs;
        
        while ((match = pRegex.exec(html)) !== null) {
            const text = stripHtml(match[1]);
            if (text.length > 50) { // Фільтруємо короткі параграфи
                paragraphs.push(text);
            }
        }
        descriptionContent = paragraphs.join(' ');
    }
    
    // Аналізуємо контент
    const wordCount = countWords(descriptionContent);
    const paragraphCount = ptovarCount > 0 ? ptovarCount : countParagraphs(descriptionContent);
    
    // Підраховуємо зображення в описі
    const imagesInDesc = descriptionImages > 0 ? descriptionImages : (descriptionContent.match(REGEX_PATTERNS.imagesInContent) || []).length;
    
    // Підраховуємо заголовки
    const headingCount = countHeadings(html);
    
    // Визначаємо статус
    let status;
    const minWords = ANALYSIS_CONFIG.description.minWords;
    const recommendedWords = ANALYSIS_CONFIG.description.recommendedWords;
    
    if (wordCount === 0) {
        status = STATUS_TYPES.ERROR;
    } else if (wordCount < minWords) {
        status = STATUS_TYPES.ERROR;
    } else if (wordCount < recommendedWords) {
        status = STATUS_TYPES.WARNING;
    } else {
        status = STATUS_TYPES.SUCCESS;
    }
    
    log(`Опис: ${wordCount} слів, ${paragraphCount} параграфів, ${imagesInDesc} зображень`, 'info');
    
    return {
        paragraphs: paragraphCount,
        images: imagesInDesc,
        words: wordCount,
        headings: headingCount,
        status: status,
        message: generateDescriptionMessage(wordCount, paragraphCount, status)
    };
}

/**
 * Витягує контент з блоку section-about-text-block
 * @param {string} html - HTML контент
 * @returns {Object} - об'єкт з контентом, кількістю p.ptovar та зображень
 */
function extractAboutTextBlock(html) {
    // Шукаємо блок div.section-about-text-block
    const aboutBlockRegex = /<div[^>]*class="[^"]*section-about-text-block[^"]*"[^>]*>(.*?)<\/div>/gis;
    const aboutMatch = html.match(aboutBlockRegex);
    
    if (!aboutMatch || !aboutMatch[0]) {
        return { content: '', ptovarCount: 0, imagesCount: 0 };
    }
    
    const blockContent = aboutMatch[0];
    
    // Підраховуємо параграфи p.ptovar
    const ptovarRegex = /<p[^>]*class="[^"]*ptovar[^"]*"[^>]*>.*?<\/p>/gi;
    const ptovarMatches = blockContent.match(ptovarRegex) || [];
    const ptovarCount = ptovarMatches.length;
    
    // Підраховуємо зображення в стилі <p style="text-align: center;"><img...></p>
    // Спочатку знаходимо всі <p> теги з text-align: center
    const centeredPRegex = /<p[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>[\s\S]*?<\/p>/gi;
    const centeredParagraphs = blockContent.match(centeredPRegex) || [];
    
    // Потім у кожному з них шукаємо <img> теги
    let imagesCount = 0;
    centeredParagraphs.forEach(paragraph => {
        const imgInParagraph = paragraph.match(/<img[^>]+>/gi) || [];
        imagesCount += imgInParagraph.length;
    });
    
    // Витягуємо текстовий контент
    const textContent = stripHtml(blockContent);
    
    log(`Знайдено блок section-about-text-block: ${ptovarCount} параграфів p.ptovar, ${imagesCount} зображень`, 'info');
    
    return {
        content: textContent,
        ptovarCount: ptovarCount,
        imagesCount: imagesCount
    };
}

/**
 * Витягує характеристики з загального контенту
 * @param {string} html - HTML контент
 * @returns {string} - знайдені характеристики
 */
function extractSpecsFromGeneral(html) {
    const specPatterns = [
        /(?:розмір|размер|диагональ|диагонал)[^<]*?(\d+[,.]?\d*)[^<]*?(?:дюйм|"|інч|inch)/gi,
        /(?:пам'ять|память|ram|rom)[^<]*?(\d+)[^<]*?(?:гб|gb|мб|mb)/gi,
        /(?:процесор|процессор|cpu)[^<]*?([^<]{10,50})/gi,
        /(?:батарея|аккумулятор|battery)[^<]*?(\d+)[^<]*?(?:мач|mah)/gi
    ];
    
    let extractedSpecs = '';
    specPatterns.forEach(pattern => {
        const matches = html.match(pattern) || [];
        extractedSpecs += matches.join(' ') + ' ';
    });
    
    return extractedSpecs;
}

/**
 * Перевіряє наявність характеристики в тексті
 * @param {string} text - текст для пошуку
 * @param {string} spec - характеристика для пошуку
 * @returns {boolean} - чи знайдена характеристика
 */
function checkSpecPresence(text, spec) {
    const lowerText = text.toLowerCase();
    const lowerSpec = spec.toLowerCase();
    
    // Простий пошук входження
    if (lowerText.includes(lowerSpec)) {
        return true;
    }
    
    // Пошук з альтернативними назвами
    const alternatives = getSpecAlternatives(spec);
    return alternatives.some(alt => lowerText.includes(alt.toLowerCase()));
}

/**
 * Повертає альтернативні назви для характеристики
 * @param {string} spec - назва характеристики
 * @returns {Array} - масив альтернативних назв
 */
function getSpecAlternatives(spec) {
    const alternatives = {
        'Диагональ экрана': ['диагональ', 'розмір екрана', 'розмір дисплея', 'размер экрана'],
        'Разрешение экрана': ['розділення', 'разрешение', 'роздільна здатність'],
        'Оперативная память': ['озп', 'ram', 'оперативна пам\'ять'],
        'Встроенная память': ['пзп', 'rom', 'внутрішня пам\'ять', 'накопичувач'],
        'Процессор': ['cpu', 'чіп', 'процесор'],
        'Операционная система': ['ос', 'android', 'ios', 'windows'],
        'Емкость аккумулятора': ['батарея', 'акумулятор', 'mah', 'мач'],
        'Основная камера': ['камера', 'фотокамера', 'мп', 'mp']
    };
    
    return alternatives[spec] || [spec];
}

/**
 * Підраховує заголовки в HTML
 * @param {string} html - HTML контент
 * @returns {number} - кількість заголовків
 */
function countHeadings(html) {
    const headingRegex = /<h[1-6][^>]*>.*?<\/h[1-6]>/gi;
    const headings = html.match(headingRegex) || [];
    return headings.length;
}

/**
 * Генерує повідомлення для фотографій
 * @param {number} count - кількість фотографій
 * @param {string} status - статус
 * @returns {string} - повідомлення
 */
function generateImageMessage(count, status) {
    if (count === 0) {
        return 'Фотографії товару не знайдено';
    } else if (status === STATUS_TYPES.WARNING) {
        return `Знайдено ${count} фотографій. Рекомендується мати принаймні ${ANALYSIS_CONFIG.images.minRecommended}`;
    } else {
        return `Знайдено ${count} якісних фотографій товару`;
    }
}

/**
 * Генерує повідомлення для характеристик
 * @param {number} found - кількість знайдених
 * @param {number} total - загальна кількість
 * @param {number} percentage - відсоток
 * @returns {string} - повідомлення
 */
function generateSpecsMessage(found, total, percentage) {
    return `Заповнено ${found} з ${total} обов'язкових характеристик (${percentage}%)`;
}

/**
 * Генерує повідомлення для опису
 * @param {number} words - кількість слів
 * @param {number} paragraphs - кількість параграфів
 * @param {string} status - статус
 * @returns {string} - повідомлення
 */
function generateDescriptionMessage(words, paragraphs, status) {
    if (status === STATUS_TYPES.ERROR) {
        return words === 0 ? 'Опис товару відсутній' : `Опис занадто короткий: ${words} слів`;
    } else if (status === STATUS_TYPES.WARNING) {
        return `Опис містить ${words} слів. Рекомендується розширити до ${ANALYSIS_CONFIG.description.recommendedWords} слів`;
    } else {
        return `Детальний опис: ${words} слів у ${paragraphs} параграфах`;
    }
}