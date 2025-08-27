import Cookies from 'js-cookie';
import { video } from './structures/video';

const API_BASE = 'http://localhost:8080';

export const login = async (email: string, password: string): Promise<{ success: boolean; token?: string }> => {
  try {
    // Send API request to login endpoint
    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    session_info?: {
      login_time?: string;
      session_permanent?: boolean;
    };
  }

export const getProfile = async (): Promise<UserProfile | null> => {
  try {
    const token = Cookies.get('authToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/api/profile`, {
      headers,
      credentials: 'include',
      cache: 'no-store'
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Profile fetch error:', error);
    return null;
  }
};

export const updateTendency = async (
  tendency: Record<string, boolean>
): Promise<boolean> => {
  try {
    const token = Cookies.get('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/api/profile/tendency`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({ tendency: JSON.stringify(tendency) })
    });
    return response.ok;
  } catch (error) {
    console.error('Update tendency error:', error);
    return false;
  }
};

export const getRecommandVideo = async(maxVideo: number = 10): Promise<video[]> => {
  const response = await fetch(`${API_BASE}/api/recommendations?maxVideo=${maxVideo}`);
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
    coverUrl: new URL(item.imageUrl, API_BASE).href
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
    coverUrl: new URL(item.imageUrl, API_BASE).href
  }));
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
    url: rawData.url.startsWith('http') ? rawData.url : new URL(rawData.url, API_BASE).href,
    coverUrl: rawData.coverUrl.startsWith('http') ? rawData.coverUrl : new URL(rawData.coverUrl, API_BASE).href
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
