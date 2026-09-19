import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/utils/supabase";

type UserProfile = {
  id: string;
  display_name: string | null;
  [key: string]: unknown;
};

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
  displayName: string;

  refreshProfile: () => Promise<void>;

  updateDisplayName: (
    name: string
  ) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  profile: null,
  displayName: "",
  refreshProfile: async () => {},
  updateDisplayName: async () => ({
    error: null,
  }),
});

/**
 * Creates a readable name from an email address
 * only when the user has not provided a display name.
 *
 * Example:
 * john.doe@example.com
 * -> John Doe
 */
function getFallbackDisplayName(
  email: string | undefined
): string {
  if (!email) {
    return "there";
  }

  const emailName = email
    .split("@")[0]
    ?.trim();

  if (!emailName) {
    return "there";
  }

  return emailName
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(" ");
}

/**
 * Gets the best available display name.
 *
 * Priority:
 * 1. profiles.display_name
 * 2. Supabase user metadata full_name
 * 3. Supabase user metadata name
 * 4. Email-derived name
 */
function getDisplayName(
  profile: UserProfile | null,
  user: User | null
): string {
  const profileName =
    typeof profile?.display_name === "string"
      ? profile.display_name.trim()
      : "";

  if (profileName) {
    return profileName;
  }

  const metadata = user?.user_metadata;

  const fullName =
    typeof metadata?.full_name === "string"
      ? metadata.full_name.trim()
      : "";

  if (fullName) {
    return fullName;
  }

  const name =
    typeof metadata?.name === "string"
      ? metadata.name.trim()
      : "";

  if (name) {
    return name;
  }

  return getFallbackDisplayName(
    user?.email
  );
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  /**
   * Load the user's profile from Supabase.
   */
  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } =
          await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
          console.error(
            "Failed to load user profile:",
            error
          );

          setProfile(null);
          return;
        }

        setProfile(
          data as UserProfile | null
        );
      } catch (error) {
        console.error(
          "Unexpected profile loading error:",
          error
        );

        setProfile(null);
      }
    },
    []
  );

  /**
   * Refresh the current user's profile.
   */
  const refreshProfile =
    useCallback(async () => {
      const user = session?.user;

      if (!user) {
        setProfile(null);
        return;
      }

      await fetchProfile(user.id);
    }, [session, fetchProfile]);

  /**
   * Update the display name globally.
   *
   * We update Supabase Auth metadata immediately.
   * This allows every screen using useAuth()
   * to receive the new name.
   *
   * We also update the local profile state immediately
   * so the UI changes without requiring a reload.
   */
  const updateDisplayName =
    useCallback(
      async (name: string) => {
        const cleanedName =
          name.trim();

        if (!cleanedName) {
          return {
            error: new Error(
              "Display name cannot be empty."
            ),
          };
        }

        const user =
          session?.user;

        if (!user) {
          return {
            error: new Error(
              "You must be signed in to change your name."
            ),
          };
        }

        try {
          /**
           * Update Supabase Auth metadata.
           */
          const { data, error } =
            await supabase.auth.updateUser(
              {
                data: {
                  full_name:
                    cleanedName,
                  name: cleanedName,
                },
              }
            );

          if (error) {
            console.error(
              "Failed to update display name:",
              error
            );

            return {
              error,
            };
          }

          /**
           * Update the local session immediately.
           */
          if (data.user) {
            setSession((current) => {
              if (!current) {
                return current;
              }

              return {
                ...current,
                user: data.user,
              };
            });
          }

          /**
           * Update the profile state immediately
           * if a profile already exists.
           */
          setProfile((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              display_name:
                cleanedName,
            };
          });

          /**
           * If the profiles table contains a matching
           * row, keep its display_name synchronized too.
           *
           * We do not make this update fatal because
           * Auth metadata remains the primary fallback.
           */
          try {
            await supabase
              .from("profiles")
              .update({
                display_name:
                  cleanedName,
              })
              .eq("id", user.id);
          } catch (profileError) {
            console.warn(
              "Profile table could not be synchronized:",
              profileError
            );
          }

          return {
            error: null,
          };
        } catch (error) {
          console.error(
            "Unexpected display name update error:",
            error
          );

          return {
            error:
              error instanceof Error
                ? error
                : new Error(
                    "Unable to update display name."
                  ),
          };
        }
      },
      [session]
    );

  /**
   * The name displayed throughout TaskFlow.
   */
  const displayName = getDisplayName(
    profile,
    session?.user ?? null
  );

  useEffect(() => {
    let mounted = true;

    const restoreSession =
      async () => {
        try {
          const {
            data: {
              session:
                restoredSession,
            },
            error,
          } =
            await supabase.auth.getSession();

          if (!mounted) {
            return;
          }

          if (error) {
            console.error(
              "Failed to restore Supabase session:",
              error
            );

            setSession(null);
            setProfile(null);
            setLoading(false);

            return;
          }

          setSession(
            restoredSession
          );

          if (
            restoredSession?.user
          ) {
            await fetchProfile(
              restoredSession.user.id
            );
          } else {
            setProfile(null);
          }

          if (mounted) {
            setLoading(false);
          }
        } catch (error) {
          if (!mounted) {
            return;
          }

          console.error(
            "Unexpected authentication error:",
            error
          );

          setSession(null);
          setProfile(null);
          setLoading(false);
        }
      };

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          nextSession
        ) => {
          if (!mounted) {
            return;
          }

          console.log(
            "Supabase auth event:",
            event
          );

          setSession(nextSession);

          if (!nextSession?.user) {
            setProfile(null);
            setLoading(false);
            return;
          }

          /**
           * USER_UPDATED is particularly important here.
           *
           * When Settings changes the display name,
           * Supabase emits USER_UPDATED and we update
           * the session/profile state.
           */
          if (
            event ===
            "USER_UPDATED"
          ) {
            setTimeout(
              async () => {
                if (!mounted) {
                  return;
                }

                await fetchProfile(
                  nextSession.user.id
                );

                if (mounted) {
                  setLoading(false);
                }
              },
              0
            );

            return;
          }

          /**
           * Do database work after the auth callback
           * has completed its internal processing.
           */
          setTimeout(
            async () => {
              if (!mounted) {
                return;
              }

              await fetchProfile(
                nextSession.user.id
              );

              if (mounted) {
                setLoading(false);
              }
            },
            0
          );
        }
      );

    restoreSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        profile,
        displayName,
        refreshProfile,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(
    AuthContext
  );
}