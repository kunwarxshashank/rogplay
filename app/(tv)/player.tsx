import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import TVPlayer from '@/components/player/TVPlayer';
import { useIptvStore } from '@/store/iptvStore';

export default function TVPlayerScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();

    const {
        url,
        title,
        referer,
        origin,
        cookie,
        userAgent,
        drmkeys,
        drmtype,
        headers,
        channelLogo,
        channelGroup,
        epgUrl,
        channelId,
        channels: channelsParam,
        sourceType,
        poster,
        backdrop,
        contentType,
        tmdbId,
        season,
        episode,
        resumeMs,
    } = params;

    const { currentChannels } = useIptvStore();

    // Parse channels JSON if provided, otherwise fallback to store
    const channels = useMemo(() => {
        if (channelsParam && typeof channelsParam === 'string') {
            try {
                return JSON.parse(channelsParam);
            } catch {
                return currentChannels;
            }
        }
        return currentChannels;
    }, [channelsParam, currentChannels]);

    // Ensure URL is present
    if (!url) {
        // Handle error or redirect back
        // For now just return empty view or redirect
        React.useEffect(() => {
            if (!url) router.back();
        }, [url]);
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <TVPlayer
                url={url as string}
                title={title as string}
                referer={referer as string}
                origin={origin as string}
                cookie={cookie as string}
                userAgent={userAgent as string}
                drmkeys={drmkeys as string}
                drmtype={drmtype as string}
                headers={headers}
                onBack={() => router.back()}
                channelLogo={channelLogo as string}
                channelGroup={channelGroup as string}
                epgUrl={epgUrl as string}
                channelId={channelId as string}
                channels={channels}
                sourceType={sourceType as 'cinema' | undefined}
                poster={poster as string}
                backdrop={backdrop as string}
                contentType={contentType as 'movie' | 'tv' | undefined}
                tmdbId={tmdbId as string}
                season={season as string}
                episode={episode as string}
                resumeMs={resumeMs as string}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
});
