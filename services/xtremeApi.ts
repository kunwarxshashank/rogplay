export interface XtremeCategory {
    category_id: string;
    category_name: string;
    parent_id?: number;
}

export interface XtremeStream {
    num: number;
    name: string;
    stream_type: string;
    stream_id: string | number;
    stream_icon: string;
    epg_channel_id?: string;
    added?: string;
    category_id: string;
    custom_sid?: string;
    tv_archive?: number;
    direct_source?: string;
    tv_archive_duration?: number;
}

export interface XtremeSeries {
    num: number;
    name: string;
    series_id: string | number;
    cover: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    last_modified?: string;
    rating?: string;
    category_id: string;
}

export interface XtremeEpisode {
    id: string;
    episode_num: number;
    title: string;
    container_extension: string;
    info: {
        plot: string;
        releasedate: string;
    };
    custom_sid: string;
    added: string;
    season: number;
    direct_source: string;
}

export class XtremeApiClient {
    constructor(
        private serverUrl: string,
        private username: string,
        private password: string
    ) {
        if (this.serverUrl.endsWith('/')) {
            this.serverUrl = this.serverUrl.slice(0, -1);
        }
    }

    private async req(action: string, params: Record<string, string> = {}) {
        const url = new URL(`${this.serverUrl}/player_api.php`);
        url.searchParams.append('username', this.username);
        url.searchParams.append('password', this.password);
        if (action) {
            url.searchParams.append('action', action);
        }
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value);
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(url.toString(), {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'RogPlay/6.5.0',
                    'Accept': 'application/json, text/plain, */*',
                },
            });
            if (!response.ok) {
                throw new Error(`Xtreme API error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    async authenticate() {
        return await this.req('');
    }

    async getLiveCategories(): Promise<XtremeCategory[]> {
        return await this.req('get_live_categories');
    }

    async getVodCategories(): Promise<XtremeCategory[]> {
        return await this.req('get_vod_categories');
    }

    async getSeriesCategories(): Promise<XtremeCategory[]> {
        return await this.req('get_series_categories');
    }

    async getLiveStreams(categoryId?: string): Promise<XtremeStream[]> {
        if (categoryId) {
            return await this.req('get_live_streams', { category_id: categoryId });
        }
        return await this.req('get_live_streams');
    }

    async getVodStreams(categoryId?: string): Promise<XtremeStream[]> {
        if (categoryId) {
            return await this.req('get_vod_streams', { category_id: categoryId });
        }
        return await this.req('get_vod_streams');
    }

    async getSeries(categoryId?: string): Promise<XtremeSeries[]> {
        if (categoryId) {
            return await this.req('get_series', { category_id: categoryId });
        }
        return await this.req('get_series');
    }

    async getSeriesInfo(seriesId: string): Promise<any> {
        return await this.req('get_series_info', { series_id: seriesId });
    }

    buildStreamUrl(type: 'live' | 'movie' | 'series', streamId: string | number, extension: string = 'ts'): string {
        return `${this.serverUrl}/${type}/${this.username}/${this.password}/${streamId}.${extension}`;
    }
}
