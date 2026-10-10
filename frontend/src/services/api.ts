import * as SecureStore from 'expo-secure-store';

// Базовый URL бэкенда на ASP.NET Core
export const API_BASE_URL = 'http://localhost:5000/api';
const TOKEN_KEY = 'user_jwt_token';

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

export const AuthService = {
  // Сохранение токена в безопасное хранилище устройства
  async saveToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (e) {
      console.warn('SecureStore not available, falling back to memory/local', e);
    }
  },

  // Получение токена для заголовков Authorization: Bearer <token>
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  },

  // Удаление токена при выходе из аккаунта
  async removeToken(): Promise<void> {
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
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Ошибка авторизации: ${res.status}`);
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
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Ошибка регистрации: ${res.status}`);
    }

    const data: AuthResponse = await res.json();
    await this.saveToken(data.token);
    return data;
  },
};
