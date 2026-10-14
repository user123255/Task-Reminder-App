import { useMemo } from 'react';

import {
  Colors,
  createShadows,
  FontSizes,
  FontWeights,
  Layout,
  LineHeights,
  Radii,
  Spacing,
  type ThemePalette,
  type ThemeScheme,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type Theme = {
  scheme: ThemeScheme;
  colors: ThemePalette;
  spacing: typeof Spacing;
  radii: typeof Radii;
  fontSize: typeof FontSizes;
  fontWeight: typeof FontWeights;
  lineHeight: typeof LineHeights;
  layout: typeof Layout;
  shadows: ReturnType<typeof createShadows>;
};

/**
 * The single source of truth for theming across the app.
 *
 * Usage:
 *
 *   const theme = useTheme();
 *   <View style={{ backgroundColor: theme.colors.surface, padding: theme.spacing.four }} />
 *
 * Never hardcode hex values, spacing, or radii in screens.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const resolved: ThemeScheme =
    scheme === 'dark' ? 'dark' : 'light';

  return useMemo(() => {
    const colors = Colors[resolved];
    return {
      scheme: resolved,
      colors,
      spacing: Spacing,
      radii: Radii,
      fontSize: FontSizes,
      fontWeight: FontWeights,
      lineHeight: LineHeights,
      layout: Layout,
      shadows: createShadows(colors.shadow),
    };
  }, [resolved]);
}