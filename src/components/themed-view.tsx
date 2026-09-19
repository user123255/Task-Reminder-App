import { View, type ViewProps } from 'react-native';

import type { ThemePalette } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  type?: keyof ThemePalette;
  /** Alias. */
  color?: keyof ThemePalette;
};

export function ThemedView({
  style,
  type,
  color,
  ...rest
}: ThemedViewProps) {
  const theme = useTheme();
  const bg = type ?? color ?? 'background';

  return (
    <View
      style={[{ backgroundColor: theme.colors[bg] }, style]}
      {...rest}
    />
  );
}