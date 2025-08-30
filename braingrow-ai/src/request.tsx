import Cookies from 'js-cookie';
import { video } from './structures/video';

// Use same-origin base in dev so Vite proxy forwards /api to backend (no CORS/preflight)
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.DEV)
  ? ''
  : 'http://localhost:8080';
const ABS_BASE = (typeof window !== 'undefined') ? window.location.origin : API_BASE;

// Helper: attach Authorization header if JWT is present in cookie
const authHeaders = (): Record<string, string> => {
  const token = Cookies.get('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const login = async (email: string, password: string): Promise<{ success: boolean; token?: string }> => {
  try {
    // Send API request to login endpoint
    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ 
        email: email,
        password: password
      }),
    });

    const data = await response.json();

    // Check if response is successful and contains token
    if (response.ok && data.token) {
      Cookies.set('authToken', data.token, { expires: 7, secure: true, sameSite: 'strict' });
      return { success: true, token: data.token };
    } else {
      // Return failure if response not ok or no token
      return { success: false };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false };
  }
};

export const logout = (): void => {
  Cookies.remove('authToken');
};

export const isAuthenticated = (): boolean => {
  return !!Cookies.get('authToken');
};

  export interface UserProfile {
    user_id: number;
    username: string;
    email: string;
    tendency?: string;
    photoUrl: string;
    created_at: string;
  }

export const getProfile = async (): Promise<UserProfile | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/profile`, {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        ...authHeaders(),
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Profile fetch error:', error);
    return null;
  }
};

export const updateTendency = async (
  tendency: Record<string, boolean> | string[] | string
): Promise<boolean> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders(),
    };
    // Normalize payload for backend contract:
    // - { tags: string[] } OR { tendency: string } OR { selected: { board: string[] } }
    // This function supports string[] or comma string or legacy map<boolean>.
    let payload: unknown;
    if (Array.isArray(tendency)) {
      payload = { tags: tendency };
    } else if (typeof tendency === 'string') {
      payload = { tendency };
    } else {
      const tags = Object.entries(tendency)
        .filter(([, enabled]) => !!enabled)
        .map(([key]) => key);
      payload = { tags };
    }
    const response = await fetch(`${API_BASE}/api/profile/tendency`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    console.log('Update tendency response status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('Update tendency error:', error);
    return false;
  }
};

export type TagCatalog = Record<string, Record<string, string[]>>;

export const getTagsCatalog = async (): Promise<TagCatalog> => {
  const response = await fetch(`${API_BASE}/api/tags`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch tags catalog');
  return response.json();
};

export const updateTendencySelection = async (
  selected: Record<string, string[]>
): Promise<boolean> => {
  const response = await fetch(`${API_BASE}/api/profile/tendency`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify({ selected })
  });
  return response.ok;
};

export const getRecommandVideo = async(maxVideo: number = 10): Promise<video[]> => {
  const response = await fetch(`${API_BASE}/api/recommendations?maxVideo=${maxVideo}`, {
    headers: { ...authHeaders() },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Get recommand video failed');
  const rawData = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rawData.map((item: any) => ({
    _id: item.id,
    title: item.title,
    description: item.description,
    author: item.creator,
    date: new Date(item.publishedAt),
    category: item.category,
    views: item.viewCount,
    url: item.videoUrl,
    coverUrl: new URL(item.imageUrl, ABS_BASE).href
  }));
}

export const search = async (query: string, maxVideo: number = 10): Promise<video[]> => {
  const response = await fetch(`${API_BASE}/api/search?query=${encodeURIComponent(query)}&maxVideo=${maxVideo}`);
  if (!response.ok) throw new Error('Search failed');
  const rawData = await response.json();
  // Convert raw API response to required video format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rawData.map((item: any) => ({
    _id: item.id,
    title: item.title,
    description: item.description,
    author: item.creator,
    date: new Date(item.publishedAt),
    category: item.category,
    views: item.viewCount,
    url: item.url,
    coverUrl: new URL(item.imageUrl, ABS_BASE).href
  }));
};

export const updateProfile = async (payload: { username?: string; photoUrl?: string }): Promise<UserProfile> => {
  const response = await fetch(`${API_BASE}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to update profile');
  }
  return response.json();
};

export const uploadProfilePhoto = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append('photo', file);
  const response = await fetch(`${API_BASE}/api/profile/photo`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders() },
    body: form
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to upload photo');
  }
  const data = await response.json();
  return data.photoUrl as string;
};

export const getVideo = async (id: string): Promise<video> => {
  const response = await fetch(`${API_BASE}/api/video/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('Get video failed');
  const rawData = await response.json();
  // Convert raw API response to required video format
  return {
    _id: rawData.id,
    title: rawData.title,
    description: rawData.description,
    author: rawData.creator,
    date: new Date(rawData.publishedAt),
    category: rawData.category,
    views: rawData.viewCount,
    url: rawData.url.startsWith('http') ? rawData.url : new URL(rawData.url, ABS_BASE).href,
    coverUrl: rawData.coverUrl.startsWith('http') ? rawData.coverUrl : new URL(rawData.coverUrl, ABS_BASE).href,
    // Optional metadata for logging and display
    tags: rawData.tags,
    board: rawData.board ?? null,
    topic: rawData.topic ?? null
  };
};

export const askVideoQuestion = async (
  id: string,
  question: string,
  startTime?: number,
  endTime?: number
): Promise<string> => {
  const body: Record<string, unknown> = { question };
  if (typeof startTime === 'number') body.startTime = startTime;
  if (typeof endTime === 'number') body.endTime = endTime;
  const response = await fetch(`${API_BASE}/api/videos/${encodeURIComponent(id)}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(data?.error || 'Ask AI failed');
  return data.answer;
};

export const signup = async (
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; token?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (response.ok && data.token) {
      Cookies.set('authToken', data.token, { expires: 7, secure: true, sameSite: 'strict' });
      return { success: true, token: data.token };
    } else {
      return { success: false };
    }
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false };
  }
};
