import axios from 'axios';
import { getExternalIds } from './tmdb';

interface SubtitleTrack {
    title: string;
    language: string;
    uri: string;
    index?: number;
}

interface SubtitleFetchParams {
    tmdbId?: string;
    imdbId?: string;
    contentType?: 'movie' | 'tv';
    season?: string;
    episode?: string;
}

const SUBTITLE_URLS = {
    movie: [
        'https://sub.vdrk.site/v2/movie/${tmdbid}',
        'https://opensubtitles-v3.strem.io/subtitles/movie/${imdbid}/videoSize=1105954079.json',
    ],
    series: [
        'https://opensubtitles-v3.strem.io/subtitles/series/${imdbid}:${season}:${episode}/videoSize=1105954079.json',
        'https://sub.vdrk.site/v2/tv/${tmdbid}/${season}/${episode}',
    ],
};

function interpolateUrl(template: string, params: SubtitleFetchParams): string {
    return template
        .replace('${tmdbid}', params.tmdbId || '')
        .replace('${imdbid}', params.imdbId || '')
        .replace('${season}', params.season || '')
        .replace('${episode}', params.episode || '');
}

function hasMissingPlaceholders(url: string): boolean {
    return url.includes('${') && url.includes('}');
}

function normalizeSubtitleEntry(entry: any): SubtitleTrack | null {
    const uri = entry.url || entry.file || entry.uri;
    if (!uri) return null;

    const label = entry.label || entry.language || entry.lang || entry.SubLanguage || 'Unknown';
    const langCode = entry.lang || entry.iso639 || 'en';

    const langName = label.includes(' - ') ? label.split(' - ')[0].trim() : label;

    return {
        title: langName,
        language: langCode,
        uri: uri,
    };
}

function normalizeSubtitlesResponse(data: any): SubtitleTrack[] {
    if (!data) return [];

    // Format 1: { subtitles: [...] }
    if (data.subtitles && Array.isArray(data.subtitles)) {
        return data.subtitles.map(normalizeSubtitleEntry).filter(Boolean) as SubtitleTrack[];
    }

    // Format 2: [...] array of { label, file } or { label, url }
    if (Array.isArray(data)) {
        return data.map(normalizeSubtitleEntry).filter(Boolean) as SubtitleTrack[];
    }

    return [];
}

function getExtension(uri: string): 'vtt' | 'srt' {
    const lower = uri.toLowerCase();
    if (lower.endsWith('.vtt')) return 'vtt';
    return 'srt';
}

function detectLanguageCode(label: string): string {
    const langMap: Record<string, string> = {
        'arabic': 'ar', 'english': 'en', 'spanish': 'es', 'french': 'fr',
        'german': 'de', 'italian': 'it', 'portuguese': 'pt', 'russian': 'ru',
        'japanese': 'ja', 'korean': 'ko', 'chinese': 'zh', 'hindi': 'hi',
        'bengali': 'bn', 'tamil': 'ta', 'telugu': 'te', 'urdu': 'ur',
        'indonesian': 'id', 'malay': 'ms', 'thai': 'th', 'vietnamese': 'vi',
        'turkish': 'tr', 'dutch': 'nl', 'polish': 'pl', 'swedish': 'sv',
        'danish': 'da', 'finnish': 'fi', 'norwegian': 'no', 'czech': 'cs',
        'romanian': 'ro', 'hungarian': 'hu', 'greek': 'el', 'hebrew': 'he',
    };
    const key = label.toLowerCase().trim();
    return langMap[key] || 'en';
}

export async function fetchOpenSubtitles(params: SubtitleFetchParams): Promise<SubtitleTrack[]> {
    const { contentType, tmdbId, imdbId, season, episode } = params;
    if (!tmdbId && !imdbId) return [];

    // Resolve IMDb ID from TMDB if not provided
    let resolvedImdbId = imdbId;
    if (!resolvedImdbId && tmdbId && contentType) {
        try {
            const external = await getExternalIds(contentType, tmdbId);
            if (external?.imdb_id) {
                resolvedImdbId = external.imdb_id;
            }
        } catch (e) {
            console.warn('Failed to resolve IMDb ID from TMDB:', (e as Error).message);
        }
    }

    const fetchParams = { ...params, imdbId: resolvedImdbId };

    const isMovie = contentType === 'movie';
    const urls = isMovie ? SUBTITLE_URLS.movie : SUBTITLE_URLS.series;
    const allSubtitles: SubtitleTrack[] = [];
    const seen = new Set<string>();

    for (const template of urls) {
        const url = interpolateUrl(template, fetchParams);
        if (!url || hasMissingPlaceholders(url)) continue;

        try {
            const response = await axios.get(url, { timeout: 8000 });
            const tracks = normalizeSubtitlesResponse(response.data);

            for (const track of tracks) {
                if (seen.has(track.uri)) continue;
                seen.add(track.uri);

                const ext = getExtension(track.uri);
                allSubtitles.push({
                    ...track,
                    title: track.title || track.language || 'Unknown',
                    language: track.language || detectLanguageCode(track.title || ''),
                });
            }
        } catch (e) {
            console.warn(`Failed to fetch subtitles from ${url}:`, (e as Error).message);
        }
    }

    return allSubtitles;
}
