import { useMemo } from 'react';
import { useUIStore } from '../stores/uiStore';

export interface ChartTheme {
  s1: string;
  s2: string;
  accent: string;
  danger: string;
  grid: string;
  axis: string;
  ttBg: string;
  ttBorder: string;
  ttText: string;
  surfaceBorder: string;
  textMuted: string;
}

export function useChartTheme(): ChartTheme {
  const theme = useUIStore((s) => s.theme);

  return useMemo(() => {
    const cs = getComputedStyle(document.documentElement);
    const g = (n: string) => cs.getPropertyValue(n).trim();
    return {
      s1: g('--chart-series-1'),
      s2: g('--chart-series-2'),
      accent: g('--chart-accent'),
      danger: g('--chart-danger'),
      grid: g('--chart-grid'),
      axis: g('--chart-axis'),
      ttBg: g('--chart-tooltip-bg'),
      ttBorder: g('--chart-tooltip-border'),
      ttText: g('--chart-tooltip-text'),
      surfaceBorder: g('--color-surface-border'),
      textMuted: g('--color-text-muted'),
    };
  }, [theme]);
}
