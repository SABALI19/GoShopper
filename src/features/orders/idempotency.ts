import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const STORAGE_KEY = "go-shopper-pending-order-attempt-v1";

type StoredAttempt = { fingerprint: string; key: string };

export async function getOrderAttemptKey(request: unknown) {
  const fingerprint = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(request),
  );
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const attempt = JSON.parse(saved) as StoredAttempt;
      if (attempt.fingerprint === fingerprint && /^[A-Za-z0-9._:-]{8,128}$/.test(attempt.key)) return attempt.key;
    } catch {
      // Replace an invalid stored attempt with a new one.
    }
  }
  const key = Crypto.randomUUID();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ fingerprint, key } satisfies StoredAttempt));
  return key;
}

export async function clearOrderAttemptKey() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
