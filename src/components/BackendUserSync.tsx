import { useAuth, useUser } from "@clerk/expo";
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { apiBaseUrl, apiRequest } from "../features/api/client";

export function BackendUserSync() {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const router = useRouter();
  const adminRouteHandledFor = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoaded || !isSignedIn) {
      adminRouteHandledFor.current = null;
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
        if (result.user.role === "admin" && adminRouteHandledFor.current !== user.id) {
          adminRouteHandledFor.current = user.id;
          router.replace("/(admin)" as never);
        }
      } catch (error) {
        if (__DEV__) console.warn("Could not sync the signed-in user with Go-Shopper API", error);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoaded, getToken, isSignedIn, router, user, userLoaded]);

  return null;
}
