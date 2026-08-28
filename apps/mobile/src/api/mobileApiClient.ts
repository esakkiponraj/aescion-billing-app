import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSecureItem } from '../auth/secureStorage';

let configuredApiUrl: string | null = null;
let activeWorkingBaseUrl: string | null = null;

export function setMobileApiUrl(url: string) {
  configuredApiUrl = url;
  activeWorkingBaseUrl = url.replace(/\/+$/, '');
}

export function getCandidateBaseUrls(): string[] {
  if (configuredApiUrl) return [configuredApiUrl.replace(/\/+$/, '')];

  const candidates: string[] = [];

  if (activeWorkingBaseUrl) {
    candidates.push(activeWorkingBaseUrl);
  }

  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim()?.replace(/\/+$/, '');
  if (envUrl) {
    candidates.push(envUrl);
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        candidates.push(`http://${hostname}:4000/api/v1`);
      }
    }
    candidates.push('http://localhost:4000/api/v1');
    candidates.push('http://127.0.0.1:4000/api/v1');
    return Array.from(new Set(candidates));
  }

  // Native Android / iOS environments
  // 1. Dynamic host resolution from Expo Metro bundler hostUri (e.g. Wi-Fi IP)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      candidates.push(`http://${host}:4000/api/v1`);
    }
  }

  // 2. USB ADB reverse loopback (Android) / standard loopback (iOS simulator)
  candidates.push('http://127.0.0.1:4000/api/v1');
  candidates.push('http://localhost:4000/api/v1');

  // 3. Android standard AVD emulator alias
  if (Platform.OS === 'android') {
    candidates.push('http://10.0.2.2:4000/api/v1');
  }

  return Array.from(new Set(candidates));
}

export function getMobileApiUrl(): string {
  if (activeWorkingBaseUrl) return activeWorkingBaseUrl;
  const candidates = getCandidateBaseUrls();
  return candidates[0] || 'http://127.0.0.1:4000/api/v1';
}

export class MobileApiClient {
  private static async getHeaders(): Promise<HeadersInit> {
    const token = await getSecureItem('aescion_mobile_token');
    const activeBranchId = await getSecureItem('aescion_mobile_branch_id');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (activeBranchId) {
      headers['x-branch-id'] = activeBranchId;
    }

    return headers;
  }

  private static sanitizeEndpoint(baseUrl: string, path: string): string {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // Guard against accidental duplicate prefix like /api/v1/api/v1
    if (cleanBase.endsWith('/api/v1') && cleanPath.startsWith('/api/v1/')) {
      return `${cleanBase}${cleanPath.substring(7)}`;
    }
    return `${cleanBase}${cleanPath}`;
  }

  private static async handleResponse<T>(res: Response, fullUrl: string): Promise<T> {
    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.message || (Array.isArray(errorData.errors) ? errorData.errors.join(', ') : errorMsg);
      } catch {}
      console.warn(`[MobileApiClient] HTTP ${res.status} on ${fullUrl}: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : (null as any);
  }

  private static async requestWithAutoFailover<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const headers = await this.getHeaders();
    const candidates = getCandidateBaseUrls();
    let lastError: any = null;

    for (const baseUrl of candidates) {
      const fullUrl = this.sanitizeEndpoint(baseUrl, path);
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

        const res = await fetch(fullUrl, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller?.signal
        });

        if (timeoutId) clearTimeout(timeoutId);

        // If server responded (any HTTP status), this base URL is alive and reachable
        activeWorkingBaseUrl = baseUrl;
        return await this.handleResponse<T>(res, fullUrl);
      } catch (err: any) {
        lastError = err;
        // If it was an HTTP validation/auth error from handleResponse, re-throw immediately
        if (err.message && !err.message.includes('Network request failed') && !err.message.includes('Failed to fetch') && !err.message.includes('aborted')) {
          throw err;
        }
        // Otherwise, connection failure to this candidate URL -> continue to next candidate
      }
    }

    const safeError = `Unable to connect to AESCION API server. Please check connection.`;
    console.warn(`[MobileApiClient] ${method} ${path} error: ${safeError} (attempted: ${candidates.join(', ')})`);
    throw new Error(safeError);
  }

  static async get<T>(path: string): Promise<T> {
    return this.requestWithAutoFailover<T>('GET', path);
  }

  static async post<T>(path: string, body: any): Promise<T> {
    return this.requestWithAutoFailover<T>('POST', path, body);
  }

  static async put<T>(path: string, body: any): Promise<T> {
    return this.requestWithAutoFailover<T>('PUT', path, body);
  }

  static async patch<T>(path: string, body?: any): Promise<T> {
    return this.requestWithAutoFailover<T>('PATCH', path, body);
  }

  static async delete<T>(path: string): Promise<T> {
    return this.requestWithAutoFailover<T>('DELETE', path);
  }
}
