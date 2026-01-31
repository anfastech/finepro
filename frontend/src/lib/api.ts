/**
 * API Client for fetching from FastAPI Backend with automatic JWT injection.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

let tokenCache: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Fetches one-time JWT from Next.js Auth Bridge and exchanges it for a FastAPI JWT
 */
async function fetchToken() {
    if (tokenCache && tokenExpiry && Date.now() < tokenExpiry) {
        return tokenCache;
    }

    try {
        // 1. Get Appwrite JWT from our Next.js backend
        const response = await fetch("/api/auth/jwt");
        if (!response.ok) throw new Error("Could not fetch Appwrite JWT");
        const { jwt: appwriteToken } = await response.json();

        // 2. Exchange Appwrite JWT for FastAPI JWT
        const exchangeResponse = await fetch(`${API_URL}/auth/exchange`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appwrite_token: appwriteToken })
        });

        if (!exchangeResponse.ok) {
            throw new Error("FastAPI token exchange failed");
        }

        const { access_token, expires_in } = await exchangeResponse.json();

        tokenCache = access_token;
        tokenExpiry = Date.now() + (access_token ? (expires_in - 60) * 1000 : 0); // Buffer of 60s

        return access_token;
    } catch (error) {
        console.error("Token Bridge Error:", error);
        return null;
    }
}

interface ApiOptions {
    params?: Record<string, string>;
    headers?: Record<string, string>;
}

export const api = {
    async request<T>(endpoint: string, options: RequestInit & { params?: Record<string, string> } = {}): Promise<T> {
        const token = await fetchToken();

        let url = `${API_URL}${endpoint}`;
        if (options.params) {
            const searchParams = new URLSearchParams(options.params);
            url += `?${searchParams.toString()}`;
        }

        const headers = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            tokenCache = null;
            tokenExpiry = null;
        }

        if (response.status === 204) return null as any;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "API Request Failed");
        }

        return response.json();
    },

    async get<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
        return this.request<T>(endpoint, { method: "GET", ...options });
    },

    async post<T>(endpoint: string, body: any = {}, options: ApiOptions = {}): Promise<T> {
        return this.request<T>(endpoint, {
            method: "POST",
            body: body ? JSON.stringify(body) : undefined,
            ...options,
        });
    },

    async patch<T>(endpoint: string, body: any = {}, options: ApiOptions = {}): Promise<T> {
        return this.request<T>(endpoint, {
            method: "PATCH",
            body: body ? JSON.stringify(body) : undefined,
            ...options,
        });
    },

    async delete<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
        return this.request<T>(endpoint, {
            method: "DELETE",
            ...options,
        });
    },
};
