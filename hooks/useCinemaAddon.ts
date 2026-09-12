import { useMemo } from 'react';
import { useAddonsStore } from '@/store/addonsStore';
import { cachedFetch } from '@/services/asyncCache';
import { executeJsAddonCatalog } from '@/services/pluginEngine';

export function useCinemaAddon() {
    const addons = useAddonsStore(s => s.addons);
    const activeCinemaAddon = useAddonsStore(s => s.activeCinemaAddon);

    return useMemo(() => {
        if (!activeCinemaAddon) return null;

        const addon = addons.find(a => a.source === activeCinemaAddon || (a.manifest && a.url === activeCinemaAddon));
        if (!addon) return null;

        // Extract settings
        let settings = {
            showfilter: false,
            showottsection: false,
            showslider: false
        };

        const addonSettings = addon.settings || (addon.manifest && addon.manifest.settings);

        if (addonSettings) {
            if (Array.isArray(addonSettings)) {
                // If the config mistakenly provided an array instead of an object, try to extract it
                if (addonSettings.length > 0 && typeof addonSettings[0] === 'object') {
                    settings = { ...settings, ...addonSettings[0] };
                } else {
                    // Try to parse array like ["showfilter": true] which is invalid JSON but let's handle possible parsing quirks
                    addonSettings.forEach(item => {
                        if (typeof item === 'object') {
                            Object.assign(settings, item);
                        }
                    });
                }
            } else if (typeof addonSettings === 'object') {
                settings = { ...settings, ...addonSettings };
            }
        }

        const isStremio = (addon.manifest && addon.manifest.id && addon.manifest.resources) ||
            (addon.type === 'stremio' || activeCinemaAddon.endsWith('manifest.json'));

        const addonType = addon.addontype || (addon.manifest?.addontype) || (addon.type === 'music' ? 'music' : null) || (isStremio ? 'stremio' : 'serveraddon');
        const isStremioLike = addonType === 'stremio' || addonType === 'music';
        const rawCatalogs = addon.catalogs || (addon.manifest?.catalogs) || [];
        const rawCategories = addon.categories || (addon.manifest?.categories) || [];
        const taggedCategories = rawCategories.map((c: any) => ({ ...c, _isCategory: true }));
        const allCatalogs = [...rawCatalogs, ...taggedCategories];

        const searchcatalog = addon.searchcatalog || (addon.manifest?.searchcatalog) || [];
        const slidercatalog = addon.slidercatalog || (addon.manifest?.slidercatalog) || null;

        const baseUrl = (addon.source || addon.url || activeCinemaAddon).replace(/\/manifest\.json$/i, '');
        const stremioManifestUrl = addon.url || (addon.source ? addon.source : `${baseUrl}/manifest.json`);
        const addonManifestStr = addon.manifest ? JSON.stringify(addon.manifest) : '';
        const idPrefixes = addon.manifest?.idPrefixes || addon.idPrefixes || [];

        let finalSearchCatalog = [...searchcatalog];

        if ((addonType === 'scrapperaddon' || addonType === 'jsaddon') && addon.manifest?.search) {
            finalSearchCatalog.push({
                id: 'search',
                name: 'Search Results',
                type: 'addon',
                searchurl: addon.manifest.search.url.replace('{query}', '${search}')
            });
        }

        if (isStremioLike && addon.manifest?.catalogs) {
            const stremioSearchCatalogs = addon.manifest.catalogs
                .filter((c: any) => (c.type === 'movie' || c.type === 'series') && c.extra?.some((e: any) => e.name === 'search'))
                .map((c: any) => ({
                    id: c.id,
                    name: c.name || `Search ${c.type}`,
                    type: c.type,
                    searchurl: `${baseUrl}/catalog/${c.type}/${c.id}/search=\${search}.json`
                }));

            // Avoid duplicates if some were already manual configurations
            const existingUrls = finalSearchCatalog.map((s: any) => s.searchurl);
            stremioSearchCatalogs.forEach((sc: any) => {
                if (!existingUrls.includes(sc.searchurl)) {
                    finalSearchCatalog.push(sc);
                }
            });
        }

        const mappedCatalogs = allCatalogs.map((c: any) => {
            if (isStremioLike && !c.url) {
                return {
                    ...c,
                    url: `${baseUrl}/catalog/${c.type}/${c.id}.json`,
                    paginationurl: `${baseUrl}/catalog/${c.type}/${c.id}/skip=\${stremioSkip}.json`,
                    ispagination: true,
                    _addonUrl: stremioManifestUrl,
                    _addonManifestStr: addonManifestStr,
                };
            }
            return {
                ...c,
                _addonUrl: stremioManifestUrl,
                _addonManifestStr: addonManifestStr,
            };
        });

        return {
            addon,
            settings,
            catalogs: mappedCatalogs,
            searchcatalog: finalSearchCatalog,
            slidercatalog,
            addontype: addonType,
            addonUrl: stremioManifestUrl,
            addonManifest: addonManifestStr,
            idPrefixes,
        };
    }, [addons, activeCinemaAddon]);

}

export async function fetchAddonCatalog(catalogUrl: string, page: number = 1, addonType: string = 'serveraddon', addonMeta?: { url: string, manifestStr: string }, catalogRawType?: string) {
    if (!catalogUrl) return [];
    let urlWithPage = catalogUrl;
    if (urlWithPage.includes('${stremioSkip}')) {
        const skipValue = (page - 1) * 20;
        urlWithPage = urlWithPage.replace('${stremioSkip}', skipValue.toString());
    }
    urlWithPage = urlWithPage.replace('${page}', page.toString()).replace('{page}', page.toString());

    let cacheKeyStr = `addonCatalog|${addonType}|${urlWithPage}`;
    if (addonType === 'jsaddon' && addonMeta?.manifestStr) {
        try {
            const manifest = JSON.parse(addonMeta.manifestStr);
            if (manifest.scriptUrl) cacheKeyStr += `|${manifest.scriptUrl}`;
        } catch (e) { }
    }

    // Cache + de-dupe: several list sections often request the same catalog
    return cachedFetch(cacheKeyStr, () =>
        fetchAddonCatalogRaw(urlWithPage, catalogUrl, addonType, addonMeta, catalogRawType)
    );
}

async function fetchAddonCatalogRaw(urlWithPage: string, catalogUrl: string, addonType: string, addonMeta?: { url: string, manifestStr: string }, catalogRawType?: string) {
    try {
        const response = await fetch(urlWithPage);
        const rawText = await response.text();

        // Try parsing as JSON; fall back to extracting JSON from text when server returns HTML
        let data: any;
        try {
            data = JSON.parse(rawText);
        } catch (jsonErr) {
            if (addonType === 'scrapperaddon' || addonType === 'jsaddon') {
                data = {}; // scrapperaddon and jsaddon don't need data to be valid JSON
            } else {
                const firstArray = rawText.indexOf('[');
                const firstObj = rawText.indexOf('{');
                const start = (firstArray !== -1 && (firstArray < firstObj || firstObj === -1)) ? firstArray : firstObj;
                if (start === -1) {
                    console.warn('fetchAddonCatalog: response not JSON and no JSON found in text');
                    return [];
                }
                const substr = rawText.slice(start);
                try {
                    data = JSON.parse(substr);
                } catch (e) {
                    // Try to trim to last closing bracket/brace
                    const lastArray = substr.lastIndexOf(']');
                    const lastObj = substr.lastIndexOf('}');
                    const end = Math.max(lastArray, lastObj);
                    if (end === -1) return [];
                    const maybe = substr.slice(0, end + 1);
                    try {
                        data = JSON.parse(maybe);
                    } catch (e2) {
                        console.warn('fetchAddonCatalog: failed to parse JSON from text response');
                        return [];
                    }
                }
            }
        }

        let results: any[] = [];
        if (addonType === 'stremio' || addonType === 'music') {
            results = data?.metas || data?.results || data?.items || [];
        } else if (addonType === 'tmdbaddon') {
            results = data?.results || (Array.isArray(data) ? data : []);
        } else if (addonType === 'jsaddon') {
            if (addonMeta && addonMeta.manifestStr) {
                try {
                    let manifest: any = null;
                    try {
                        manifest = JSON.parse(addonMeta.manifestStr);
                    } catch (e) {
                        console.error("Failed to parse addon manifest string", e);
                    }
                    
                    if (!manifest) {
                        const { useAddonsStore } = require('@/store/addonsStore');
                        const addons = useAddonsStore.getState().addons;
                        const fallbackAddon = addons.find((a: any) => 
                            (a.manifest?.url && urlWithPage.startsWith(a.manifest.url)) || 
                            (a.manifest?.baseUrl && urlWithPage.startsWith(a.manifest.baseUrl))
                        );
                        if (fallbackAddon) {
                            manifest = fallbackAddon.manifest;
                            console.log("Recovered manifest from store using url matching");
                        }
                    }

                    if (manifest && manifest.scriptUrl) {
                        const noCacheUrl = manifest.scriptUrl.includes('?') ? `${manifest.scriptUrl}&t=${Date.now()}` : `${manifest.scriptUrl}?t=${Date.now()}`;
                        const scriptRes = await fetch(noCacheUrl, { headers: { 'Cache-Control': 'no-cache' } });
                        if (!scriptRes.ok) {
                            console.error(`Failed to fetch script from ${noCacheUrl}. Status: ${scriptRes.status}`);
                            return [];
                        }
                        const pluginCode = await scriptRes.text();
                        if (pluginCode && !pluginCode.trim().startsWith('<')) {
                            results = await executeJsAddonCatalog(pluginCode, urlWithPage);
                        } else {
                            console.error('Invalid script content received (looks like HTML/XML). URL:', noCacheUrl);
                        }
                    }
                } catch (e) {
                    console.error('Failed to execute jsaddon', e);
                }
            }
        } else if (addonType === 'scrapperaddon') {
            const html = rawText;
            if (addonMeta && addonMeta.manifestStr) {
                try {
                    const manifest = JSON.parse(addonMeta.manifestStr);
                    // Match the catalog rule based on catalogUrl or urlWithPage
                    let catalogRule = manifest.catalogs?.find((c: any) => catalogUrl.includes(c.id) || urlWithPage.includes(c.id) || (c.url && urlWithPage.includes(c.url.split('?')[0].replace('{page}', '').replace('${page}', '').replace('//', '/'))));

                    if (!catalogRule && manifest.categories) {
                        catalogRule = manifest.categories.find((c: any) => catalogUrl.includes(c.id) || urlWithPage.includes(c.id) || (c.url && urlWithPage.includes(c.url.split('?')[0].replace('{page}', '').replace('${page}', '').replace('//', '/'))));
                        if (catalogRule) catalogRule._isCategory = true;
                    }

                    // Fallback to first catalog or search catalog if it's a search
                    if (!catalogRule && urlWithPage.includes('?s=') && manifest.search) {
                        catalogRule = manifest.search;
                    } else if (!catalogRule) {
                        catalogRule = manifest.catalogs?.[0];
                    }

                    const rulesToUse = catalogRule?.scraperRules || (catalogRule?._isCategory ? manifest.categoryScraperRules : manifest.catalogScraperRules);
                    if (rulesToUse) {
                        const { parseCatalogHtml } = require('@/services/scrapperEngine');
                        results = parseCatalogHtml(html, rulesToUse, manifest.baseUrl || '');
                    }
                } catch (e) {
                    console.error('Failed to parse scrapper rules from manifest', e);
                }
            }
        } else {
            // serveraddon or generic
            if (Array.isArray(data)) results = data;
            else results = data?.results || data?.metas || data?.items || data?.list || data?.data || [];
        }

        return results.map((item: any) => {
            const rawId = item.id?.toString() || item._id?.toString() || (item.tmdbId ? String(item.tmdbId) : undefined) || (item.url ? String(item.url) : undefined) || (item.logo ? String(item.logo) : undefined) || (item.title ? String(item.title) : undefined);
            // Generate a safe id if none of the common fields exist
            const id = rawId ? encodeURIComponent(rawId) : `gen_${Math.abs(hashCode(JSON.stringify(item))).toString()}`;

            return {
                ...item,
                id,
                title: item.title || item.name || item.label || item.heading,
                poster_path: item.poster_path || item.poster || item.logo || item.background || item.image || item.thumbnail || item.thumb,
                media_type: item.media_type || (addonType === 'scrapperaddon' ? 'movie' : (item.type === 'series' || item.type === 'tv' || item.kind === 'tv' || item.kind === 'series' || catalogRawType === 'series' || catalogRawType === 'tv' || ('first_air_date' in item && !('release_date' in item)) ? 'tv' : 'movie')),
                // Attach the addon info here so it's available to the item when rendering
                addonType: addonType,
                _addonUrl: addonMeta?.url || catalogUrl,
                _addonManifestStr: addonMeta?.manifestStr || '',
            };
        });
    } catch (e) {
        console.error('Failed to fetch addon catalog:', e);
        return [];
    }
}

// Simple deterministic hash for fallback id generation
function hashCode(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
