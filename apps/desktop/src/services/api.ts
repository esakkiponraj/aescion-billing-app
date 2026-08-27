const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';

export class ApiClient {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('aescion_token');
    const activeBranchId = localStorage.getItem('aescion_active_branch_id');

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
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse<T>(res);
  }

  static async post<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    return this.handleResponse<T>(res);
  }

  static async put<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    return this.handleResponse<T>(res);
  }

  static async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse<T>(res);
  }
}
