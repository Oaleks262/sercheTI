/**
 * Модуль для роботи з інтерфейсом користувача
 */

/**
 * Показує/приховує індикатор завантаження
 * @param {boolean} show - показати чи приховати
 */
function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    const resultsElement = document.getElementById('results');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
    
    if (resultsElement && show) {
        resultsElement.style.display = 'none';
    }
    
    if (analyzeBtn) {
        analyzeBtn.disabled = show;
        analyzeBtn.textContent = show ? '⏳ Аналізуємо...' : '🔍 Аналізувати сторінку';
    }
}

/**
 * Показує повідомлення про помилку
 * @param {string} message - текст помилки
 */
function showError(message) {
    const resultsElement = document.getElementById('results');
    if (!resultsElement) return;
    
    const errorHtml = `
        <div class="error-message">
            <h3>❌ Помилка завантаження</h3>
            <p>${message}</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f5c6cb;">
                <h4>💡 Що можна зробити:</h4>
                <ul style="text-align: left; margin: 10px 0; padding-left: 20px;">
                    <li>Перевірте правильність URL</li>
                    <li>Спробуйте пізніше (проблеми з CORS)</li>
                    <li>Використайте VPN або проксі</li>
                    <li>Скопіюйте HTML код сторінки вручну</li>
                </ul>
            </div>
        </div>
    `;
    
    resultsElement.innerHTML = errorHtml;
    resultsElement.style.display = 'block';
    resultsElement.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Відображає результати аналізу
 * @param {Object} analysis - результати аналізу
 * @param {string} category - категорія товару
 */
function displayResults(analysis, category) {
    const resultsElement = document.getElementById('results');
    if (!resultsElement) return;
    
    const { images, specs, description } = analysis;
    
    const html = `
        <h2>📊 Результати аналізу</h2>
        <p style="text-align: center; margin-bottom: 30px; color: #666; font-size: 1.1em;">
            Категорія: <strong>${getCategoryDisplayName(category)}</strong>
        </p>
        
        ${generateStatsGrid(images, specs, description)}
        ${generateAnalysisDetails(images, specs, description)}
        ${generateRecommendations(images, specs, description)}
    `;
    
    resultsElement.innerHTML = html;
    resultsElement.style.display = 'block';
    resultsElement.scrollIntoView({ behavior: 'smooth' });
    
    // Додаємо анімації
    addResultAnimations();
}

/**
 * Генерує сітку зі статистикою
 * @param {Object} images - дані про зображення
 * @param {Object} specs - дані про характеристики
 * @param {Object} description - дані про опис
 * @returns {string} - HTML код сітки
 */
function generateStatsGrid(images, specs, description) {
    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${formatNumber(images.total)}</div>
                <div class="stat-label">Фотографій</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${specs.completeness}%</div>
                <div class="stat-label">Характеристики</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${formatNumber(description.words)}</div>
                <div class="stat-label">Слів в описі</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${description.paragraphs}</div>
                <div class="stat-label">Розділів</div>
            </div>
        </div>
    `;
}

/**
 * Генерує детальну інформацію про аналіз
 * @param {Object} images - дані про зображення
 * @param {Object} specs - дані про характеристики  
 * @param {Object} description - дані про опис
 * @returns {string} - HTML код деталей
 */
function generateAnalysisDetails(images, specs, description) {
    return `
        <div class="analysis-details">
            ${generateImageDetails(images)}
            ${generateSpecsDetails(specs)}
            ${generateDescriptionDetails(description)}
        </div>
    `;
}

/**
 * Генерує деталі для фотографій
 * @param {Object} images - дані про зображення
 * @returns {string} - HTML код
 */
function generateImageDetails(images) {
    const statusBadge = getStatusBadge(images.status);
    const minRecommended = ANALYSIS_CONFIG.images.minRecommended;
    
    let additionalInfo = '';
    if (images.total === 0) {
        additionalInfo = '<p style="color: #721c24; margin-top: 10px;">❌ Не вдалося знайти фотографії товару. Перевірте HTML структуру.</p>';
    } else if (images.total < minRecommended) {
        additionalInfo = `<p style="color: #856404; margin-top: 10px;">⚠️ Рекомендується мати принаймні ${minRecommended} якісні фотографії товару</p>`;
    } else {
        additionalInfo = '<p style="color: #155724; margin-top: 10px;">✅ Достатня кількість фотографій для якісного показу товару</p>';
    }
    
    return `
        <div class="detail-card">
            <h3>📸 Фотографії товару ${statusBadge}</h3>
            <p><strong>${images.message}</strong></p>
            ${additionalInfo}
            ${images.images.length > 0 ? generateImagePreview(images.images) : ''}
        </div>
    `;
}

/**
 * Генерує деталі для характеристик
 * @param {Object} specs - дані про характеристики
 * @returns {string} - HTML код
 */
function generateSpecsDetails(specs) {
    const statusBadge = getStatusBadge(specs.status);
    
    let foundSection = '';
    if (specs.found.length > 0) {
        foundSection = `
            <div style="margin-top: 20px;">
                <h4 style="color: #155724; margin-bottom: 10px;">✅ Знайдені характеристики (${specs.found.length}):</h4>
                <div class="spec-grid">
                    ${specs.found.map(spec => `<div class="spec-item spec-found">✓ ${spec}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    let missingSection = '';
    if (specs.missing.length > 0) {
        missingSection = `
            <div style="margin-top: 20px;">
                <h4 style="color: #721c24; margin-bottom: 10px;">❌ Відсутні характеристики (${specs.missing.length}):</h4>
                <div class="spec-grid">
                    ${specs.missing.map(spec => `<div class="spec-item spec-missing">✗ ${spec}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    return `
        <div class="detail-card">
            <h3>⚙️ Характеристики товару ${statusBadge}</h3>
            <p><strong>${specs.message}</strong></p>
            ${generateProgressBar(specs.completeness)}
            ${foundSection}
            ${missingSection}
        </div>
    `;
}

/**
 * Генерує деталі для опису
 * @param {Object} description - дані про опис
 * @returns {string} - HTML код
 */
function generateDescriptionDetails(description) {
    const statusBadge = getStatusBadge(description.status);
    const recommendedWords = ANALYSIS_CONFIG.description.recommendedWords;
    
    let additionalInfo = '';
    if (description.words === 0) {
        additionalInfo = '<p style="color: #721c24; margin-top: 10px;">❌ Опис товару відсутній або не вдалося його знайти</p>';
    } else if (description.words < recommendedWords) {
        additionalInfo = `<p style="color: #856404; margin-top: 10px;">⚠️ Рекомендується розширити опис до ${recommendedWords} слів для кращого SEO</p>`;
    } else {
        additionalInfo = '<p style="color: #155724; margin-top: 10px;">✅ Детальний та інформативний опис товару</p>';
    }
    
    const stats = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <div style="text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">${formatNumber(description.words)}</div>
                <div style="font-size: 0.8em; color: #666;">Слів</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">${description.paragraphs}</div>
                <div style="font-size: 0.8em; color: #666;">Розділів</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">${description.images}</div>
                <div style="font-size: 0.8em; color: #666;">Зображень</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">${description.headings}</div>
                <div style="font-size: 0.8em; color: #666;">Заголовків</div>
            </div>
        </div>
    `;
    
    return `
        <div class="detail-card">
            <h3>📝 Опис товару ${statusBadge}</h3>
            <p><strong>${description.message}</strong></p>
            ${stats}
            ${additionalInfo}
        </div>
    `;
}

/**
 * Генерує рекомендації для покращення
 * @param {Object} images - дані про зображення
 * @param {Object} specs - дані про характеристики
 * @param {Object} description - дані про опис
 * @returns {string} - HTML код рекомендацій
 */
function generateRecommendations(images, specs, description) {
    const recommendations = [];
    
    // Рекомендації для фотографій
    if (images.status !== STATUS_TYPES.SUCCESS) {
        if (images.total === 0) {
            recommendations.push('📸 Додайте фотографії товару для покращення конверсії');
        } else if (images.total < ANALYSIS_CONFIG.images.minRecommended) {
            recommendations.push(`📸 Додайте ще ${ANALYSIS_CONFIG.images.minRecommended - images.total} фотографії для повного показу товару`);
        }
    }
    
    // Рекомендації для характеристик
    if (specs.missing.length > 0) {
        recommendations.push(`⚙️ Заповніть відсутні характеристики: ${specs.missing.slice(0, 3).join(', ')}${specs.missing.length > 3 ? ' та інші' : ''}`);
    }
    
    // Рекомендації для опису
    if (description.words < ANALYSIS_CONFIG.description.recommendedWords) {
        const needed = ANALYSIS_CONFIG.description.recommendedWords - description.words;
        recommendations.push(`📝 Розширте опис на ${needed} слів для кращого SEO та інформативності`);
    }
    
    if (recommendations.length === 0) {
        recommendations.push('🎉 Відмінно! Сторінка товару має всі необхідні елементи');
    }
    
    return `
        <div class="detail-card" style="border-left: 4px solid #ffc107;">
            <h3>💡 Рекомендації для покращення</h3>
            <ul style="margin: 15px 0; padding-left: 20px;">
                ${recommendations.map(rec => `<li style="margin: 8px 0;">${rec}</li>`).join('')}
            </ul>
        </div>
    `;
}

/**
 * Генерує значок статусу
 * @param {string} status - статус
 * @returns {string} - HTML значок
 */
function getStatusBadge(status) {
    const badges = {
        [STATUS_TYPES.SUCCESS]: '<span class="status-badge status-success">✅ Відмінно</span>',
        [STATUS_TYPES.WARNING]: '<span class="status-badge status-warning">⚠️ Потребує уваги</span>',
        [STATUS_TYPES.ERROR]: '<span class="status-badge status-error">❌ Критично</span>'
    };
    return badges[status] || '';
}

/**
 * Генерує прогрес-бар
 * @param {number} percentage - відсоток (0-100)
 * @returns {string} - HTML прогрес-бару
 */
function generateProgressBar(percentage) {
    const color = percentage >= 80 ? '#28a745' : percentage >= 50 ? '#ffc107' : '#dc3545';
    
    return `
        <div style="margin: 15px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Заповненість характеристик</span>
                <span style="font-weight: bold;">${percentage}%</span>
            </div>
            <div style="background: #e9ecef; border-radius: 10px; height: 10px; overflow: hidden;">
                <div style="background: ${color}; height: 100%; width: ${percentage}%; transition: width 0.5s ease;"></div>
            </div>
        </div>
    `;
}

/**
 * Генерує превью зображень
 * @param {Array} images - масив URL зображень
 * @returns {string} - HTML превью
 */
function generateImagePreview(images) {
    const previewImages = images.slice(0, 5); // Показуємо максимум 5 зображень
    
    return `
        <div style="margin-top: 15px;">
            <h5 style="margin-bottom: 10px; color: #666;">Знайдені зображення:</h5>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${previewImages.map(img => `
                    <div style="width: 60px; height: 60px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; position: relative;">
                        <img src="${img}" alt="Товар" style="width: 100%; height: 100%; object-fit: cover;" 
                             onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:12px;color:#999\\'>❌</div>'">
                    </div>
                `).join('')}
                ${images.length > 5 ? `<div style="display: flex; align-items: center; font-size: 0.9em; color: #666;">+${images.length - 5} ще</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Отримує назву категорії для відображення
 * @param {string} category - код категорії
 * @returns {string} - назва для відображення
 */
function getCategoryDisplayName(category) {
    return CATEGORY_NAMES[category] || '🔍 Невизначено';
}

/**
 * Додає анімації для результатів
 */
function addResultAnimations() {
    const cards = document.querySelectorAll('.stat-card, .detail-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

/**
 * Ініціалізує обробники подій для UI
 */
function initializeUI() {
    // Автоматично аналізувати при вставці URL
    const urlInput = document.getElementById('urlInput');
    if (urlInput) {
        urlInput.addEventListener('paste', function() {
            setTimeout(() => {
                const url = this.value.trim();
                if (isValidUrl(url)) {
                    const analyzeBtn = document.getElementById('analyzeBtn');
                    if (analyzeBtn) {
                        analyzeBtn.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
                        analyzeBtn.textContent = '🚀 Готово до аналізу!';
                    }
                }
            }, 100);
        });
        
        // Скидання кнопки при очищенні поля
        urlInput.addEventListener('input', function() {
            const analyzeBtn = document.getElementById('analyzeBtn');
            if (analyzeBtn && !this.value.trim()) {
                analyzeBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
                analyzeBtn.textContent = '🔍 Аналізувати сторінку';
            }
        });
    }
    
    // Автоматичний фокус на поле вводу
    if (urlInput) {
        urlInput.focus();
    }
}

/**
 * Показує нотифікацію
 * @param {string} message - текст повідомлення
 * @param {string} type - тип нотифікації (success, warning, error)
 * @param {number} duration - тривалість показу в мс
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Створюємо контейнер для нотифікацій, якщо його немає
    let container = document.getElementById('notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    // Створюємо нотифікацію
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: white;
        border-left: 4px solid ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : type === 'error' ? '#dc3545' : '#17a2b8'};
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        font-size: 14px;
        line-height: 1.4;
    `;
    
    const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️';
    notification.innerHTML = `<strong>${icon}</strong> ${message}`;
    
    container.appendChild(notification);
    
    // Анімація появи
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Автоматичне приховання
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

/**
 * Створює модальне вікно з деталями
 * @param {string} title - заголовок
 * @param {string} content - контент
 */
function showModal(title, content) {
    // Видаляємо попереднє модальне вікно, якщо є
    const existingModal = document.getElementById('details-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Створюємо модальне вікно
    const modal = document.createElement('div');
    modal.id = 'details-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 15px;
        padding: 30px;
        max-width: 80%;
        max-height: 80%;
        overflow-y: auto;
        position: relative;
        transform: scale(0.9);
        transition: transform 0.3s ease;
    `;
    
    modalContent.innerHTML = `
        <button onclick="document.getElementById('details-modal').remove()" 
                style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
        <h2 style="margin-bottom: 20px; color: #333;">${title}</h2>
        <div>${content}</div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Анімація появи
    setTimeout(() => {
        modal.style.opacity = '1';
        modalContent.style.transform = 'scale(1)';
    }, 10);
    
    // Закриття по кліку на фон
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Закриття по Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

/**
 * Експортує результати аналізу в JSON
 * @param {Object} analysis - результати аналізу
 * @param {string} url - URL сторінки
 */
function exportResults(analysis, url) {
    const exportData = {
        url: url,
        timestamp: new Date().toISOString(),
        category: analysis.category,
        results: {
            images: {
                total: analysis.images.total,
                status: analysis.images.status,
                message: analysis.images.message
            },
            specs: {
                completeness: analysis.specs.completeness,
                found: analysis.specs.found,
                missing: analysis.specs.missing,
                status: analysis.specs.status
            },
            description: {
                words: analysis.description.words,
                paragraphs: analysis.description.paragraphs,
                images: analysis.description.images,
                headings: analysis.description.headings,
                status: analysis.description.status
            }
        },
        recommendations: generateRecommendationsList(analysis)
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `analysis_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('Результати експортовано в JSON файл', 'success');
}

/**
 * Генерує список рекомендацій
 * @param {Object} analysis - результати аналізу
 * @returns {Array} - масив рекомендацій
 */
function generateRecommendationsList(analysis) {
    const recommendations = [];
    
    if (analysis.images.status !== STATUS_TYPES.SUCCESS) {
        recommendations.push({
            type: 'images',
            priority: analysis.images.total === 0 ? 'high' : 'medium',
            message: analysis.images.message
        });
    }
    
    if (analysis.specs.missing.length > 0) {
        recommendations.push({
            type: 'specs',
            priority: analysis.specs.completeness < 50 ? 'high' : 'medium',
            message: `Додати відсутні характеристики: ${analysis.specs.missing.join(', ')}`
        });
    }
    
    if (analysis.description.words < ANALYSIS_CONFIG.description.recommendedWords) {
        recommendations.push({
            type: 'description',
            priority: analysis.description.words < ANALYSIS_CONFIG.description.minWords ? 'high' : 'low',
            message: `Розширити опис до ${ANALYSIS_CONFIG.description.recommendedWords} слів`
        });
    }
    
    return recommendations;
}