import { usePathname, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useEffect } from 'react';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.m3u8', '.avi', '.ts', '.webm', '.mov', '.flv'];

function looksLikeVideoPath(path: string): boolean {
  const lower = path.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext)) || !lower.includes('/');
}

export default function NotFoundScreen() {
  const pathname = usePathname();
  const router = useRouter();

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
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.dark.primary || '#2e78b7'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.dark.background,
  },
});
