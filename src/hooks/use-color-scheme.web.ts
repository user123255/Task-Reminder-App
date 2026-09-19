import { useEffect, useState } from 'react';

import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * On web, react-native-web's useColorScheme can return
 * `null` before hydration. This hook defers the value
 * until after mount to avoid a hydration mismatch.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const scheme = useRNColorScheme();

  if (hasHydrated) {
    return scheme;
  }

  return 'light' as const;
}