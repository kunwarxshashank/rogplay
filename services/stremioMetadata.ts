import axios from 'axios';

export async function getStremioMeta(id: string, type: 'movie' | 'series', stremioAddons: any[]) {
    const isCustom = isNaN(Number(id)) && !id.startsWith('tt');
    let metaUrl = '';

    if (isCustom) {
        // Find which addon provides this ID
        for (const addon of stremioAddons) {
            if (!addon.manifest || !addon.manifest.resources) continue;

            const metaResource = addon.manifest.resources.find((r: any) =>
                (typeof r === 'object' && r.name === 'meta' && r.idPrefixes?.some((p: string) => id.startsWith(p)))
            );

            if (metaResource || (addon.manifest.idPrefixes && addon.manifest.idPrefixes.some((p: string) => id.startsWith(p)))) {
                const baseUrl = addon.url.replace('/manifest.json', '');
                metaUrl = `${baseUrl}/meta/${type}/${encodeURIComponent(id)}.json`;
                break;
            }
        }
    } else {
        // If it's standard IMDB tt... try to find an addon that supports movies/series meta
        for (const addon of stremioAddons) {
            if (addon.manifest?.resources?.some((r: any) => typeof r === 'object' ? r.name === 'meta' : r === 'meta')) {
                const baseUrl = addon.url.replace('/manifest.json', '');
                metaUrl = `${baseUrl}/meta/${type}/${encodeURIComponent(id)}.json`;
                break; // Just use the first one that provides meta
            }
        }
    }

    if (!metaUrl) {
        // fallback, could just error
        throw new Error(`No Stremio addon found that supports fetching meta for ID: ${id}`);
    }

    const { data } = await axios.get(metaUrl);
    const meta = data.meta;

    if (!meta) throw new Error("Stremio meta returned null");

    // Convert to TMDB format
    return {
        id: meta.id,
        title: meta.name,
        name: meta.name,
        overview: meta.description || '',
        poster_path: meta.poster,
        backdrop_path: meta.background || meta.poster,
        vote_average: meta.imdbRating ? parseFloat(meta.imdbRating) : 0,
        release_date: meta.released?.split('T')[0],
        first_air_date: meta.released?.split('T')[0],
        genres: meta.genres ? meta.genres.map((g: string) => ({ id: Math.random(), name: g })) : [],
        credits: {
            cast: meta.cast ? meta.cast.map((c: string) => ({ name: c })) : [],
            crew: meta.director ? meta.director.map((d: string) => ({ name: d, job: 'Director' })) : [],
        },
        similar: { results: [] },
        videos: { results: [] },
        number_of_seasons: meta.videos ? Math.max(...meta.videos.map((v: any) => v.season || 1)) : 1,
        seasons: meta.videos ? generateSeasonsFromVideos(meta.videos) : [],

        // Pass the original payload so getSeasonDetails can pull episodes from it
        stremioMeta: meta
    };
}

function generateSeasonsFromVideos(videos: any[]) {
    const seasonsMap = new Map<number, number>();
    videos.forEach(v => {
        const s = v.season || 1;
        seasonsMap.set(s, (seasonsMap.get(s) || 0) + 1);
    });

    return Array.from(seasonsMap.keys()).sort((a, b) => a - b).map(season => ({
        season_number: season,
        name: `Season ${season}`,
        episode_count: seasonsMap.get(season),
    }));
}

export async function getStremioSeason(tvId: string, seasonNumber: number, type: 'series', stremioAddons: any[]) {
    const details = await getStremioMeta(tvId, type, stremioAddons);
    const videos = details.stremioMeta?.videos || [];

    const seasonVideos = videos
        .filter((v: any) => (v.season || 1) === seasonNumber)
        .sort((a: any, b: any) => (a.episode || 0) - (b.episode || 0));

    return {
        episodes: seasonVideos.map((v: any) => ({
            id: v.id, // we will pass real episode ID to player
            episode_number: v.episode,
            name: v.title || `Episode ${v.episode}`,
            overview: v.overview || '',
            still_path: v.thumbnail || '',
            vote_average: 0
        }))
    };
}
