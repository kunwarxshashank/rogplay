import React, { useMemo } from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import { Image, ImageProps as ExpoImageProps, ImageContentFit } from 'expo-image';

interface OptimizedImageProps extends Omit<ExpoImageProps, 'source' | 'style'> {
    source: any;
    style?: StyleProp<ImageStyle>;
    /** Stable key so recycled cells (FlashList/FlatList) swap images cleanly. Defaults to the uri. */
    recyclingKey?: string;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

const RESIZE_TO_CONTENT_FIT: Record<string, ImageContentFit> = {
    cover: 'cover',
    contain: 'contain',
    stretch: 'fill',
    center: 'contain',
};

/**
 * Thin wrapper around expo-image providing memory+disk caching, smooth
 * cross-fade and recycling support for virtualized lists. Drop-in replacement
 * for the previous Animated.Image based implementation.
 */
function OptimizedImage({
    source,
    style,
    recyclingKey,
    resizeMode,
    contentFit,
    transition,
    ...rest
}: OptimizedImageProps) {
    const uri = typeof source === 'object' && source ? source.uri : undefined;

    const resolvedContentFit: ImageContentFit =
        contentFit || (resizeMode ? RESIZE_TO_CONTENT_FIT[resizeMode] : 'cover');

    const normalizedSource = useMemo(() => {
        if (typeof source === 'number') return source; // local require()
        if (typeof source === 'string') return { uri: source };
        return source;
    }, [source]);

    return (
        <Image
            {...rest}
            source={normalizedSource}
            style={style as StyleProp<ImageStyle>}
            recyclingKey={recyclingKey ?? uri}
            cachePolicy="memory-disk"
            contentFit={resolvedContentFit}
            transition={transition ?? 200}
        />
    );
}

export default React.memo(OptimizedImage);
