import React, { useRef } from 'react';
import { Animated, ImageProps, ImageStyle, StyleProp } from 'react-native';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
    source: any;
    style?: StyleProp<ImageStyle>;
}

export default function OptimizedImage({ source, style, onLoad, ...rest }: OptimizedImageProps) {
    const opacity = useRef(new Animated.Value(0)).current;

    const handleLoad = (e: any) => {
        Animated.timing(opacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
        }).start();
        onLoad?.(e);
    };

    // Allow passing cache hint in source (e.g. { uri, cache: 'force-cache' })
    return (
        <Animated.Image
            {...rest}
            source={source}
            onLoad={handleLoad}
            style={[{ opacity }, style]}
        />
    );
}
