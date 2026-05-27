import { useMemo } from 'react';
import { useAddonsStore } from '@/store/addonsStore';

export function useCinemaAddon() {
    const { addons, activeCinemaAddon } = useAddonsStore();

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

        const addonType = addon.addontype || (addon.manifest?.addontype) || (isStremio ? 'stremio' : 'serveraddon');
        const rawCatalogs = addon.catalogs || (addon.manifest?.catalogs) || [];
        const searchcatalog = addon.searchcatalog || (addon.manifest?.searchcatalog) || [];
        const slidercatalog = addon.slidercatalog || (addon.manifest?.slidercatalog) || null;

        const baseUrl = (addon.source || addon.url || activeCinemaAddon).replace(/\/manifest\.json$/i, '');
        const stremioManifestUrl = addon.url || (addon.source ? addon.source : `${baseUrl}/manifest.json`);
        const addonManifestStr = addon.manifest ? JSON.stringify(addon.manifest) : '';
        const idPrefixes = addon.manifest?.idPrefixes || addon.idPrefixes || [];

        let finalSearchCatalog = [...searchcatalog];
        if (addonType === 'stremio' && addon.manifest?.catalogs) {
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

        const mappedCatalogs = rawCatalogs.map((c: any) => {
            if (addonType === 'stremio' && !c.url) {
                return {
                    ...c,
                    url: `${baseUrl}/catalog/${c.type}/${c.id}.json`,
                    paginationurl: `${baseUrl}/catalog/${c.type}/${c.id}/skip=\${stremioSkip}.json`,
                    ispagination: true,
                    // Attach addon info for custom ID routing
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

export async function fetchAddonCatalog(catalogUrl: string, page: number = 1, addonType: string = 'serveraddon', addonMeta?: { url: string, manifestStr: string }) {
    try {
        if (!catalogUrl) return [];
        let urlWithPage = catalogUrl;
        if (urlWithPage.includes('${stremioSkip}')) {
            const skipValue = (page - 1) * 20;
            urlWithPage = urlWithPage.replace('${stremioSkip}', skipValue.toString());
        }
        urlWithPage = urlWithPage.replace('${page}', page.toString());
        const response = await fetch(urlWithPage);

        // Try parsing as JSON; fall back to extracting JSON from text when server returns HTML
        let data: any;
        try {
            data = await response.json();
        } catch (jsonErr) {
            const text = await response.text();
            const firstArray = text.indexOf('[');
            const firstObj = text.indexOf('{');
            const start = (firstArray !== -1 && (firstArray < firstObj || firstObj === -1)) ? firstArray : firstObj;
            if (start === -1) {
                console.warn('fetchAddonCatalog: response not JSON and no JSON found in text');
                return [];
            }
            const substr = text.slice(start);
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

        let results: any[] = [];
        if (addonType === 'stremio') {
            results = data?.metas || data?.results || data?.items || [];
        } else if (addonType === 'tmdbaddon') {
            results = data?.results || (Array.isArray(data) ? data : []);
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
                title: item.title || item.name || item.label || item.heading || item.title,
                poster_path: item.poster_path || item.poster || item.logo || item.background || item.image || item.thumbnail || item.thumb,
                media_type: (item.media_type === 'tv' || item.type === 'series' || item.type === 'tv' || item.kind === 'tv' || item.kind === 'series') ? 'tv' : 'movie',
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
