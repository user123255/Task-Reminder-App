import {
  Text,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ThemePalette } from '@/constants/theme';

export type ThemedTextVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'heading'
  | 'default'
  | 'body'
  | 'small'
  | 'smallBold'
  | 'caption'
  | 'label'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  variant?: ThemedTextVariant;
  /** Alias kept for backward compat with existing code. */
  type?: ThemedTextVariant;
  color?: keyof ThemePalette;
  /** Alias kept for backward compat. */
  themeColor?: keyof ThemePalette;
};

export function ThemedText({
  style,
  variant,
  type,
  color,
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const v = variant ?? type ?? 'default';
  const c = color ?? themeColor ?? 'text';

  return (
    <Text
      style={[
        { color: theme.colors[c] },
        variantStyle(v, theme),
        style,
      ]}
      {...rest}
    />
  );
}

function variantStyle(
  variant: ThemedTextVariant,
  theme: ReturnType<typeof useTheme>
): TextStyle {
  const { fontSize, fontWeight, lineHeight } = theme;

  switch (variant) {
    case 'display':
      return {
        fontSize: fontSize.display,
        lineHeight: Math.round(fontSize.display * lineHeight.tight),
        fontWeight: fontWeight.heavy,
        letterSpacing: -0.6,
      };
    case 'title':
      return {
        fontSize: fontSize.xxl,
        lineHeight: Math.round(fontSize.xxl * lineHeight.tight),
        fontWeight: fontWeight.bold,
        letterSpacing: -0.3,
      };
    case 'subtitle':
      return {
        fontSize: fontSize.xl,
        lineHeight: Math.round(fontSize.xl * lineHeight.snug),
        fontWeight: fontWeight.semibold,
      };
    case 'heading':
      return {
        fontSize: fontSize.lg,
        lineHeight: Math.round(fontSize.lg * lineHeight.snug),
        fontWeight: fontWeight.bold,
      };
    case 'default':
    case 'body':
      return {
        fontSize: fontSize.base,
        lineHeight: Math.round(fontSize.base * lineHeight.normal),
        fontWeight: fontWeight.medium,
      };
    case 'small':
      return {
        fontSize: fontSize.sm,
        lineHeight: Math.round(fontSize.sm * lineHeight.normal),
        fontWeight: fontWeight.medium,
      };
    case 'smallBold':
      return {
        fontSize: fontSize.sm,
        lineHeight: Math.round(fontSize.sm * lineHeight.normal),
        fontWeight: fontWeight.bold,
      };
    case 'caption':
      return {
        fontSize: fontSize.xs,
        lineHeight: Math.round(fontSize.xs * lineHeight.normal),
        fontWeight: fontWeight.semibold,
        letterSpacing: 0.4,
      };
    case 'label':
      return {
        fontSize: fontSize.xs,
        lineHeight: Math.round(fontSize.xs * lineHeight.normal),
        fontWeight: fontWeight.heavy,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
      };
    case 'link':
      return {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
      };
    case 'linkPrimary':
      return {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: theme.colors.primary,
      };
    case 'code':
      return {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        fontFamily: 'monospace',
      };
  }
}