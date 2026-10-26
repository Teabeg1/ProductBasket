import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Базовый URL бэкенда на ASP.NET Core
export const API_BASE_URL = 'https://product-basket-api.onrender.com/api';
const TOKEN_KEY = 'user_jwt_token';

let memoryToken: string | null = null;

export interface UserDto {
  id: string;
  displayName: string;
  email: string;
  familyId?: string;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface FamilyDto {
  familyId: string;
  name: string;
  inviteCode: string;
  role: string;
}

async function extractErrorMessage(res: Response, defaultMessage: string): Promise<string> {
  try {
    const errorData = await res.json();
    if (errorData?.message) {
      return errorData.message;
    }
    if (errorData?.errors) {
      const firstKey = Object.keys(errorData.errors)[0];
      const firstVal = errorData.errors[firstKey];
      return Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
    }
    if (errorData?.title) {
      return errorData.title;
    }
  } catch {}
  return defaultMessage;
}

export const AuthService = {
  // Сохранение токена в безопасное хранилище устройства или localStorage браузера
  async saveToken(token: string): Promise<void> {
    memoryToken = token;
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(TOKEN_KEY, token);
        }
      } catch (e) {
        console.warn('localStorage not available', e);
      }
      return;
    }

    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (e) {
      console.warn('SecureStore not available, falling back to memory', e);
    }
  },

  // Получение токена для заголовков Authorization: Bearer <token>
  async getToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(TOKEN_KEY) || memoryToken;
        }
      } catch {
        return memoryToken;
      }
      return memoryToken;
    }

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      return token || memoryToken;
    } catch (e) {
      return memoryToken;
    }
  },

  // Удаление токена при выходе из аккаунта
  async removeToken(): Promise<void> {
    memoryToken = null;
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(TOKEN_KEY);
        }
      } catch {}
      return;
    }

    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      console.warn('Error deleting token', e);
    }
  },

  // Вход в систему (POST /api/auth/login)
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorMsg = await extractErrorMessage(res, `Ошибка авторизации: ${res.status}`);
      throw new Error(errorMsg);
    }

    const data: AuthResponse = await res.json();
    await this.saveToken(data.token);
    return data;
  },

  // Регистрация нового пользователя (POST /api/auth/register)
  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorMsg = await extractErrorMessage(res, `Ошибка регистрации: ${res.status}`);
      throw new Error(errorMsg);
    }

    const data: AuthResponse = await res.json();
    await this.saveToken(data.token);
    return data;
  },
};

export const FamilyService = {
  // Создание новой группы на бэкенде (POST /api/family/create)
  async createFamily(name: string): Promise<FamilyDto> {
    const token = await AuthService.getToken();
    const res = await fetch(`${API_BASE_URL}/family/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const errorMsg = await extractErrorMessage(res, `Ошибка создания группы: ${res.status}`);
      throw new Error(errorMsg);
    }

    return await res.json();
  },

  // Вступление в группу по коду приглашения (POST /api/family/join)
  async joinFamily(inviteCode: string): Promise<FamilyDto> {
    const token = await AuthService.getToken();
    const res = await fetch(`${API_BASE_URL}/family/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ inviteCode }),
    });

    if (!res.ok) {
      const errorMsg = await extractErrorMessage(res, `Ошибка вступления в группу: ${res.status}`);
      throw new Error(errorMsg);
    }

    return await res.json();
  },

  // Получение списка групп текущего пользователя (GET /api/family/my)
  async getMyFamilies(): Promise<any[]> {
    const token = await AuthService.getToken();
    const res = await fetch(`${API_BASE_URL}/family/my`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      return [];
    }

    return await res.json();
  },
};
