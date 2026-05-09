/**
 * Marketplace Links Utility
 * Builds search URLs for Russian marketplaces.
 * No external APIs, no parsing, no affiliate links.
 */

const MARKETPLACE_BASES = {
    ozon: 'https://www.ozon.ru/search/?text=',
    wb: 'https://www.wildberries.ru/catalog/0/search.aspx?search=',
    market: 'https://market.yandex.ru/search?text=',
};

/**
 * Builds search links for all supported marketplaces.
 *
 * @param {string} query - search term (e.g. "ручная кофемолка")
 * @returns {{ ozon: string, wb: string, market: string }}
 *
 * @example
 * buildMarketplaceLinks('умная кружка')
 * // {
 * //   ozon:   'https://www.ozon.ru/search/?text=%D1%83%D0%BC%D0%BD%D0%B0%D1%8F%20%D0%BA%D1%80%D1%83%D0%B6%D0%BA%D0%B0',
 * //   wb:     'https://www.wildberries.ru/catalog/0/search.aspx?search=%D1%83%D0%BC%D0%BD%D0%B0%D1%8F%20%D0%BA%D1%80%D1%83%D0%B6%D0%BA%D0%B0',
 * //   market: 'https://market.yandex.ru/search?text=%D1%83%D0%BC%D0%BD%D0%B0%D1%8F%20%D0%BA%D1%80%D1%83%D0%B6%D0%BA%D0%B0',
 * // }
 */
export function buildMarketplaceLinks(query) {
    if (!query || typeof query !== 'string') {
        throw new TypeError('[marketplaceLinks] query must be a non-empty string');
    }

    const encoded = encodeURIComponent(query.trim());

    return {
        ozon: `${MARKETPLACE_BASES.ozon}${encoded}`,
        wb: `${MARKETPLACE_BASES.wb}${encoded}`,
        market: `${MARKETPLACE_BASES.market}${encoded}`,
    };
}

/**
 * Builds an aiogram-style inline_keyboard row with marketplace buttons for a single gift idea.
 *
 * @param {string} idea - gift idea text
 * @returns {Array<{text: string, url: string}[]>} - array of rows (1 row with 3 buttons)
 */
export function buildMarketplaceKeyboardRow(idea) {
    const links = buildMarketplaceLinks(idea);
    return [
        [
            { text: '🛒 Ozon', url: links.ozon },
            { text: '🟣 WB', url: links.wb },
            { text: '🟡 Я.Маркет', url: links.market },
        ],
    ];
}
