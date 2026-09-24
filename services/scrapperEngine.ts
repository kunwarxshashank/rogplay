import cheerio from 'cheerio-without-node-native';

export type ScrapperRule = {
    type: 'text' | 'attribute' | 'regex';
    selector?: string; // used for 'text' | 'attribute'
    attribute?: string; // used for 'attribute'
    pattern?: string; // used for 'regex'
    flags?: string;
    group?: number;
};

export type CatalogScraperRules = {
    container: string;
    title: ScrapperRule;
    logo: ScrapperRule;
    url: ScrapperRule;
};

export type StreamScraperStep = {
    type: 'regex' | 'attribute' | 'text';
    selector?: string;
    attribute?: string;
    pattern?: string;
    flags?: string;
    group?: number;
    multipage?: boolean; // if true, it expects to fetch the resulting URL and continue
};

export interface ScrapperCatalogItem {
    id: string;
    title: string;
    logo: string;
    url: string;
}

export const executeScrapperRule = (html: string, rule: ScrapperRule, $element?: any): string | null => {
    if (rule.type === 'regex' && rule.pattern) {
        const regex = new RegExp(rule.pattern, rule.flags || 'i');
        const match = regex.exec(html);
        if (match && rule.group !== undefined && match.length > rule.group) {
            return match[rule.group];
        } else if (match) {
            return match[0];
        }
        return null;
    }

    if (!rule.selector && !$element && rule.type !== 'regex') return null;

    const $ = $element || cheerio.load(html);
    let el = $element;

    if (rule.selector) {
        if ($element) {
            const found = $element.find(rule.selector);
            if (found.length > 0) {
                el = found;
            } else if ($element.is(rule.selector)) {
                el = $element;
            } else {
                el = found; // empty
            }
        } else {
            el = $(rule.selector);
        }
    }

    if (!el) return null;

    if (rule.type === 'text') {
        return el.text().trim() || null;
    }

    if (rule.type === 'attribute' && rule.attribute) {
        return el.attr(rule.attribute) || null;
    }

    return null;
};

export const parseCatalogHtml = (html: string, rules: CatalogScraperRules, baseUrl: string): ScrapperCatalogItem[] => {
    const $ = cheerio.load(html);
    const items: ScrapperCatalogItem[] = [];

    $(rules.container).each((_, element) => {
        const $el = $(element);

        let title = executeScrapperRule(html, rules.title, $el) || 'Unknown Title';
        let logo = executeScrapperRule(html, rules.logo, $el) || '';
        let url = executeScrapperRule(html, rules.url, $el) || '';

        // fix urls
        if (logo && logo.startsWith('/')) logo = baseUrl + logo;
        if (url && url.startsWith('/')) url = baseUrl + url;

        if (url) {
            items.push({
                id: encodeURIComponent(url),
                title,
                logo,
                url
            });
        }
    });

    return items;
};

export const parseStreamHtml = async (initialHtml: string, steps: StreamScraperStep[], currentUrl: string): Promise<string | null> => {
    let currentHtml = initialHtml;
    let resultUrl: string | null = null;

    for (const step of steps) {
        resultUrl = executeScrapperRule(currentHtml, step as ScrapperRule);

        if (!resultUrl) return null;

        // fix url
        if (resultUrl.startsWith('/')) {
            const urlObj = new URL(currentUrl);
            resultUrl = `${urlObj.protocol}//${urlObj.host}${resultUrl}`;
        }

        if (step.multipage) {
            try {
                const res = await fetch(resultUrl);
                currentHtml = await res.text();
                currentUrl = resultUrl;
            } catch (e) {
                console.error("Failed to fetch multipage step", e);
                return null;
            }
        }
    }

    return resultUrl;
};
