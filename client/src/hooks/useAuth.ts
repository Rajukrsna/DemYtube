import { useUser } from "@clerk/clerk-react";

export function useAuth() {
  const { user: clerkUser, isLoaded } = useUser();

  return {
    user: clerkUser,
    isLoading: !isLoaded,
    isAuthenticated: !!clerkUser && isLoaded,
  };
}
