import { API_URL } from "@/config";
/**
 * API Client for fetching from FastAPI Backend with automatic JWT injection.
 */


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
        console.log("[AuthBridge] Fetching Supabase JWT...");
        const response = await fetch("/api/auth/jwt");
        if (!response.ok) {
            console.error("[AuthBridge] Could not fetch Supabase JWT", response.status);
            throw new Error("Could not fetch Supabase JWT");
        }
        const { jwt: supabaseToken, user_id } = await response.json();
        console.log(`[AuthBridge] Received Supabase JWT for UserID: ${user_id}`);

        // 2. Exchange Supabase JWT for FastAPI JWT
        console.log("[AuthBridge] Exchanging for FastAPI token...");
        const exchangeResponse = await fetch(`${API_URL}/auth/exchange`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supabase_token: supabaseToken })
        });

        if (!exchangeResponse.ok) {
            console.error("[AuthBridge] FastAPI token exchange failed", exchangeResponse.status);
            throw new Error("FastAPI token exchange failed");
        }

        const { access_token, expires_in } = await exchangeResponse.json();
        console.log("[AuthBridge] FAST API Token exchange successful");

        tokenCache = access_token;
        tokenExpiry = Date.now() + (access_token ? (expires_in - 60) * 1000 : 0); // Buffer of 60s

        return access_token;
    } catch (error) {
        console.error("[AuthBridge] Token Bridge Error:", error);
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

        const isFormData = options.body instanceof FormData;

        const headers = {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
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
        const isFormData = body instanceof FormData;
        return this.request<T>(endpoint, {
            method: "POST",
            body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
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
