export interface PlaylistItem {
    id: string;
    title: string;
    imageUrl: string;
    url: string;
    group?: string;
    description?: string;
    drmtype?: string;
    drmkeys?: string;
    referer?: string;
    origin?: string;
    cookie?: string;
    userAgent?: string;
    headers?: string;
    type?: string;
    tmdb?: string;
    epgUrl?: string;
    channelId?: string;
}

export const getFirstAvailableValue = (obj: any, keys: string[]) => {
    for (const key of keys) {
        if (key in obj && obj[key]) return obj[key];
    }
    return null;
};

const parseExtinfAttributes = (line: string) => {
    const attrs: Record<string, string> = {};
    const attrRegex = /([a-zA-Z0-9-_]+)=("([^"]*)"|'([^']*)'|([^,\s]+))/g;
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(line)) !== null) {
        attrs[match[1].toLowerCase()] = (match[3] ?? match[4] ?? match[5] ?? '').trim();
    }

    return attrs;
};

const splitExtinfMetadataAndTitle = (line: string) => {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let titleCommaIndex = -1;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const prev = i > 0 ? line[i - 1] : '';

        if (char === '"' && !inSingleQuote && prev !== '\\') {
            inDoubleQuote = !inDoubleQuote;
            continue;
        }

        if (char === '\'' && !inDoubleQuote && prev !== '\\') {
            inSingleQuote = !inSingleQuote;
            continue;
        }

        if (char === ',' && !inSingleQuote && !inDoubleQuote) {
            titleCommaIndex = i;
        }
    }

    if (titleCommaIndex === -1) {
        return { metadata: line, title: '' };
    }

    return {
        metadata: line.slice(0, titleCommaIndex),
        title: line.slice(titleCommaIndex + 1).trim(),
    };
};

const safeDecode = (value: string) => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const normalizeTitle = (value?: string) => {
    if (!value) return '';

    const title = safeDecode(value.trim()).replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
    if (!title) return '';

    const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(title);
    const looksLikePathBlob = /\//.test(title) && !/\s/.test(title) && /[a-z0-9_-]+,[a-z0-9_-]+/i.test(title);

    if (looksLikeUrl || looksLikePathBlob) {
        return '';
    }

    return title;
};

const deriveTitleFromUrl = (streamUrl: string) => {
    const base = streamUrl.split('|')[0]?.trim();
    if (!base) return '';

    let pathPart = '';
    try {
        pathPart = new URL(base).pathname;
    } catch {
        pathPart = base;
    }

    const candidate = pathPart
        .split('/')
        .filter(Boolean)
        .pop()
        ?.split('?')[0]
        ?.replace(/\.[a-z0-9]{2,5}$/i, '') || '';

    return normalizeTitle(candidate);
};

const getUrlParam = (url: string, key: string) => {
    const pattern = new RegExp(`[?&|]${key}="?([^"&|]*)"?`, 'i');
    const match = url.match(pattern);
    return match?.[1] || '';
};

const parseHeaderBlob = (headerBlob: string) => {
    if (!headerBlob) return {};

    try {
        const parsed = JSON.parse(headerBlob);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        const fallback: Record<string, string> = {};
        const normalized = headerBlob.trim().replace(/^[|&]/, '');

        for (const pair of normalized.split(/[|;&]/)) {
            const part = pair.trim();
            if (!part) continue;

            const separator = part.includes(':') ? ':' : '=';
            const separatorIndex = part.indexOf(separator);
            if (separatorIndex < 1) continue;

            const headerKey = part.slice(0, separatorIndex).trim();
            const headerValue = part.slice(separatorIndex + 1).trim().replace(/^"|"$/g, '');

            if (headerKey && headerValue) {
                fallback[headerKey] = headerValue;
            }
        }

        return fallback;
    }
};

const isLikelyStreamUrl = (line: string) => {
    if (!line || line.startsWith('#')) return false;

    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(line)) return true;
    if (/^(rtmp|rtsp|udp|mms):/i.test(line)) return true;
    if (/\.(m3u8|mpd|ts|mp4|mkv|avi)(\?|$)/i.test(line)) return true;

    return false;
};

export const parseM3u = (content: string): PlaylistItem[] => {
    if (!content.includes("#EXTINF")) return [];

    // Extract all EPG URLs from #EXTM3U header (may have multiple url-tvg/x-tvg-url/tvg-url)
    const epgHeaderLines = content.match(/^#EXTM3U[^\n]*$/gim) || [];
    const epgUrlRegex = /(?:url-tvg|x-tvg-url|tvg-url)=(?:"([^"]+)"|'([^']+)'|([^\s]+))/gi;
    const epgUrls: string[] = [];

    for (const headerLine of epgHeaderLines) {
        let epgMatch: RegExpExecArray | null;
        while ((epgMatch = epgUrlRegex.exec(headerLine)) !== null) {
            const urlValue = epgMatch[1] || epgMatch[2] || epgMatch[3] || '';
            if (urlValue && !epgUrls.includes(urlValue)) {
                epgUrls.push(urlValue);
            }
        }
    }

    const epgUrl = epgUrls.length > 0 ? epgUrls.join(',') : '';

    const lines = content.split(/\r?\n/);
    const items: PlaylistItem[] = [];

    let currentEntry: Partial<PlaylistItem> | null = null;

    const finalizeEntry = (streamUrl: string) => {
        if (!currentEntry) return;

        const url = streamUrl.trim();
        const fromUrlReferer = getUrlParam(url, 'referer');
        const fromUrlOrigin = getUrlParam(url, 'origin');
        const fromUrlCookie = getUrlParam(url, 'cookie');
        const fromUrlUserAgent = getUrlParam(url, 'user-agent');

        const parsedExtraHeaders = parseHeaderBlob(currentEntry.headers || '');

        const referer = currentEntry.referer || fromUrlReferer || parsedExtraHeaders.Referer || '';
        const origin = currentEntry.origin || fromUrlOrigin || parsedExtraHeaders.Origin || '';
        const cookie = currentEntry.cookie || fromUrlCookie || parsedExtraHeaders.Cookie || '';
        const userAgent = currentEntry.userAgent || fromUrlUserAgent || parsedExtraHeaders['User-Agent'] || '';

        const mergedHeaders = {
            ...parsedExtraHeaders,
            ...(referer ? { Referer: referer } : {}),
            ...(origin ? { Origin: origin } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
            ...(userAgent ? { 'User-Agent': userAgent } : {}),
        };

        const normalizedHeaders = Object.keys(mergedHeaders).length > 0
            ? JSON.stringify(mergedHeaders)
            : '';

        const resolvedTitle = normalizeTitle(currentEntry.title) || deriveTitleFromUrl(url) || 'No Title';

        items.push({
            id: items.length.toString(),
            title: resolvedTitle,
            imageUrl: currentEntry.imageUrl || '',
            url,
            group: currentEntry.group || '',
            drmtype: (currentEntry.drmtype || '').toUpperCase(),
            drmkeys: currentEntry.drmkeys || '',
            referer,
            origin,
            cookie,
            userAgent,
            headers: normalizedHeaders,
            epgUrl: currentEntry.epgUrl || epgUrl || '',
            channelId: currentEntry.channelId || '',
        });

        currentEntry = null;
    };

    for (const rawLine of lines) {
        const line = rawLine.replace(/^\uFEFF/, '').trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF')) {
            const { metadata, title } = splitExtinfMetadataAndTitle(line);
            const attrs = parseExtinfAttributes(metadata);

            currentEntry = {
                title: normalizeTitle(
                    attrs['tvg-name'] ||
                    attrs['name'] ||
                    attrs['channel-name'] ||
                    attrs['display-name'] ||
                    title
                ) || 'No Title',
                imageUrl: attrs['tvg-logo'] || '',
                group: attrs['group-title'] || '',
                channelId: attrs['tvg-id'] || '',
                epgUrl,
            };
            continue;
        }

        if (!currentEntry) continue;

        if (line.startsWith('#KODIPROP:inputstream.adaptive.license_type=')) {
            currentEntry.drmtype = line.split('=')[1]?.trim() || '';
            continue;
        }

        if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
            currentEntry.drmkeys = line.split('=')[1]?.trim() || '';
            continue;
        }

        if (line.startsWith('#EXTHTTP:')) {
            currentEntry.headers = line.replace('#EXTHTTP:', '').trim();
            continue;
        }

        if (line.startsWith('#EXTGRP:')) {
            currentEntry.group = line.replace('#EXTGRP:', '').trim();
            continue;
        }

        if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
            currentEntry.userAgent = line.replace('#EXTVLCOPT:http-user-agent=', '').trim();
            continue;
        }

        if (line.startsWith('#EXTVLCOPT:http-referrer=')) {
            currentEntry.referer = line.replace('#EXTVLCOPT:http-referrer=', '').trim();
            continue;
        }

        if (line.startsWith('#EXTVLCOPT:http-origin=')) {
            currentEntry.origin = line.replace('#EXTVLCOPT:http-origin=', '').trim();
            continue;
        }

        if (line.startsWith('#EXTVLCOPT:http-cookie=')) {
            currentEntry.cookie = line.replace('#EXTVLCOPT:http-cookie=', '').trim();
            continue;
        }

        if (isLikelyStreamUrl(line)) {
            finalizeEntry(line);
        }
    }

    return items;
};

export const parseJsonPlaylist = (data: any[]): PlaylistItem[] => {
    if (!Array.isArray(data)) return [];

    return data.map((item, index) => ({
        id: item.id || index.toString(),
        title: normalizeTitle(getFirstAvailableValue(item, ["title", "Title", "name", "Name", "EVENT_NAME", "event_name", "TITLE"])) || "No Title",
        imageUrl: getFirstAvailableValue(item, ["logo", "Logo", "LOGO", "Poster", "poster", "POSTER", "image", "Image", "src", "Src", "SRC", "IMAGE"]) || "",
        url: getFirstAvailableValue(item, ["url", "Url", "URL", "link", "Link", "LINK", "file", "stream", "Stream"]) || "",
        group: getFirstAvailableValue(item, ["language", "group", "Type", "group-title", "Category", "category", "genre", "Genre"]),
        drmkeys: getFirstAvailableValue(item, ["license", "drmkeys", "license_url", "clearkey", "keys", "drmurl"]),
        drmtype: getFirstAvailableValue(item, ["drmtype", "license_type"]),
        referer: getFirstAvailableValue(item, ["referer", "referrer", "Referer", "Referrer"]),
        origin: getFirstAvailableValue(item, ["origin", "Origin"]),
        userAgent: getFirstAvailableValue(item, ["userAgent", "User-Agent", "user-agent"]),
        cookie: getFirstAvailableValue(item, ["cookie", "Cookie"]),
        headers: getFirstAvailableValue(item, ["headers", "Headers"]),
        type: getFirstAvailableValue(item, ["type", "Type"]),
        tmdb: getFirstAvailableValue(item, ["tmdb", "tmdb_id", "TMDB", "TMDB_ID"]),
        epgUrl: getFirstAvailableValue(item, ["epg", "epgUrl", "epg_url", "xmltv"]),
        channelId: getFirstAvailableValue(item, ["channelId", "channel_id", "tvg-id", "tvgId"]),
    }));
};
