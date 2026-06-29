import { useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore, computeThemeColors } from '@/store/themeStore';
import { Colors } from '@/constants/Colors';

export function useTheme() {
  const settingsThemeName = useSettingsStore((s) => s.theme);
  const {
    themePalette,
    accentColorId,
    customHexAccent,
    borderRadius,
    cardElevation,
    animationIntensity,
  } = useThemeStore();

  const colors = useMemo(() => {
    // Always compute via the new theme engine for dynamic colors
    return computeThemeColors(
      themePalette,
      accentColorId,
      customHexAccent,
      borderRadius,
      cardElevation,
      animationIntensity,
    );
  }, [
    themePalette,
    accentColorId,
    customHexAccent,
    borderRadius,
    cardElevation,
    animationIntensity,
  ]);

  return { colors, theme: settingsThemeName };
}
