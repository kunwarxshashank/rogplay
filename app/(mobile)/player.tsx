import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MobilePlayer from '@/components/player/MobilePlayer';
import { useIptvStore } from '@/store/iptvStore';

export default function MobilePlayerScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();

    const {
        url,
        title,
        referer,
        origin,
        cookie,
        userAgent,
        headers,
        drmkeys,
        drmtype,
        channelLogo,
        channelGroup,
        epgUrl,
        channelId,
        channels: channelsParam,
        watchPartyCode,
        watchPartyUsername,
        playlistUrl,
        sourceType,
        poster,
        backdrop,
        contentType,
        tmdbId,
        season,
        episode,
        resumeMs,
        genre,
    } = params;

    const { currentChannels } = useIptvStore();

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

    useEffect(() => {
        if (!url) router.back();
    }, [url, router]);

    if (!url) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <MobilePlayer
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
                genre={genre as string}
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
