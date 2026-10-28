import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Базовый URL бэкенда на ASP.NET Core
export const API_BASE_URL = 'https://productbasket.onrender.com/api';
const TOKEN_KEY = 'user_jwt_token';

let memoryToken: string | null = null;

export interface UserDto {
  id: string;
  displayName: string;
  email: string;
  familyId?: string;
  familyName?: string;
  avatarUrl?: string;
  avatarChar?: string;
  avatarBg?: string;
  avatarColor?: string;
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

  // Получение профиля текущего пользователя (GET /api/auth/me)
  async getProfile(): Promise<UserDto | null> {
    const token = await this.getToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  },

  // Удаление своего аккаунта (DELETE /api/auth/account)
  async deleteAccount(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;
    const res = await fetch(`${API_BASE_URL}/auth/account`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      await this.removeToken();
      return true;
    }
    return false;
  },

  // Обновление имени пользователя (PUT /api/auth/profile)
  async updateProfile(displayName: string): Promise<UserDto> {
    const token = await this.getToken();
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ displayName }),
    });

    if (!res.ok) {
      const errorMsg = await extractErrorMessage(res, 'Не удалось обновить имя');
      throw new Error(errorMsg);
    }
    return await res.json();
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
  async getMyFamilies(tokenOverride?: string): Promise<any[]> {
    const token = tokenOverride || (await AuthService.getToken());
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

  // Переименование группы (PUT /api/family/{id}/name или PUT /api/family/name)
  async updateFamilyName(name: string, familyId?: string): Promise<{ success: boolean; name: string }> {
    const token = await AuthService.getToken();
    const url = familyId ? `${API_BASE_URL}/family/${familyId}/name` : `${API_BASE_URL}/family/name`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const errorMsg = await extractErrorMessage(res, 'Не удалось переименовать группу');
      throw new Error(errorMsg);
    }
    return await res.json();
  },

  // Получение участников группы (GET /api/family/{familyId}/members)
  async getMembers(familyId?: string): Promise<any[]> {
    const token = await AuthService.getToken();
    const url = familyId ? `${API_BASE_URL}/family/${familyId}/members` : `${API_BASE_URL}/family/members`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return [];
    return await res.json();
  },

  // Удаление участника из группы (DELETE /api/family/{familyId}/members/{memberUserId})
  async removeMember(memberUserId: string, familyId?: string): Promise<boolean> {
    const token = await AuthService.getToken();
    const url = familyId
      ? `${API_BASE_URL}/family/${familyId}/members/${memberUserId}`
      : `${API_BASE_URL}/family/members/${memberUserId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.ok;
  },

  // Выход из группы (POST /api/family/{familyId}/leave)
  async leaveFamily(familyId?: string): Promise<boolean> {
    const token = await AuthService.getToken();
    const url = familyId ? `${API_BASE_URL}/family/${familyId}/leave` : `${API_BASE_URL}/family/leave`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.ok;
  },
};

export interface EventDto {
  id: string;
  familyId: string;
  title: string;
  eventDate: string;
  icon?: string;
  badgeBg?: string;
  hasCart: boolean;
  isCompleted: boolean;
  completedAt?: string;
  membersCount: number;
}

const isGuid = (val?: string) => !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const EventsService = {
  // Получение списка мероприятий (GET /api/events)
  async getEvents(familyId?: string): Promise<EventDto[]> {
    const token = await AuthService.getToken();
    const url = familyId && isGuid(familyId) ? `${API_BASE_URL}/events?familyId=${familyId}` : `${API_BASE_URL}/events`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return [];
    return await res.json();
  },

  // Создание нового мероприятия (POST /api/events)
  async createEvent(payload: { title: string; eventDate: string; icon?: string; familyId?: string; hasCart?: boolean }): Promise<EventDto> {
    const token = await AuthService.getToken();
    const res = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await extractErrorMessage(res, 'Не удалось создать мероприятие');
      throw new Error(errorMsg);
    }
    return await res.json();
  },

  // Создание корзины для мероприятия (POST /api/events/{id}/cart)
  async createEventCart(eventId: string): Promise<boolean> {
    const token = await AuthService.getToken();
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/cart`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.ok;
  },

  // Завершение мероприятия (POST /api/events/{id}/complete)
  async completeEvent(eventId: string): Promise<boolean> {
    const token = await AuthService.getToken();
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/complete`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.ok;
  },

  // Удаление мероприятия (DELETE /api/events/{id})
  async deleteEvent(eventId: string): Promise<boolean> {
    const token = await AuthService.getToken();
    const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.ok;
  },
};

export interface CartItemDto {
  id: string;
  productId?: string;
  title: string;
  unit: string;
  imageKey?: string;
  imageUrl?: string;
  emoji?: string;
  count: number;
  status: string;
  assignedToUserId?: string;
  takenByUserId?: string;
  takenByName?: string;
  isBought: boolean;
  eventId?: string;
}

export const CartService = {
  // Получение товаров в корзине семьи или мероприятия (GET /api/cart)
  async getCart(familyId?: string, eventId?: string): Promise<CartItemDto[]> {
    const token = await AuthService.getToken();
    const params = new URLSearchParams();
    if (familyId && isGuid(familyId)) params.append('familyId', familyId);
    if (eventId && isGuid(eventId)) params.append('eventId', eventId);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE_URL}/cart${queryString}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) return [];
    return await res.json();
  },

  // Добавление товара в корзину (POST /api/cart/items)
  async addItem(request: {
    productId?: string;
    title?: string;
    unit?: string;
    imageKey?: string;
    imageUrl?: string;
    emoji?: string;
    count?: number;
    familyId?: string;
    eventId?: string;
  }): Promise<CartItemDto> {
    const token = await AuthService.getToken();
    const payload: any = { ...request };
    if (payload.productId && !isGuid(payload.productId)) delete payload.productId;
    if (payload.eventId && !isGuid(payload.eventId)) delete payload.eventId;
    if (payload.familyId && !isGuid(payload.familyId)) delete payload.familyId;

    const res = await fetch(`${API_BASE_URL}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await extractErrorMessage(res, 'Не удалось добавить товар в корзину');
      console.warn('CartService.addItem error:', err);
      throw new Error(err);
    }
    return await res.json();
  },

  // Уменьшение количества товара (POST /api/cart/items/{id}/decrement)
  async decrementItem(cartItemId: string): Promise<void> {
    const token = await AuthService.getToken();
    await fetch(`${API_BASE_URL}/cart/items/${cartItemId}/decrement`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  },

  // Удаление товара из корзины (DELETE /api/cart/items/{id})
  async deleteItem(cartItemId: string): Promise<void> {
    const token = await AuthService.getToken();
    await fetch(`${API_BASE_URL}/cart/items/${cartItemId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  },

  // Назначение ответственного «Куплю я» (POST /api/cart/{id}/assign)
  async assignProduct(cartItemId: string): Promise<{ success: boolean; message?: string }> {
    const token = await AuthService.getToken();
    const res = await fetch(`${API_BASE_URL}/cart/${cartItemId}/assign`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await extractErrorMessage(res, 'Не удалось назначить товар');
      return { success: false, message: err };
    }
    const data = await res.json();
    return { success: data.success, message: data.message };
  },

  // Переключение статуса «Куплено» (POST /api/cart/{id}/toggle-purchased)
  async togglePurchased(cartItemId: string): Promise<{ success: boolean; message?: string }> {
    const token = await AuthService.getToken();
    const res = await fetch(`${API_BASE_URL}/cart/${cartItemId}/toggle-purchased`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await extractErrorMessage(res, 'Не удалось изменить статус покупки');
      return { success: false, message: err };
    }
    const data = await res.json();
    return { success: data.success, message: data.message };
  },
};

export const ProductsService = {
  // Получение каталога товаров семьи (включая Свои товары) (GET /api/products?familyId=...)
  async getProducts(familyId?: string): Promise<any[]> {
    const token = await AuthService.getToken();
    const url = familyId && isGuid(familyId) ? `${API_BASE_URL}/products?familyId=${familyId}` : `${API_BASE_URL}/products`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return [];
    return await res.json();
  },

  // Создание своего товара для семьи (POST /api/products/custom)
  async createCustomProduct(payload: { title: string; unit?: string; category?: string; emoji?: string; familyId: string }): Promise<any> {
    const token = await AuthService.getToken();
    const res = await fetch(`${API_BASE_URL}/products/custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorMsg = await extractErrorMessage(res, 'Не удалось создать товар');
      throw new Error(errorMsg);
    }
    return await res.json();
  },

  // Удаление своего товара (DELETE /api/products/{id})
  async deleteProduct(id: string): Promise<boolean> {
    const token = await AuthService.getToken();
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.ok;
  },
};
