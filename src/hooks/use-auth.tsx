import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/utils/supabase';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  displayName: string;
  refreshProfile: () => Promise<void>;
};

const DEFAULT_DISPLAY_NAME = 'Nyayath';

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  displayName: DEFAULT_DISPLAY_NAME,
  refreshProfile: async () => undefined,
});

function getMetadataDisplayName(user: User | null): string | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};

  const candidates = [
    metadata.display_name,
    metadata.full_name,
    metadata.name,
    metadata.username,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

/**
 * Gets the display name without querying a column that may not
 * exist in the profiles table.
 *
 * Supabase Auth metadata is used first, followed by the email
 * username, then the TaskFlow default name.
 */
function getUserDisplayName(user: User | null): string {
  if (!user) {
    return DEFAULT_DISPLAY_NAME;
  }

  return (
    getMetadataDisplayName(user) ??
    user.email?.split('@')[0]?.trim() ??
    DEFAULT_DISPLAY_NAME
  );
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(
    DEFAULT_DISPLAY_NAME,
  );

  /**
   * Refresh the currently authenticated user's profile information.
   *
   * We intentionally use Supabase Auth user metadata here instead
   * of querying profiles.display_name because that column does not
   * exist in the current database schema.
   */
  const refreshProfile = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.warn(
          'Could not refresh authenticated user:',
          error.message,
        );
        return;
      }

      if (!user) {
        setDisplayName(DEFAULT_DISPLAY_NAME);
        return;
      }

      setDisplayName(getUserDisplayName(user));
    } catch (error) {
      console.warn(
        'Unexpected error while refreshing authenticated user:',
        error,
      );
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    /**
     * Restore the existing Supabase session when the app starts.
     */
    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            'Failed to restore Supabase session:',
            error.message,
          );
        }

        if (!mounted) {
          return;
        }

        setSession(currentSession);

        if (currentSession?.user) {
          setDisplayName(
            getUserDisplayName(currentSession.user),
          );
        } else {
          setDisplayName(DEFAULT_DISPLAY_NAME);
        }
      } catch (error) {
        console.error(
          'Failed to initialize authentication:',
          error,
        );

        if (mounted) {
          setSession(null);
          setDisplayName(DEFAULT_DISPLAY_NAME);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    /**
     * Listen for changes made by Supabase Auth.
     *
     * This is important for:
     * - signing in
     * - signing out
     * - refreshing tokens
     * - updating user information
     * - restoring an existing session
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!mounted) {
          return;
        }

        console.log(
          'AUTH EVENT:',
          event,
          'SESSION:',
          Boolean(nextSession),
        );

        setSession(nextSession);

        if (nextSession?.user) {
          setDisplayName(
            getUserDisplayName(nextSession.user),
          );
        } else {
          setDisplayName(DEFAULT_DISPLAY_NAME);
        }

        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Keep the displayed name synchronized whenever the
   * authenticated user changes.
   */
  useEffect(() => {
    if (!session?.user) {
      setDisplayName(DEFAULT_DISPLAY_NAME);
      return;
    }

    setDisplayName(
      getUserDisplayName(session.user),
    );
  }, [session?.user?.id]);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      loading,
      displayName,
      refreshProfile,
    }),
    [
      session,
      loading,
      displayName,
      refreshProfile,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}