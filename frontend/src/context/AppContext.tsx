import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { EMPTY_USER, type DevUser } from '../config/devConfig';
import { getThemeColors, type AppTheme } from '../constants/theme';
import { TRANSLATIONS, type Language } from '../constants/i18n';
import { FamilyService, AuthService, CartService, EventsService, ProductsService, type AuthResponse } from '../services/api';
import { SignalRService } from '../services/signalr';

export interface CatalogProduct {
  id: string;
  title: string;
  unit: string;
  imageKey: string;
  emoji: string;
}

export interface CartItem {
  id: string;
  title: string;
  unit: string;
  imageKey: string;
  emoji: string;
  count: number;
  assignedToUserId: string | null; // id пользователя, который взял товар
  isBought?: boolean; // куплен ли товар в магазине
}

export interface AppEvent {
  id: string;
  title: string;
  date: string;
  emoji: string;
  badgeBg: string;
  hasCart: boolean;
  isCompleted?: boolean;
  completedAt?: string;
  familyId?: string; // ID группы (пространства), к которой относится мероприятие
}

export interface FamilyState {
  id: string;
  name: string;
  code: string;
  members: DevUser[];
  customProducts?: CatalogProduct[];
}

// Уровни масштабирования текста
export type FontScaleLevel = 'small' | 'medium' | 'large';

export const FONT_SCALE_MULTIPLIERS: Record<FontScaleLevel, number> = {
  small: 1.0,     // Мелкий
  medium: 1.12,   // Обычный (по умолчанию)
  large: 1.25,    // Крупный
};

interface AppContextType {
  // Theme & Typography & Language
  theme: AppTheme;
  colors: ReturnType<typeof getThemeColors>;
  toggleTheme: () => void;
  fontScale: FontScaleLevel;
  setFontScale: (scale: FontScaleLevel) => void;
  fontScaleMultiplier: number;
  language: Language;
  t: (key: keyof typeof TRANSLATIONS.ru, vars?: Record<string, string>) => string;

  // Active User & Auth
  currentUser: DevUser;
  setCurrentUserByEmail: (email: string) => { user: DevUser; hasFamily: boolean };
  setCurrentUserFromAuth: (authData: AuthResponse) => Promise<{ user: DevUser; hasFamily: boolean }>;
  registerUser: (displayName: string, email: string) => void;
  updateUserName: (name: string) => void;
  logout: () => void;

  // Multi-Family State
  families: FamilyState[];
  activeFamilyId: string | null;
  family: FamilyState | null;
  switchFamily: (familyId: string) => void;
  createFamily: (name: string) => Promise<string> | string; // возвращает сгенерированный код
  joinFamilyWithCode: (code: string) => Promise<boolean> | boolean;
  updateFamilyName: (name: string) => void;
  leaveFamily: () => void;
  removeMemberFromFamily: (memberId: string) => void;

  // Custom Products (локально под каждую семью)
  addCustomProduct: (familyId: string, product: { title: string; unit: string; emoji: string }) => void;
  deleteCustomProduct: (familyId: string, productId: string) => void;

  // Multi-Cart State (Базовая корзина выбранной семьи + отдельные корзины мероприятий)
  activeCartId: string; // familyId или eventId
  activeCartTitle: string;
  isEventCart: boolean;
  openMainCart: () => void;
  openEventCart: (eventId: string) => void;
  getFamilyCart: (familyId: string) => Record<string, CartItem>;

  cartItems: Record<string, CartItem>;
  addToCart: (item: Omit<CartItem, 'count' | 'assignedToUserId'>) => void;
  decrementCartItem: (itemId: string) => void;
  deleteFromCart: (itemId: string) => void;
  assignCartItem: (itemId: string) => { success: boolean; message?: string };
  toggleItemPurchased: (itemId: string) => { success: boolean; message?: string };
  totalCartItemsCount: number;

  // Events State
  events: AppEvent[];
  createEvent: (data: { title: string; date: string; emoji: string; familyId?: string }) => void;
  deleteEvent: (id: string) => void;
  createEventCart: (id: string) => void;
  getEventCartStats: (eventId: string) => { total: number; assigned: number; bought: number };
  completeEvent: (id: string) => void;
  reopenEvent: (id: string) => void;

  // Reset
  resetToInitialState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Генератор 6-значного кода с буквами и цифрами в случайном порядке
const generateRandomCode = (): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const Storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch {}
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch {}
      return null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Theme & Font Scale & Language
  const [theme, setTheme] = useState<AppTheme>('light');
  const language: Language = 'ru';
  const [fontScale, setFontScale] = useState<FontScaleLevel>('medium');
  const fontScaleMultiplier = FONT_SCALE_MULTIPLIERS[fontScale];

  // Список всех известных семей (реестр)
  const [knownFamilies, setKnownFamilies] = useState<Record<string, FamilyState>>({});

  // Семьи, в которых состоит текущий пользователь
  const [families, setFamilies] = useState<FamilyState[]>([]);

  // Идентификатор активной семьи
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);

  // Текущая активная семья
  const family = families.find((f) => f.id === activeFamilyId) || null;

  // Активный пользователь (чистое состояние до входа)
  const [currentUser, setCurrentUser] = useState<DevUser>(EMPTY_USER);

  // Хранилище корзин: ключом выступает familyId или eventId
  const [carts, setCarts] = useState<Record<string, Record<string, CartItem>>>({});

  // Идентификатор активной корзины
  const [activeCartId, setActiveCartId] = useState<string>('main');

  // Мероприятия
  const [events, setEvents] = useState<AppEvent[]>([]);


  // Подключение к SignalR и синхронизация в реальном времени (корзина, статусы, семья, участники, мероприятия)
  useEffect(() => {
    if (!currentUser.id || !activeFamilyId) return;

    let unsubStatus: (() => void) | undefined;
    let unsubCart: (() => void) | undefined;
    let unsubFamily: (() => void) | undefined;
    let unsubMemberJoined: (() => void) | undefined;
    let unsubMemberRemoved: (() => void) | undefined;
    let unsubEventCreated: (() => void) | undefined;
    let unsubEventDeleted: (() => void) | undefined;
    let unsubEventCompleted: (() => void) | undefined;
    let unsubMemberUpdated: (() => void) | undefined;
    let unsubEventCartCreated: (() => void) | undefined;

    const setupSignalR = async () => {
      await SignalRService.start();
      await SignalRService.joinFamily(activeFamilyId);

      // 1. Загрузка начальной корзины из облака
      try {
        const cloudItems = await CartService.getCart(activeFamilyId);
        if (Array.isArray(cloudItems) && cloudItems.length > 0) {
          const mapped: Record<string, CartItem> = {};
          cloudItems.forEach((c) => {
            mapped[c.id] = {
              id: c.id,
              title: c.title,
              unit: c.unit,
              imageKey: c.imageKey || '',
              emoji: c.emoji || '📦',
              count: c.count,
              assignedToUserId: c.assignedToUserId || c.takenByUserId || null,
              isBought: c.isBought,
            };
          });
          setCarts((prev) => ({
            ...prev,
            [activeFamilyId]: mapped,
          }));
        }
      } catch (e) {
        console.warn('Failed to load initial cart from cloud:', e);
      }

      // 2. Загрузка мероприятий из облака
      try {
        const cloudEvents = await EventsService.getEvents(activeFamilyId);
        if (Array.isArray(cloudEvents)) {
          setEvents(
            cloudEvents.map((e) => ({
              id: String(e.id),
              title: e.title,
              date: e.eventDate,
              emoji: e.icon || '🎉',
              badgeBg: e.badgeBg || '#FFF0F4',
              hasCart: e.hasCart,
              isCompleted: e.isCompleted,
              completedAt: e.completedAt,
              familyId: e.familyId,
            }))
          );
        }
      } catch (e) {
        console.warn('Failed to load events from cloud:', e);
      }

      // 3. Подписка на изменение статусов товаров (кто взял товар / статус «Куплено»)
      unsubStatus = SignalRService.onProductStatusChanged((data) => {
        const targetId = data.cartItemId || data.productId;
        setCarts((prev) => {
          const currentFamCart = { ...(prev[activeFamilyId] || {}) };
          const key = Object.keys(currentFamCart).find((k) => currentFamCart[k].id === targetId || k === targetId);
          if (key) {
            currentFamCart[key] = {
              ...currentFamCart[key],
              assignedToUserId: data.assignedToUserId || data.takenByUserId || null,
              isBought: data.isBought,
            };
            return {
              ...prev,
              [activeFamilyId]: currentFamCart,
            };
          }
          return prev;
        });
      });

      // 4. Подписка на обновление состава корзины (добавление, удаление, изменение количества)
      unsubCart = SignalRService.onCartUpdated(async (data) => {
        if (data.familyId === activeFamilyId) {
          try {
            const freshItems = await CartService.getCart(activeFamilyId);
            const mapped: Record<string, CartItem> = {};
            freshItems.forEach((c) => {
              mapped[c.id] = {
                id: c.id,
                title: c.title,
                unit: c.unit,
                imageKey: c.imageKey || '',
                emoji: c.emoji || '📦',
                count: c.count,
                assignedToUserId: c.assignedToUserId || c.takenByUserId || null,
                isBought: c.isBought,
              };
            });
            setCarts((prev) => ({
              ...prev,
              [activeFamilyId]: mapped,
            }));
          } catch (err) {
            console.warn('Failed to refresh cart on SignalR CartUpdated:', err);
          }
        }
      });

      // 5. Подписка на переименование группы (Bug 2)
      unsubFamily = SignalRService.onFamilyUpdated((data) => {
        setFamilies((prev) =>
          prev.map((f) => (f.id === data.familyId ? { ...f, name: data.name } : f))
        );
        setKnownFamilies((prev) =>
          prev[data.familyId]
            ? { ...prev, [data.familyId]: { ...prev[data.familyId], name: data.name } }
            : prev
        );
        if (activeFamilyId === data.familyId) {
          setCurrentUser((prev) => ({ ...prev, familyName: data.name }));
        }
      });

      // 6. Подписка на вступление нового участника (Bug 3)
      unsubMemberJoined = SignalRService.onMemberJoined((data) => {
        if (!data?.member) return;
        const newMember: DevUser = {
          id: String(data.member.id),
          name: data.member.displayName || data.member.name || 'Участник',
          email: data.member.email,
          avatarChar: data.member.avatarChar || (data.member.displayName || 'У')[0].toUpperCase(),
          avatarBg: data.member.avatarBg || '#E0E7FF',
          avatarColor: data.member.avatarColor || '#3730A3',
          familyId: data.familyId,
          familyName: data.member.familyName || '',
        };

        setFamilies((prev) =>
          prev.map((f) => {
            if (f.id !== data.familyId) return f;
            if (f.members.some((m) => m.id === newMember.id)) return f;
            return { ...f, members: [...f.members, newMember] };
          })
        );

        setKnownFamilies((prev) => {
          const target = prev[data.familyId];
          if (!target) return prev;
          if (target.members.some((m) => m.id === newMember.id)) return prev;
          return {
            ...prev,
            [data.familyId]: {
              ...target,
              members: [...target.members, newMember],
            },
          };
        });
      });

      // 7. Подписка на удаление участника или выход из группы (Bug 5, Bug 7, Bug 8, Bug 11, Bug 12)
      unsubMemberRemoved = SignalRService.onMemberRemoved((data) => {
        if (data.userId === currentUser.id) {
          // Текущего пользователя удалили или он вышел
          setFamilies((prev) => {
            const remaining = prev.filter((f) => f.id !== data.familyId);
            if (activeFamilyId === data.familyId) {
              if (remaining.length > 0) {
                const next = remaining[0];
                setActiveFamilyId(next.id);
                setCurrentUser((u) => ({ ...u, familyId: next.id, familyName: next.name }));
                setActiveCartId(next.id);
                Storage.setItem('@product_basket_last_active_family', next.id).catch(() => {});
                Alert.alert('Группа', `Вы вышли из группы (или были исключены). Переключено на группу «${next.name}».`);
              } else {
                setActiveFamilyId('');
                setCurrentUser((u) => ({ ...u, familyId: null, familyName: null }));
                setActiveCartId('main');
                Storage.removeItem('@product_basket_last_active_family').catch(() => {});
                Alert.alert('Группа', 'Вы вышли из группы (или были исключены).');
              }
            }
            return remaining;
          });
          setKnownFamilies((prev) => {
            const copy = { ...prev };
            delete copy[data.familyId];
            return copy;
          });
          return;
        }

        // Другого участника удалили из группы:
        setFamilies((prev) =>
          prev.map((f) => {
            if (f.id !== data.familyId) return f;
            return {
              ...f,
              members: f.members.filter((m) => m.id !== data.userId),
            };
          })
        );
        setKnownFamilies((prev) => {
          const target = prev[data.familyId];
          if (!target) return prev;
          return {
            ...prev,
            [data.familyId]: {
              ...target,
              members: target.members.filter((m) => m.id !== data.userId),
            },
          };
        });

        // Снимаем товары, закрепленные за удаленным участником
        setCarts((prev) => {
          const currentFamCart = { ...(prev[data.familyId] || {}) };
          let modified = false;
          Object.keys(currentFamCart).forEach((k) => {
            if (currentFamCart[k].assignedToUserId === data.userId) {
              currentFamCart[k] = {
                ...currentFamCart[k],
                assignedToUserId: null,
                isBought: false,
              };
              modified = true;
            }
          });
          if (modified) {
            return { ...prev, [data.familyId]: currentFamCart };
          }
          return prev;
        });
      });

      // Подписка на обновление имени участника (Bug 7)
      unsubMemberUpdated = SignalRService.onMemberUpdated((data) => {
        if (!data?.userId) return;
        setFamilies((prev) =>
          prev.map((f) => {
            if (f.id !== data.familyId) return f;
            return {
              ...f,
              members: f.members.map((m) =>
                m.id === data.userId ? { ...m, name: data.displayName } : m
              ),
            };
          })
        );
        if (data.userId === currentUser.id) {
          setCurrentUser((u) => ({ ...u, name: data.displayName }));
        }
      });

      // Подписка на создание корзины мероприятия (Bug 3)
      unsubEventCartCreated = SignalRService.onEventCartCreated((data) => {
        setEvents((prev) =>
          prev.map((e) => (e.id === data.eventId ? { ...e, hasCart: true } : e))
        );
      });

      // 8. Подписка на создание, удаление и завершение мероприятий (Bug 4)
      unsubEventCreated = SignalRService.onEventCreated(async (data) => {
        if (data.familyId === activeFamilyId) {
          try {
            const freshEvents = await EventsService.getEvents(activeFamilyId);
            if (Array.isArray(freshEvents)) {
              setEvents(
                freshEvents.map((e) => ({
                  id: String(e.id),
                  title: e.title,
                  date: e.eventDate,
                  emoji: e.icon || '🎉',
                  badgeBg: e.badgeBg || '#FFF0F4',
                  hasCart: e.hasCart,
                  isCompleted: e.isCompleted,
                  completedAt: e.completedAt,
                  familyId: e.familyId,
                }))
              );
            }
          } catch (e) {
            console.warn('Failed to refresh events on EventCreated:', e);
          }
        }
      });

      unsubEventDeleted = SignalRService.onEventDeleted((data) => {
        setEvents((prev) => prev.filter((e) => e.id !== data.eventId));
      });

      unsubEventCompleted = SignalRService.onEventCompleted((data) => {
        setEvents((prev) =>
          prev.map((e) => (e.id === data.eventId ? { ...e, isCompleted: true, completedAt: data.completedAt } : e))
        );
      });
    };

    setupSignalR();

    return () => {
      if (unsubStatus) unsubStatus();
      if (unsubCart) unsubCart();
      if (unsubFamily) unsubFamily();
      if (unsubMemberJoined) unsubMemberJoined();
      if (unsubMemberRemoved) unsubMemberRemoved();
      if (unsubEventCreated) unsubEventCreated();
      if (unsubEventDeleted) unsubEventDeleted();
      if (unsubEventCompleted) unsubEventCompleted();
      if (unsubMemberUpdated) unsubMemberUpdated();
      if (unsubEventCartCreated) unsubEventCartCreated();
    };
  }, [currentUser.id, activeFamilyId]);

  const colors = getThemeColors(theme);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const t = (key: keyof typeof TRANSLATIONS.ru, vars?: Record<string, string>): string => {
    let str = TRANSLATIONS.ru[key] || '';
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return str;
  };

  const [registeredUsers, setRegisteredUsers] = useState<Record<string, DevUser>>({});

  const setCurrentUserByEmail = (email: string): { user: DevUser; hasFamily: boolean } => {
    const cleanEmail = email.trim().toLowerCase();
    let baseUser = registeredUsers[cleanEmail];

    if (!baseUser) {
      const derivedName = cleanEmail.split('@')[0] || 'Пользователь';
      const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
      baseUser = {
        id: `usr-${cleanEmail.replace(/[^a-z0-9]/g, '') || Date.now()}`,
        name: formattedName,
        email: cleanEmail,
        avatarChar: formattedName.charAt(0).toUpperCase(),
        avatarBg: '#E0E7FF',
        avatarColor: '#3730A3',
        familyId: null,
        familyName: null,
      };
    }

    // Находим все семьи, в которых состоит данный пользователь
    const userFamilies = Object.values(knownFamilies).filter((f) =>
      f.members.some((m) => m.id === baseUser.id || m.email?.toLowerCase() === cleanEmail)
    );
    const hasFamily = userFamilies.length > 0;
    const activeFam = hasFamily ? userFamilies[0] : null;

    setFamilies(userFamilies);
    setActiveFamilyId(activeFam ? activeFam.id : null);
    if (activeFam) {
      setActiveCartId(activeFam.id);
      setCarts((prev) => ({
        ...prev,
        [activeFam.id]: prev[activeFam.id] || {},
      }));
    } else {
      setActiveCartId('main');
    }

    const updatedUser: DevUser = {
      ...baseUser,
      familyId: activeFam ? activeFam.id : null,
      familyName: activeFam ? activeFam.name : null,
    };

    setCurrentUser(updatedUser);
    return { user: updatedUser, hasFamily };
  };

  const setCurrentUserFromAuth = async (authData: AuthResponse): Promise<{ user: DevUser; hasFamily: boolean }> => {
    const cleanEmail = authData.user.email.trim().toLowerCase();
    const cleanName = authData.user.displayName || (authData.user as any).name || 'Пользователь';

    let userFamilies: FamilyState[] = [];

    try {
      const myFamilies = await FamilyService.getMyFamilies(authData.token);
      if (Array.isArray(myFamilies) && myFamilies.length > 0) {
        userFamilies = myFamilies.map((f: any) => ({
          id: String(f.id),
          name: f.name,
          code: f.code,
          members: (f.members || []).map((m: any) => ({
            id: String(m.id),
            name: m.displayName || m.name || 'Участник',
            email: m.email,
            avatarChar: m.avatarChar || (m.displayName || 'У')[0].toUpperCase(),
            avatarBg: m.avatarBg || '#E0E7FF',
            avatarColor: m.avatarColor || '#3730A3',
            familyId: String(f.id),
            familyName: f.name,
          })),
          customProducts: [],
        }));
      }
    } catch (e) {
      console.warn('Failed to load families from cloud:', e);
    }

    // Если в ответе логина был familyId, но getMyFamilies не вернул (например сбой сети)
    if (userFamilies.length === 0 && authData.user.familyId) {
      const fallbackFam: FamilyState = {
        id: String(authData.user.familyId),
        name: authData.user.familyName || 'Моя семья',
        code: '------',
        members: [],
        customProducts: [],
      };
      userFamilies = [fallbackFam];
    }

    // Если в облаке ничего нет, проверяем локальный реестр
    if (userFamilies.length === 0) {
      userFamilies = Object.values(knownFamilies).filter((f) =>
        f.members.some((m) => m.email?.toLowerCase() === cleanEmail)
      );
    }

    const hasFamily = userFamilies.length > 0;
    let activeFam = hasFamily ? userFamilies[0] : null;

    try {
      const savedActiveId = await Storage.getItem('@product_basket_last_active_family');
      if (savedActiveId && userFamilies.some((f) => f.id === savedActiveId)) {
        activeFam = userFamilies.find((f) => f.id === savedActiveId) || activeFam;
      }
    } catch {}

    // Подгрузка пользовательских товаров с бэкенда (Bug 9)
    try {
      for (const fam of userFamilies) {
        const prods = await ProductsService.getProducts(fam.id);
        const customs = prods.filter((p: any) => p.familyId != null || (p.category && p.category.includes('Свои')));
        fam.customProducts = customs.map((cp: any) => ({
          id: String(cp.id),
          title: cp.title,
          unit: cp.unit || '1 шт',
          emoji: cp.emoji || '🛍️',
          imageKey: cp.imageKey || '',
        }));
      }
    } catch (err) {
      console.warn('Failed to load custom products from backend:', err);
    }

    const loggedUser: DevUser = {
      id: String(authData.user.id),
      name: cleanName,
      email: cleanEmail,
      avatarChar: cleanName.charAt(0).toUpperCase() || 'U',
      avatarBg: (authData.user as any).avatarBg || '#E0E7FF',
      avatarColor: (authData.user as any).avatarColor || '#3730A3',
      familyId: activeFam ? activeFam.id : null,
      familyName: activeFam ? activeFam.name : null,
    };

    setFamilies(userFamilies);
    setKnownFamilies((prev) => {
      const updated = { ...prev };
      userFamilies.forEach((f) => {
        updated[f.id] = f;
      });
      return updated;
    });

    setActiveFamilyId(activeFam ? activeFam.id : null);
    if (activeFam) {
      setActiveCartId(activeFam.id);
      setCarts((prev) => ({
        ...prev,
        [activeFam.id]: prev[activeFam.id] || {},
      }));
    } else {
      setActiveCartId('main');
    }

    setCurrentUser(loggedUser);
    return { user: loggedUser, hasFamily };
  };

  const registerUser = (displayName: string, email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim() || 'Пользователь';
    const newUser: DevUser = {
      id: `usr-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      avatarChar: cleanName.charAt(0).toUpperCase() || 'U',
      avatarBg: '#E0E7FF',
      avatarColor: '#3730A3',
      familyId: null,
      familyName: null,
    };

    setRegisteredUsers((prev) => ({
      ...prev,
      [cleanEmail]: newUser,
    }));
    setCurrentUser(newUser);
  };

  const logout = async () => {
    try {
      await AuthService.removeToken();
    } catch {}
    setCurrentUser(EMPTY_USER);
    setFamilies([]);
    setActiveFamilyId(null);
    setCarts({});
    setEvents([]);
    setKnownFamilies({});
    setActiveCartId('main');
  };

  const updateUserName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const firstChar = trimmed.charAt(0).toUpperCase();
    const updatedUser: DevUser = {
      ...currentUser,
      name: trimmed,
      avatarChar: firstChar,
    };

    setCurrentUser(updatedUser);

    setRegisteredUsers((prev) => ({
      ...prev,
      [currentUser.email.toLowerCase().trim()]: updatedUser,
    }));

    setFamilies((prev) =>
      prev.map((f) => ({
        ...f,
        members: f.members.map((m) =>
          m.id === currentUser.id ? { ...m, name: trimmed, avatarChar: firstChar } : m
        ),
      }))
    );

    AuthService.updateProfile(trimmed).catch((e) =>
      console.warn('Cloud updateProfile failed:', e)
    );
  };

  // Переключение между семьями пользователя
  const switchFamily = (familyId: string) => {
    const target = families.find((f) => f.id === familyId);
    if (!target) return;

    setActiveFamilyId(target.id);
    setCurrentUser((prev) => ({
      ...prev,
      familyId: target.id,
      familyName: target.name,
    }));

    // Если сейчас открыта корзина семьи (не мероприятие), переключаем на корзину этой семьи
    const activeEvt = events.find((e) => e.id === activeCartId);
    if (!activeEvt) {
      setActiveCartId(target.id);
      setCarts((prev) => ({
        ...prev,
        [target.id]: prev[target.id] || {},
      }));
    }

    Storage.setItem('@product_basket_last_active_family', target.id).catch(() => {});
  };

  // Создание новой семьи / группы
  const createFamily = async (name: string): Promise<string> => {
    let newCode = generateRandomCode();
    let familyId = `fam-${Date.now()}`;
    const familyName = name.trim() || 'Группа';

    try {
      const serverFam = await FamilyService.createFamily(familyName);
      if (serverFam?.inviteCode) {
        newCode = serverFam.inviteCode;
      }
      if (serverFam?.familyId) {
        familyId = serverFam.familyId;
      }
    } catch (e) {
      console.warn('Backend createFamily failed, using local mode:', e);
    }

    const creatorUser: DevUser = {
      ...currentUser,
      familyId: familyId,
      familyName: familyName,
    };

    const newFamily: FamilyState = {
      id: familyId,
      name: familyName,
      code: newCode,
      members: [creatorUser],
      customProducts: [],
    };

    setFamilies((prev) => [...prev, newFamily]);
    setKnownFamilies((prev) => ({ ...prev, [familyId]: newFamily }));
    setActiveFamilyId(familyId);
    setCurrentUser(creatorUser);
    setActiveCartId(familyId);
    setCarts((prev) => ({
      ...prev,
      [familyId]: {},
    }));

    SignalRService.joinFamily(familyId).catch((e) => console.warn('SignalR joinFamily failed:', e));

    return newCode;
  };

  // Вступление в семью по 6-значному коду
  const joinFamilyWithCode = async (code: string): Promise<boolean> => {
    const formattedInput = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!formattedInput || formattedInput.length < 3) return false;

    // 1. Ищем среди уже добавленных семей пользователя
    const existingUserFamily = families.find(
      (f) => f.code.toUpperCase().replace(/[^A-Z0-9]/g, '') === formattedInput
    );
    if (existingUserFamily) {
      switchFamily(existingUserFamily.id);
      return true;
    }

    // 2. Ищем в общем реестре известных локальных семей
    const foundEntry = Object.values(knownFamilies).find(
      (f) => f.code.toUpperCase().replace(/[^A-Z0-9]/g, '') === formattedInput
    );

    if (foundEntry) {
      const joinedUser: DevUser = {
        ...currentUser,
        familyId: foundEntry.id,
        familyName: foundEntry.name,
      };

      const alreadyMember = foundEntry.members.some((m) => m.id === currentUser.id);
      const updatedMembers = alreadyMember ? foundEntry.members : [...foundEntry.members, joinedUser];
      const updatedFamily: FamilyState = {
        ...foundEntry,
        members: updatedMembers,
      };

      setKnownFamilies((prev) => ({
        ...prev,
        [foundEntry.id]: updatedFamily,
      }));

      setFamilies((prev) => [...prev.filter((f) => f.id !== foundEntry.id), updatedFamily]);
      setActiveFamilyId(foundEntry.id);
      setCurrentUser(joinedUser);
      setActiveCartId(foundEntry.id);
      setCarts((prev) => ({
        ...prev,
        [foundEntry.id]: prev[foundEntry.id] || {},
      }));

      return true;
    }

    // 3. Запрос к реальному бэкенду в облаке (POST /api/family/join)
    try {
      const serverFam = await FamilyService.joinFamily(formattedInput);
      if (serverFam?.familyId) {
        let membersList: DevUser[] = [];
        try {
          const cloudMembers = await FamilyService.getMembers(serverFam.familyId);
          if (Array.isArray(cloudMembers) && cloudMembers.length > 0) {
            membersList = cloudMembers.map((m: any) => ({
              id: String(m.id),
              name: m.displayName || m.name || 'Участник',
              email: m.email,
              avatarChar: m.avatarChar || (m.displayName || 'У')[0].toUpperCase(),
              avatarBg: m.avatarBg || '#E0E7FF',
              avatarColor: m.avatarColor || '#3730A3',
              familyId: serverFam.familyId,
              familyName: serverFam.name,
            }));
          }
        } catch (memErr) {
          console.warn('Failed to fetch members for joined family:', memErr);
        }

        const joinedUser: DevUser = {
          ...currentUser,
          familyId: serverFam.familyId,
          familyName: serverFam.name,
        };

        if (!membersList.some((m) => m.id === joinedUser.id)) {
          membersList.push(joinedUser);
        }

        const serverFamily: FamilyState = {
          id: serverFam.familyId,
          name: serverFam.name,
          code: serverFam.inviteCode || formattedInput,
          members: membersList,
          customProducts: [],
        };

        setKnownFamilies((prev) => ({ ...prev, [serverFam.familyId]: serverFamily }));
        setFamilies((prev) => {
          const exists = prev.some((f) => f.id === serverFam.familyId);
          return exists ? prev.map((f) => (f.id === serverFam.familyId ? serverFamily : f)) : [...prev, serverFamily];
        });
        setActiveFamilyId(serverFam.familyId);
        setCurrentUser(joinedUser);
        setActiveCartId(serverFam.familyId);
        setCarts((prev) => ({ ...prev, [serverFam.familyId]: prev[serverFam.familyId] || {} }));

        SignalRService.joinFamily(serverFam.familyId).catch((e) => console.warn('SignalR joinFamily failed:', e));

        return true;
      }
    } catch (e) {
      console.warn('Backend joinFamily failed:', e);
    }

    return false;
  };

  const updateFamilyName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || !family) return;

    setFamilies((prev) =>
      prev.map((f) => (f.id === family.id ? { ...f, name: trimmed } : f))
    );
    setKnownFamilies((prev) =>
      prev[family.id] ? { ...prev, [family.id]: { ...prev[family.id], name: trimmed } } : prev
    );
    setCurrentUser((prev) => ({
      ...prev,
      familyName: trimmed,
    }));

    FamilyService.updateFamilyName(trimmed, family.id).catch((e) =>
      console.warn('Backend updateFamilyName failed:', e)
    );
  };

  const leaveFamily = () => {
    if (!family) return;
    const leaverId = currentUser.id;
    const targetFamilyId = family.id;

    // Удаляем товары уходящего человека из корзины этой семьи
    setCarts((prevCarts) => {
      const familyCart = prevCarts[targetFamilyId] || {};
      const filteredCart: Record<string, CartItem> = {};
      for (const [itemId, item] of Object.entries(familyCart)) {
        if (item.assignedToUserId !== leaverId) {
          filteredCart[itemId] = item;
        }
      }
      return {
        ...prevCarts,
        [targetFamilyId]: filteredCart,
      };
    });

    setKnownFamilies((prev) => {
      if (!prev[targetFamilyId]) return prev;
      return {
        ...prev,
        [targetFamilyId]: {
          ...prev[targetFamilyId],
          members: prev[targetFamilyId].members.filter((m) => m.id !== leaverId),
        },
      };
    });

    const remainingFamilies = families.filter((f) => f.id !== targetFamilyId);
    setFamilies(remainingFamilies);

    if (remainingFamilies.length > 0) {
      const nextFamily = remainingFamilies[0];
      setActiveFamilyId(nextFamily.id);
      setCurrentUser((prev) => ({
        ...prev,
        familyId: nextFamily.id,
        familyName: nextFamily.name,
      }));
      setActiveCartId(nextFamily.id);
    } else {
      setActiveFamilyId(null);
      setCurrentUser((prev) => ({
        ...prev,
        familyId: null,
        familyName: null,
      }));
      setActiveCartId('main');
    }

    FamilyService.leaveFamily(targetFamilyId).catch((e) => console.warn('Backend leaveFamily failed:', e));
  };

  const removeMemberFromFamily = (memberId: string) => {
    if (!family) return;
    const targetFamilyId = family.id;

    // Удаляем товары этого человека из корзины семьи
    setCarts((prevCarts) => {
      const familyCart = prevCarts[targetFamilyId] || {};
      const filteredCart: Record<string, CartItem> = {};
      for (const [itemId, item] of Object.entries(familyCart)) {
        if (item.assignedToUserId !== memberId) {
          filteredCart[itemId] = item;
        }
      }
      return {
        ...prevCarts,
        [targetFamilyId]: filteredCart,
      };
    });

    setKnownFamilies((prev) => {
      if (!prev[targetFamilyId]) return prev;
      return {
        ...prev,
        [targetFamilyId]: {
          ...prev[targetFamilyId],
          members: prev[targetFamilyId].members.filter((m) => m.id !== memberId),
        },
      };
    });

    setFamilies((prev) =>
      prev.map((f) => {
        if (f.id !== targetFamilyId) return f;
        return {
          ...f,
          members: f.members.filter((m) => m.id !== memberId),
        };
      })
    );

    if (currentUser.id === memberId) {
      leaveFamily();
    } else {
      FamilyService.removeMember(memberId, targetFamilyId).catch((e) =>
        console.warn('Backend removeMember failed:', e)
      );
    }
  };

  // Добавление пользовательского товара в указанную семью с сохранением на бэкенде (Bug 9)
  const addCustomProduct = async (
    familyId: string,
    product: { title: string; unit: string; emoji: string }
  ) => {
    const trimmedTitle = product.title.trim();
    if (!trimmedTitle) return;

    const tempId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newProduct: CatalogProduct = {
      id: tempId,
      title: trimmedTitle,
      unit: product.unit.trim() || '1 шт',
      imageKey: '',
      emoji: product.emoji || '🛍️',
    };

    setFamilies((prev) =>
      prev.map((f) =>
        f.id === familyId
          ? {
              ...f,
              customProducts: [...(f.customProducts || []), newProduct],
            }
          : f
      )
    );

    setKnownFamilies((prev) =>
      prev[familyId]
        ? {
            ...prev,
            [familyId]: {
              ...prev[familyId],
              customProducts: [...(prev[familyId].customProducts || []), newProduct],
            },
          }
        : prev
    );

    try {
      const created = await ProductsService.createCustomProduct({
        title: trimmedTitle,
        unit: product.unit.trim() || '1 шт',
        category: 'Свои товары',
        emoji: product.emoji || '🛍️',
        familyId: familyId,
      });
      if (created?.id) {
        setFamilies((prev) =>
          prev.map((f) =>
            f.id === familyId
              ? {
                  ...f,
                  customProducts: (f.customProducts || []).map((cp) =>
                    cp.id === tempId ? { ...cp, id: String(created.id) } : cp
                  ),
                }
              : f
          )
        );
      }
    } catch (e) {
      console.warn('Backend createCustomProduct failed:', e);
    }
  };

  // Удаление пользовательского товара из семьи
  const deleteCustomProduct = (familyId: string, productId: string) => {
    ProductsService.deleteProduct(productId).catch((e) => console.warn('Backend deleteProduct failed:', e));
    setFamilies((prev) =>
      prev.map((f) =>
        f.id === familyId
          ? {
              ...f,
              customProducts: (f.customProducts || []).filter((p) => p.id !== productId),
            }
          : f
      )
    );

    setKnownFamilies((prev) =>
      prev[familyId]
        ? {
            ...prev,
            [familyId]: {
              ...prev[familyId],
              customProducts: (prev[familyId].customProducts || []).filter((p) => p.id !== productId),
            },
          }
        : prev
    );

    // Также удаляем из корзины этой семьи, если он там был
    setCarts((prev) => {
      const familyCart = prev[familyId] || {};
      if (!familyCart[productId]) return prev;
      const updated = { ...familyCart };
      delete updated[productId];
      return {
        ...prev,
        [familyId]: updated,
      };
    });
  };

  // Получить корзину конкретной семьи
  const getFamilyCart = (familyId: string): Record<string, CartItem> => {
    return carts[familyId] || {};
  };

  // Управление активной корзиной
  const openMainCart = () => {
    const targetCartKey = activeFamilyId || 'main';
    setActiveCartId(targetCartKey);
  };

  const openEventCart = (eventId: string) => {
    setActiveCartId(eventId);
    setCarts((prev) => ({
      ...prev,
      [eventId]: prev[eventId] || {},
    }));
  };

  const currentCartKey = activeCartId;
  const cartItems = carts[currentCartKey] || {};

  const activeEvent = events.find((e) => e.id === activeCartId);
  const isEventCart = !!activeEvent;
  const activeCartTitle = activeEvent
    ? `${activeEvent.title} ${activeEvent.emoji}`.trim()
    : 'Корзина';

  const addToCart = (item: Omit<CartItem, 'count' | 'assignedToUserId'>) => {
    setCarts((prev) => {
      const currentCart = prev[activeCartId] || {};
      const existing = currentCart[item.id];
      const updatedCart = {
        ...currentCart,
        [item.id]: existing
          ? { ...existing, count: existing.count + 1 }
          : { ...item, count: 1, assignedToUserId: null, isBought: false },
      };
      return {
        ...prev,
        [activeCartId]: updatedCart,
      };
    });

    if (activeFamilyId) {
      CartService.addItem({
        title: item.title,
        unit: item.unit,
        imageKey: item.imageKey,
        emoji: item.emoji,
        count: 1,
        familyId: activeFamilyId,
        eventId: isEventCart ? activeCartId : undefined,
      }).catch((e) => console.warn('Cloud sync addItem failed:', e));
    }
  };

  const decrementCartItem = (itemId: string) => {
    setCarts((prev) => {
      const currentCart = prev[activeCartId] || {};
      const existing = currentCart[itemId];
      if (!existing) return prev;

      const updatedCart = { ...currentCart };
      if (existing.count <= 1) {
        delete updatedCart[itemId];
      } else {
        updatedCart[itemId] = { ...existing, count: existing.count - 1 };
      }
      return {
        ...prev,
        [activeCartId]: updatedCart,
      };
    });

    CartService.decrementItem(itemId).catch((e) => console.warn('Cloud sync decrement failed:', e));
  };

  const deleteFromCart = (itemId: string) => {
    setCarts((prev) => {
      const currentCart = prev[activeCartId] || {};
      const updatedCart = { ...currentCart };
      delete updatedCart[itemId];
      return {
        ...prev,
        [activeCartId]: updatedCart,
      };
    });

    CartService.deleteItem(itemId).catch((e) => console.warn('Cloud sync delete failed:', e));
  };

  // Распределение товара: взять себе или снять выбор
  const assignCartItem = (itemId: string): { success: boolean; message?: string } => {
    const currentCart = carts[activeCartId] || {};
    const item = currentCart[itemId];
    if (!item) return { success: false, message: 'Товар не найден' };

    if (item.assignedToUserId === null) {
      // Свободный товар -> берем себе
      setCarts((prev) => ({
        ...prev,
        [activeCartId]: {
          ...prev[activeCartId],
          [itemId]: { ...prev[activeCartId][itemId], assignedToUserId: currentUser.id },
        },
      }));
      CartService.assignProduct(item.id).catch((e) => console.warn('Cloud assignProduct failed:', e));
      return { success: true };
    }

    if (item.assignedToUserId === currentUser.id) {
      // Мы сами взяли -> снимаем свой выбор (и сбрасываем статус "Куплено")
      setCarts((prev) => ({
        ...prev,
        [activeCartId]: {
          ...prev[activeCartId],
          [itemId]: { ...prev[activeCartId][itemId], assignedToUserId: null, isBought: false },
        },
      }));
      CartService.assignProduct(item.id).catch((e) => console.warn('Cloud assignProduct failed:', e));
      return { success: true };
    }

    // Товар уже взял другой участник семьи -> заблокирован
    const allKnownUsers = [
      ...(family?.members || []),
      ...Object.values(registeredUsers),
    ];
    const otherUser = allKnownUsers.find((m) => m.id === item.assignedToUserId);
    const otherName = otherUser ? otherUser.name : 'другой участник';
    return {
      success: false,
      message: `Этот товар уже выбрал(а) ${otherName}. Вы не можете его изменить.`,
    };
  };

  // Отметка статуса "Куплено" (только участник, который выбрал товар, может отметить его купленным)
  const toggleItemPurchased = (itemId: string): { success: boolean; message?: string } => {
    const currentCart = carts[activeCartId] || {};
    const item = currentCart[itemId];
    if (!item) return { success: false, message: 'Товар не найден' };

    if (item.assignedToUserId === null) {
      return {
        success: false,
        message: 'Сначала выберите товар («Куплю я»), чтобы затем отметить его статусом «Куплено».',
      };
    }

    if (item.assignedToUserId !== currentUser.id) {
      const allKnownUsers = [
        ...(family?.members || []),
        ...Object.values(registeredUsers),
      ];
      const otherUser = allKnownUsers.find((m) => m.id === item.assignedToUserId);
      const otherName = otherUser ? otherUser.name : 'другой участник';
      return {
        success: false,
        message: `Товар «${item.title}» выбрал(а) ${otherName}. Только ${otherName} может отметить его купленным.`,
      };
    }

    setCarts((prev) => {
      const activeCart = prev[activeCartId] || {};
      const it = activeCart[itemId];
      if (!it) return prev;
      return {
        ...prev,
        [activeCartId]: {
          ...activeCart,
          [itemId]: {
            ...it,
            isBought: !it.isBought,
          },
        },
      };
    });

    CartService.togglePurchased(item.id).catch((e) => console.warn('Cloud togglePurchased failed:', e));

    return { success: true };
  };

  const totalCartItemsCount = Object.values(cartItems).reduce((sum, item) => sum + item.count, 0);

  const createEvent = async (data: { title: string; date: string; emoji: string; familyId?: string }) => {
    const targetFamilyId = data.familyId || activeFamilyId || (families.length > 0 ? families[0].id : undefined);
    const tempId = `evt-${Date.now()}`;
    const newEvt: AppEvent = {
      id: tempId,
      title: data.title,
      date: data.date,
      emoji: data.emoji,
      badgeBg: '#FFF0F4',
      hasCart: false,
      isCompleted: false,
      familyId: targetFamilyId,
    };
    setEvents((prev) => [newEvt, ...prev]);

    if (targetFamilyId) {
      try {
        const cloudEvt = await EventsService.createEvent({
          title: data.title,
          eventDate: data.date,
          icon: data.emoji,
          familyId: targetFamilyId,
        });
        if (cloudEvt?.id) {
          setEvents((prev) =>
            prev.map((e) => (e.id === tempId ? { ...e, id: String(cloudEvt.id) } : e))
          );
        }
      } catch (e) {
        console.warn('Backend createEvent failed:', e);
      }
    }
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setCarts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (activeCartId === id) {
      openMainCart();
    }
    EventsService.deleteEvent(id).catch((e) => console.warn('Backend deleteEvent failed:', e));
  };

  const createEventCart = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, hasCart: true } : e))
    );
    setCarts((prev) => ({
      ...prev,
      [id]: prev[id] || {},
    }));
    EventsService.createEventCart(id).catch((e) => console.warn('Backend createEventCart failed:', e));
  };

  const getEventCartStats = (
    eventId: string
  ): { total: number; assigned: number; bought: number } => {
    const eventCart = carts[eventId] || {};
    const items = Object.values(eventCart);
    const total = items.length;
    const assigned = items.filter((i) => i.assignedToUserId !== null).length;
    const bought = items.filter((i) => i.isBought).length;
    return { total, assigned, bought };
  };

  // Завершение мероприятия: перемещение в папку "Завершенные мероприятия"
  const completeEvent = (eventId: string) => {
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const now = new Date();
    const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;

    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, isCompleted: true, completedAt: dateStr }
          : e
      )
    );

    EventsService.completeEvent(eventId).catch((e) => console.warn('Backend completeEvent failed:', e));

    // Если сейчас открыта корзина этого завершаемого мероприятия, возвращаемся к общей корзине
    if (activeCartId === eventId) {
      const targetCartKey = activeFamilyId || 'main';
      setActiveCartId(targetCartKey);
    }
  };

  // Возобновление мероприятия из папки завершенных
  const reopenEvent = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, isCompleted: false, completedAt: undefined }
          : e
      )
    );
  };

  const resetToInitialState = () => {
    setCarts({});
    setEvents([]);
    setFamilies([]);
    setKnownFamilies({});
    setActiveFamilyId(null);
    setActiveCartId('main');
    setCurrentUser(EMPTY_USER);
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        colors,
        toggleTheme,
        fontScale,
        setFontScale,
        fontScaleMultiplier,
        language,
        t,
        currentUser,
        setCurrentUserByEmail,
        setCurrentUserFromAuth,
        registerUser,
        updateUserName,
        logout,
        families,
        activeFamilyId,
        family,
        switchFamily,
        createFamily,
        joinFamilyWithCode,
        updateFamilyName,
        leaveFamily,
        removeMemberFromFamily,
        addCustomProduct,
        deleteCustomProduct,
        activeCartId,
        activeCartTitle,
        isEventCart,
        openMainCart,
        openEventCart,
        getFamilyCart,
        cartItems,
        addToCart,
        decrementCartItem,
        deleteFromCart,
        assignCartItem,
        toggleItemPurchased,
        totalCartItemsCount,
        events,
        createEvent,
        deleteEvent,
        createEventCart,
        getEventCartStats,
        completeEvent,
        reopenEvent,
        resetToInitialState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
