import { useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore, computeThemeColors } from '@/store/themeStore';
import { Colors } from '@/constants/Colors';

export function useTheme() {
  const settingsThemeName = useSettingsStore((s) => s.theme);
  // Subscribe only to the fields that affect computed colors, so unrelated
  // theme-store mutations (posterStyle, homeBuilder, etc.) don't re-render
  // every component that reads the theme.
  const themePalette = useThemeStore((s) => s.themePalette);
  const accentColorId = useThemeStore((s) => s.accentColorId);
  const customHexAccent = useThemeStore((s) => s.customHexAccent);
  const borderRadius = useThemeStore((s) => s.borderRadius);
  const cardElevation = useThemeStore((s) => s.cardElevation);
  const animationIntensity = useThemeStore((s) => s.animationIntensity);

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
