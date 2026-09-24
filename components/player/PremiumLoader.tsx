import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { G, Line } from 'react-native-svg';

interface PremiumLoaderProps {
  size?: number;
  color?: string;
  style?: any;
}

export const PremiumLoader: React.FC<PremiumLoaderProps> = ({
  size = 60,
  color = '#ffffff',
  style,
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(12, {
        duration: 833,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // Use Math.floor to replicate discrete keyTimes in the original SVG
    const step = Math.floor(rotation.value);
    return {
      transform: [{ rotate: `${step * 30}deg` }],
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
        <Svg width={size} height={size} viewBox="0 0 2400 2400">
          <G strokeWidth="200" strokeLinecap="round" stroke={color} fill="none">
            <Line x1="1200" y1="600" x2="1200" y2="100" />
            <Line opacity="0.5" x1="1200" y1="2300" x2="1200" y2="1800" />
            <Line opacity="0.917" x1="900" y1="680.4" x2="650" y2="247.4" />
            <Line opacity="0.417" x1="1750" y1="2152.6" x2="1500" y2="1719.6" />
            <Line opacity="0.833" x1="680.4" y1="900" x2="247.4" y2="650" />
            <Line opacity="0.333" x1="2152.6" y1="1750" x2="1719.6" y2="1500" />
            <Line opacity="0.75" x1="600" y1="1200" x2="100" y2="1200" />
            <Line opacity="0.25" x1="2300" y1="1200" x2="1800" y2="1200" />
            <Line opacity="0.667" x1="680.4" y1="1500" x2="247.4" y2="1750" />
            <Line opacity="0.167" x1="2152.6" y1="650" x2="1719.6" y2="900" />
            <Line opacity="0.583" x1="900" y1="1719.6" x2="650" y2="2152.6" />
            <Line opacity="0.083" x1="1750" y1="247.4" x2="1500" y2="680.4" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
