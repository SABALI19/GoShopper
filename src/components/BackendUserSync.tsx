import { useAuth, useUser } from "@clerk/expo";
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { apiBaseUrl, apiRequest } from "../features/api/client";

export function BackendUserSync() {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const router = useRouter();
  const routedRoleFor = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoaded || !isSignedIn) {
      routedRoleFor.current = null;
      return;
    }
    if (!apiBaseUrl || !userLoaded || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const result = await apiRequest<{ user: { role?: string } }>("/api/users/sync", {
          token,
          method: "POST",
          body: {
            email: user.primaryEmailAddress?.emailAddress || "",
            phone: user.primaryPhoneNumber?.phoneNumber || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
          },
        });
        const destinations: Record<string, string> = {
          customer: "/(customer)/(tabs)",
          supermarket: "/(supermarket)/(tabs)",
          admin: "/(admin)",
          rider: "/(rider)/(tabs)",
        };
        const role = result.user.role;
        const routeKey = role ? `${user.id}:${role}` : null;
        if (role && destinations[role] && routeKey !== routedRoleFor.current) {
          routedRoleFor.current = routeKey;
          router.replace(destinations[role] as never);
        }
      } catch (error) {
        if (__DEV__) console.warn("Could not sync the signed-in user with Go-Shopper API", error);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoaded, getToken, isSignedIn, router, user, userLoaded]);

  return null;
}
