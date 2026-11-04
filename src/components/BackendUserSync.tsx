import { useAuth, useUser } from "@clerk/expo";
import { useEffect } from "react";
import { apiBaseUrl, apiRequest } from "../features/api/client";

export function BackendUserSync() {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

  useEffect(() => {
    if (!apiBaseUrl || !authLoaded || !userLoaded || !isSignedIn || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        await apiRequest("/api/users/sync", {
          token,
          method: "POST",
          body: {
            email: user.primaryEmailAddress?.emailAddress || "",
            phone: user.primaryPhoneNumber?.phoneNumber || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
          },
        });
      } catch (error) {
        if (__DEV__) console.warn("Could not sync the signed-in user with Go-Shopper API", error);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoaded, getToken, isSignedIn, user, userLoaded]);

  return null;
}
