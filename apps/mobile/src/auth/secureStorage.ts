const inMemoryFallback: Record<string, string> = {};

export async function saveSecureItem(key: string, value: string): Promise<void> {
  try {
    const SecureStore = await import('expo-secure-store').catch(() => null);
    if (!SecureStore) {
      inMemoryFallback[key] = value;
      return;
    }
    await (SecureStore as any).setItemAsync(key, value);
  } catch (err) {
    inMemoryFallback[key] = value;
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    const SecureStore = await import('expo-secure-store').catch(() => null);
    if (!SecureStore) {
      return inMemoryFallback[key] || null;
    }
    return await (SecureStore as any).getItemAsync(key);
  } catch (err) {
    return inMemoryFallback[key] || null;
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    const SecureStore = await import('expo-secure-store').catch(() => null);
    if (!SecureStore) {
      delete inMemoryFallback[key];
      return;
    }
    await (SecureStore as any).deleteItemAsync(key);
  } catch (err) {
    delete inMemoryFallback[key];
  }
}
