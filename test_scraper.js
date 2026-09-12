const cheerio = require('cheerio-without-node-native');
const html = `
<div class="videos">
                    <a class="video lazy-bg" 
   data-bg="https://webxseries.gg/wp-content/uploads/2026/08/Bahu-Ka-Pahredaar-Episode-27.webp" 
   style="background-size: cover; background-position: top;" 
   title="Bahu Ka Pahredaar Episode 27" 
   href="https://webxseries.gg/bahu-ka-pahredaar-episode-27/">
        <span class="time clock">19:00</span>
    <span class="ago">2 Wk Ago</span>
    <h2 class="vtitle">Bahu Ka Pahredaar Episode 27</h2>
</a>
</div>
`;
const executeScrapperRule = (html, rule, $element) => {
    if (!rule.selector && !$element && rule.type !== 'regex')
        return null;
    const $ = $element || cheerio.load(html);
    let el = $element;
    if (rule.selector) {
        if ($element) {
            const found = $element.find(rule.selector);
            if (found.length > 0) {
                el = found;
            }
            else if ($element.is(rule.selector)) {
                el = $element;
            }
            else {
                el = found; // empty
            }
        }
        else {
            el = $(rule.selector);
        }
    }
    if (!el)
        return null;
    if (rule.type === 'text') {
        return el.text().trim() || null;
    }
    if (rule.type === 'attribute' && rule.attribute) {
        return el.attr(rule.attribute) || null;
    }
    return null;
};
const parseCatalogHtml = (html, rules, baseUrl) => {
    const $ = cheerio.load(html);
    const items = [];
    $(rules.container).each((_, element) => {
        const $el = $(element);
        let title = executeScrapperRule(html, rules.title, $el) || 'Unknown Title';
        let logo = executeScrapperRule(html, rules.logo, $el) || '';
        let url = executeScrapperRule(html, rules.url, $el) || '';
        // fix urls
        if (logo && logo.startsWith('/'))
            logo = baseUrl + logo;
        if (url && url.startsWith('/'))
            url = baseUrl + url;
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
const rules = {
    "container": ".videos > .video",
    "title": { "type": "text", "selector": ".vtitle" },
    "logo": { "type": "attribute", "attribute": "data-bg" },
    "url": { "type": "attribute", "attribute": "href" }
};
console.log(parseCatalogHtml(html, rules, 'https://webxseries.gg'));
