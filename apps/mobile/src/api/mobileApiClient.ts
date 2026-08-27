import { getSecureItem } from '../auth/secureStorage';

const DEFAULT_API_URL = 'http://localhost:4000/api/v1';

let configuredApiUrl: string | null = null;

export function setMobileApiUrl(url: string) {
  configuredApiUrl = url;
}

export function getMobileApiUrl(): string {
  return configuredApiUrl || process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
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

  private static async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : (null as any);
  }

  static async get<T>(path: string): Promise<T> {
    const headers = await this.getHeaders();
    const res = await fetch(`${getMobileApiUrl()}${path}`, {
      method: 'GET',
      headers
    });
    return this.handleResponse<T>(res);
  }

  static async post<T>(path: string, body: any): Promise<T> {
    const headers = await this.getHeaders();
    const res = await fetch(`${getMobileApiUrl()}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    return this.handleResponse<T>(res);
  }

  static async put<T>(path: string, body: any): Promise<T> {
    const headers = await this.getHeaders();
    const res = await fetch(`${getMobileApiUrl()}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    return this.handleResponse<T>(res);
  }

  static async delete<T>(path: string): Promise<T> {
    const headers = await this.getHeaders();
    const res = await fetch(`${getMobileApiUrl()}${path}`, {
      method: 'DELETE',
      headers
    });
    return this.handleResponse<T>(res);
  }
}
