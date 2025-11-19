// Cache for ProtonDB data to avoid redundant fetches
const protonDataCache = {};
const steamIdCache = {}; // Cache for Title -> AppID

// Queue for processing elements to avoid spamming the API
const processingQueue = new Set();

function fetchProtonData(appId, callback) {
    if (protonDataCache[appId]) {
        callback(protonDataCache[appId]);
        return;
    }

    if (processingQueue.has(appId)) return; // Already fetching
    processingQueue.add(appId);

    chrome.runtime.sendMessage({ action: "fetchProtonData", appId: appId }, (response) => {
        processingQueue.delete(appId);
        if (response && response.success && response.data) {
            protonDataCache[appId] = response.data;
            callback(response.data);
        } else {
            protonDataCache[appId] = null;
            console.log(`ProtonDB data fetch failed for ${appId}:`, response ? response.error : "Unknown error");
        }
    });
}

function fetchSteamId(title, callback) {
    if (steamIdCache[title]) {
        callback(steamIdCache[title]);
        return;
    }

    chrome.runtime.sendMessage({ action: "fetchSteamId", title: title }, (response) => {
        if (response && response.success && response.appId) {
            steamIdCache[title] = response.appId;
            callback(response.appId);
        } else {
            console.log(`Steam ID fetch failed for ${title}:`, response ? response.error : "Unknown error");
        }
    });
}

function createBadge(tier, appId, isSmall = false) {
    const badge = document.createElement('div');
    badge.className = `proton-badge proton-tier-${tier}`;
    if (tier === 'native') {
        badge.textContent = isSmall ? 'N' : 'Native';
        badge.title = 'Native Linux Support';
    } else {
        badge.textContent = isSmall ? tier.substring(0, 1).toUpperCase() : `Proton: ${tier.toUpperCase()}`;
        badge.title = `ProtonDB Tier: ${tier}`;
    }

    if (isSmall) {
        badge.style.padding = '2px 4px';
        badge.style.fontSize = '10px';
        badge.style.marginLeft = '5px';
        badge.style.minWidth = '15px';
        badge.style.textAlign = 'center';
    }

    badge.style.cursor = 'pointer';
    badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(`https://www.protondb.com/app/${appId}`, '_blank');
    });

    return badge;
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
// --- Steam Logic ---

function handleSteamAppPage() {
    const appIdMatch = window.location.pathname.match(/\/app\/(\d+)/);
    const appId = appIdMatch ? appIdMatch[1] : null;

    if (appId) {
        const titleElement = document.querySelector('.apphub_AppName');
        if (titleElement && !titleElement.querySelector('.proton-badge')) {
            // Check for Native Support
            const isNative = document.querySelector('.game_area_purchase_platform .platform_img.linux') ||
                document.querySelector('.game_area_purchase_platform .platform_img.steamos');

            if (isNative) {
                titleElement.appendChild(createBadge('native', appId));
            }

            fetchProtonData(appId, (data) => {
                if (!data.tier) return;
                titleElement.appendChild(createBadge(data.tier, appId));
            });
        }
    }
}

function handleSteamHomepage() {
    // Strategy 1: data-ds-appid
    const dataElements = document.querySelectorAll('[data-ds-appid]');
    dataElements.forEach(el => {
        const appIds = el.getAttribute('data-ds-appid').split(',');
        const appId = appIds[0];
        injectSteamBadge(el, appId, true);
    });

    // Strategy 2: href links containing /app/
    const linkElements = document.querySelectorAll('a[href*="/app/"]');
    linkElements.forEach(el => {
        const match = el.href.match(/\/app\/(\d+)/);
        if (match) {
            const appId = match[1];
            // Avoid double injection if this element also had data-ds-appid
            if (!el.hasAttribute('data-ds-appid')) {
                injectSteamBadge(el, appId, true);
            }
        }
    });
}

function injectSteamBadge(element, appId, isSmall) {
    if (!appId) return;

    // --- Native Detection ---
    if (!element.hasAttribute('data-native-detected')) {
        // Check for Native Support (Homepage/Search)
        // Strategy 1: Descendants
        let isNative = element.querySelector('.platform_img.linux') || element.querySelector('.platform_img.steamos');

        // Strategy 2: Parent Container (for cases where data-ds-appid is on an inner element or sibling structure)
        if (!isNative) {
            const container = element.closest('.tab_item') ||
                element.closest('.home_main_cap_item') ||
                element.closest('.spotlight_content') ||
                element.closest('.capsule');
            if (container) {
                isNative = container.querySelector('.platform_img.linux') || container.querySelector('.platform_img.steamos');
            }
        }

        if (isNative) {
            let target = element.querySelector('.discount_block');
            if (!target) target = element.querySelector('.col_search_price');
            if (!target) target = element;

            // If target is not found inside element, try to find a suitable sibling or parent target
            if (!target && element.parentElement) {
                // Fallback for some layouts
                target = element.parentElement.querySelector('.discount_block') || element;
            }

            if (target && !target.querySelector('.proton-tier-native')) {
                const nativeBadge = createBadge('native', appId, isSmall);
                if (target.classList.contains('discount_block')) {
                    target.style.display = 'flex';
                    target.style.alignItems = 'center';
                    target.appendChild(nativeBadge);
                } else {
                    target.appendChild(nativeBadge);
                }
                element.setAttribute('data-native-detected', 'true');
            }
        }
    }

    // --- ProtonDB Data Fetching ---
    if (element.hasAttribute('data-proton-processed')) return;
    element.setAttribute('data-proton-processed', 'true'); // Mark as processed for API calls

    fetchProtonData(appId, (data) => {
        if (!data.tier) return;

        let target = element.querySelector('.discount_block');
        if (!target) target = element.querySelector('.col_search_price');
        if (!target) target = element;

        // Fallback target logic same as above
        if (!target && element.parentElement) {
            target = element.parentElement.querySelector('.discount_block') || element;
        }

        if (target.querySelector('.proton-badge:not(.proton-tier-native)')) return; // Avoid duplicate Proton badges

        const badge = createBadge(data.tier, appId, isSmall);

        if (target.classList.contains('discount_block')) {
            target.style.display = 'flex';
            target.style.alignItems = 'center';
            target.appendChild(badge);
        } else {
            target.appendChild(badge);
        }
    });
}

// --- Epic Games Logic ---

function handleEpicGames() {
    // Try multiple selectors for the title
    const selectors = [
        '[data-testid="offer-title-info-title"]', // Common Epic selector
        'span[data-component="Message"]', // Older selector
        'h1', // Generic fallback
        'h2.css-1mj94d7-title' // Another potential class based on research
    ];

    let titleElement = null;
    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim().length > 0) {
            titleElement = el;
            console.log(`[ProtonDB Extension] Found title element using selector: ${selector}`);
            break;
        }
    }

    if (titleElement && !titleElement.querySelector('.proton-badge') && !titleElement.getAttribute('data-proton-processed')) {
        const title = titleElement.textContent.trim();
        console.log(`[ProtonDB Extension] Extracted title: "${title}"`);

        if (title) {
            titleElement.setAttribute('data-proton-processed', 'true');
            fetchSteamId(title, (appId) => {
                console.log(`[ProtonDB Extension] Fetched Steam ID for "${title}": ${appId}`);
                fetchProtonData(appId, (data) => {
                    console.log(`[ProtonDB Extension] Fetched Proton data for ${appId}:`, data);
                    if (!data.tier) return;
                    // Inject next to title
                    // Check if we should inject inside or after, depending on element type
                    if (titleElement.tagName === 'SPAN' || titleElement.tagName === 'H1' || titleElement.tagName === 'H2') {
                        titleElement.appendChild(createBadge(data.tier, appId));
                    } else {
                        titleElement.parentNode.appendChild(createBadge(data.tier, appId));
                    }
                });
            });
        }
    } else if (!document.querySelector('[data-proton-processed]')) {
        // Only log if we haven't processed anything yet to avoid spam
        // console.log('[ProtonDB Extension] No title element found yet.');
    }
}

// --- Main Init ---
function init() {
    const host = window.location.hostname;
    console.log(`[ProtonDB Extension] Initializing on ${host}`);

    if (host.includes('steampowered.com')) {
        if (window.location.pathname.startsWith('/app/')) {
            handleSteamAppPage();
        } else {
            handleSteamHomepage();
            const debouncedHandler = debounce(() => handleSteamHomepage(), 500);
            const observer = new MutationObserver(debouncedHandler);
            observer.observe(document.body, { childList: true, subtree: true });
        }
    } else if (host.includes('epicgames.com')) {
        const debouncedEpicHandler = debounce(() => handleEpicGames(), 750);
        handleEpicGames();
        const observer = new MutationObserver(debouncedEpicHandler);
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

init();