import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/clerk-react'

/**
 * Auth is backed by Clerk. Publishing data is always scoped to the signed-in
 * user's personal workspace (`user_<id>`), regardless of which organization is
 * selected in the org switcher (used for branding/roles only).
 */
export function AuthProvider({ children }) {
  return children
}

export function useAuth() {
  const { isLoaded, isSignedIn, orgId, orgRole, orgSlug } = useClerkAuth()
  const { user } = useUser()
  const { signOut } = useClerk()

  const workspaceId = user ? `user_${user.id}` : null

  return {
    ready: isLoaded,
    isAuthenticated: Boolean(isSignedIn),
    user: user
      ? {
          name:
            user.fullName ||
            user.primaryEmailAddress?.emailAddress ||
            'Account',
          email: user.primaryEmailAddress?.emailAddress || '',
          imageUrl: user.imageUrl,
          role: orgRole ? orgRole.replace(/^org:/, '') : 'Publisher',
          workspace: orgSlug || 'Personal',
        }
      : null,
    workspaceId,
    orgId: orgId || null,
    logout: () => signOut(),
  }
}
