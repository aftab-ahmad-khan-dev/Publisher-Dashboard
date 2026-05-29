import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/clerk-react'

/**
 * Auth is now backed by Clerk. This module keeps the original `useAuth()` shape
 * ({ user, ready, isAuthenticated, logout, workspaceId }) so the rest of the app
 * doesn't need to know about the provider swap.
 */
export function AuthProvider({ children }) {
  return children
}

export function useAuth() {
  const { isLoaded, isSignedIn, orgId, orgRole, orgSlug } = useClerkAuth()
  const { user } = useUser()
  const { signOut } = useClerk()

  const workspaceId = orgId || (user ? `user_${user.id}` : null)

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
    logout: () => signOut(),
  }
}
