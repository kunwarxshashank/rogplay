import { usePathname, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useEffect } from 'react';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.m3u8', '.avi', '.ts', '.webm', '.mov', '.flv'];

function looksLikeVideoPath(path: string): boolean {
  const lower = path.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext)) || !lower.includes('/');
}

export default function NotFoundScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (!pathname || pathname.startsWith('+') || pathname.startsWith('_')) return;

    if (looksLikeVideoPath(pathname)) {
      const videoUrl = `https://${pathname}`;
      const title = decodeURIComponent(pathname.split('/').pop()?.split('?')[0] || 'External Stream');
      const playerPath = Platform.isTV ? '/(tv)/player' : '/(mobile)/player';
      router.replace({ pathname: playerPath as any, params: { url: videoUrl, title } });
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
