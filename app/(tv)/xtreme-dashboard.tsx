import React, { useEffect, useState, useMemo } from 'react';
import { BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { XtremeApiClient, XtremeCategory, XtremeSeries } from '@/services/xtremeApi';
import CatalogBrowser, { BrowserItem } from '@/components/CatalogBrowser';

type ViewState = 'main' | 'categories' | 'streams' | 'series_info';
type MediaType = 'live' | 'vod' | 'series';

export default function XtremeDashboardScreen() {
    const { title, serverUrl, username, password } = useLocalSearchParams();
    const router = useRouter();

    const [viewStack, setViewStack] = useState<{ view: ViewState, type?: MediaType, category?: XtremeCategory, series?: XtremeSeries }[]>([{ view: 'main' }]);
    const currentView = viewStack[viewStack.length - 1];

    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Data stores
    const [categories, setCategories] = useState<XtremeCategory[]>([]);
    const [streams, setStreams] = useState<any[]>([]); // streams or series

    const client = useMemo(() => {
        if (!serverUrl || !username || !password) return null;
        return new XtremeApiClient(serverUrl as string, username as string, password as string);
    }, [serverUrl, username, password]);

    useEffect(() => {
        if (!client) {
            router.back();
        }
    }, [client]);

    const handleBack = () => {
        if (viewStack.length > 1) {
            setViewStack(prev => prev.slice(0, -1));
            setSearchQuery('');
        } else {
            router.back();
        }
    };

    // Support for Android TV / mobile hardware back button to pop internal stack
    useEffect(() => {
        const onHardwareBackPress = () => {
            if (viewStack.length > 1) {
                handleBack();
                return true; // prevent router.back()
            }
            return false;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
        return () => subscription.remove();
    }, [viewStack]);

    const loadCategories = async (type: MediaType) => {
        if (!client) return;
        setLoading(true);
        try {
            let data: XtremeCategory[] = [];
            if (type === 'live') data = await client.getLiveCategories();
            else if (type === 'vod') data = await client.getVodCategories();
            else if (type === 'series') data = await client.getSeriesCategories();

            setCategories(data);
            setViewStack(prev => [...prev, { view: 'categories', type }]);
            setSearchQuery('');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadStreams = async (type: MediaType, category: XtremeCategory) => {
        if (!client) return;
        setLoading(true);
        try {
            let data: any[] = [];
            let cId = category.category_id;
            if (cId === '__all__') cId = ''; // pseudo all parameter if needed

            if (type === 'live') data = await client.getLiveStreams(cId);
            else if (type === 'vod') data = await client.getVodStreams(cId);
            else if (type === 'series') data = await client.getSeries(cId);

            setStreams(data || []);
            setViewStack(prev => [...prev, { view: 'streams', type, category }]);
            setSearchQuery('');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadSeriesInfo = async (series: XtremeSeries) => {
        if (!client) return;
        setLoading(true);
        try {
            const data = await client.getSeriesInfo(series.series_id.toString());
            const epList: any[] = [];
            if (data && data.episodes) {
                Object.values(data.episodes).forEach((season: any) => {
                    if (Array.isArray(season)) {
                        epList.push(...season);
                    }
                });
            }
            setStreams(epList);
            setViewStack(prev => [...prev, { view: 'series_info', type: 'series', series }]);
            setSearchQuery('');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const playStream = (item: any, type: MediaType) => {
        if (!client) return;
        let url = '';
        let itemTitle = '';

        if (type === 'live') {
            url = client.buildStreamUrl('live', item.stream_id, 'ts');
            itemTitle = item.name;
        } else if (type === 'vod') {
            url = client.buildStreamUrl('movie', item.stream_id, item.container_extension || 'mp4');
            itemTitle = item.name;
        } else if (type === 'series') {
            url = client.buildStreamUrl('series', item.id, item.container_extension || 'mp4');
            itemTitle = item.title || `Episode ${item.episode_num}`;
        }

        router.push({
            pathname: '/player',
            params: {
                url: encodeURIComponent(url),
                title: itemTitle,
                channelLogo: item.stream_icon || item.cover,
                isLive: type === 'live' ? 'true' : 'false'
            }
        });
    };

    const getHeaderTitle = () => {
        switch (currentView.view) {
            case 'main': return (title as string) || 'Xtreme Codes';
            case 'categories': return currentView.type === 'vod' ? 'Movies' : currentView.type === 'live' ? 'Live TV' : 'Series';
            case 'streams': return currentView.category?.category_name || 'Streams';
            case 'series_info': return currentView.series?.name || 'Episodes';
            default: return 'Xtreme Dashboard';
        }
    };

    const handleItemPress = (browserItem: BrowserItem) => {
        if (currentView.view === 'main') {
            loadCategories(browserItem.id as MediaType);
        } else if (currentView.view === 'categories') {
            const cat = categories.find(c => c.category_id.toString() === browserItem.id);
            if (cat) loadStreams(currentView.type!, cat);
        } else if (currentView.view === 'streams') {
            if (currentView.type === 'series') {
                const s = streams.find(st => st.series_id?.toString() === browserItem.id);
                if (s) loadSeriesInfo(s);
            } else {
                const s = streams.find(st => st.stream_id?.toString() === browserItem.id);
                if (s) playStream(s, currentView.type!);
            }
        } else if (currentView.view === 'series_info') {
            const ep = streams.find(st => st.id?.toString() === browserItem.id);
            if (ep) playStream(ep, 'series');
        }
    };

    // Construct unified items array for CatalogBrowser
    const computedItems: BrowserItem[] = useMemo(() => {
        const q = searchQuery.toLowerCase();

        if (currentView.view === 'main') {
            return [
                { id: 'live', title: 'Live TV', subtitle: 'TV Channels', isLive: true },
                { id: 'vod', title: 'Movies', subtitle: 'Video on Demand' },
                { id: 'series', title: 'Series', subtitle: 'TV Shows' }
            ];
        }

        if (currentView.view === 'categories') {
            let filtered = categories;
            if (q) filtered = filtered.filter(c => c.category_name.toLowerCase().includes(q));
            return filtered.map(c => ({
                id: c.category_id.toString(),
                title: c.category_name,
                subtitle: currentView.type === 'live' ? 'Live TV Category' : (currentView.type === 'vod' ? 'Movie Category' : 'Series Category'),
            }));
        }

        if (currentView.view === 'streams' || currentView.view === 'series_info') {
            let filtered = streams;
            if (q) filtered = filtered.filter(s => (s.name || s.title || '').toLowerCase().includes(q));

            return filtered.map((s, idx) => {
                const isLive = currentView.type === 'live';
                const isSeries = currentView.view === 'streams' && currentView.type === 'series';
                const isEp = currentView.view === 'series_info';

                return {
                    id: (s.stream_id || s.series_id || s.id || idx).toString(),
                    title: s.name || s.title || (isEp ? `Episode ${s.episode_num}` : 'Unknown'),
                    subtitle: isEp ? `Season ${s.season} Episode ${s.episode_num}` : currentView.category?.category_name,
                    imageUrl: s.stream_icon || s.cover,
                    isLive
                };
            });
        }

        return [];
    }, [currentView, categories, streams, searchQuery]);

    return (
        <CatalogBrowser
            title={getHeaderTitle()}
            onBack={handleBack}
            categories={[]}
            items={computedItems}
            loading={loading}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onItemPress={handleItemPress}
            isLiveMode={currentView.type === 'live' && currentView.view === 'streams'}
        />
    );
}
