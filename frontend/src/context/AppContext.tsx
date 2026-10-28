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
  cartStats?: {
    total: number;
    assigned: number;
    bought: number;
  };
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
  refreshEvents: (familyId?: string) => Promise<void>;
  createEvent: (data: { title: string; date: string; emoji: string; familyId?: string; hasCart?: boolean }) => void;
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

const sanitizeStorageKey = (key: string): string => key.replace(/[^a-zA-Z0-9._-]/g, '_');

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
      await SecureStore.setItemAsync(sanitizeStorageKey(key), value);
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
      return await SecureStore.getItemAsync(sanitizeStorageKey(key));
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
      await SecureStore.deleteItemAsync(sanitizeStorageKey(key));
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

  // Идентификатор активной корзины
  const [activeCartId, setActiveCartId] = useState<string>('main');

  // Текущая активная семья (case-insensitive с автопереходом к доступным семьям)
  const family =
    families.find((f) => f.id.toLowerCase() === activeFamilyId?.toLowerCase()) ||
    (families.length > 0 ? families[0] : null);

  // Автоматический переход к оставшимся семьям при выходе или несовпадении (Bug 5, Bug 13)
  useEffect(() => {
    if (families.length > 0) {
      if (!activeFamilyId || !families.some((f) => f.id.toLowerCase() === activeFamilyId.toLowerCase())) {
        setActiveFamilyId(families[0].id);
        setActiveCartId(families[0].id);
      } else if (activeCartId === 'main') {
        setActiveCartId(activeFamilyId);
      }
    }
  }, [families, activeFamilyId, activeCartId]);

  // Активный пользователь (чистое состояние до входа)
  const [currentUser, setCurrentUser] = useState<DevUser>(EMPTY_USER);

  // Хранилище корзин: ключом выступает familyId или eventId
  const [carts, setCarts] = useState<Record<string, Record<string, CartItem>>>({});

  // Мероприятия
  const [events, setEvents] = useState<AppEvent[]>([]);

  const activeFamilyIdRef = React.useRef(activeFamilyId);
  activeFamilyIdRef.current = activeFamilyId;
  const currentUserIdRef = React.useRef(currentUser.id);
  currentUserIdRef.current = currentUser.id;

  const refreshEvents = async (famId?: string) => {
    const targetFam = famId || activeFamilyIdRef.current;
    try {
      const cloudEvents = await EventsService.getEvents(targetFam || undefined);
      if (Array.isArray(cloudEvents)) {
        setEvents(
          cloudEvents.map((e: any) => ({
            id: String(e.id),
            title: e.title,
            date: e.eventDate,
            emoji: e.icon || '🎉',
            badgeBg: e.badgeBg || '#FFF0F4',
            hasCart: Boolean(e.hasCart ?? true),
            isCompleted: e.isCompleted,
            completedAt: e.completedAt,
            familyId: e.familyId,
            cartStats: e.cartStats || { total: 0, assigned: 0, bought: 0 },
          }))
        );
      }
    } catch (e) {
      console.warn('Failed to refresh events:', e);
    }
  };

  // Подключение к SignalR и синхронизация в реальном времени (корзина, статусы, семья, участники, мероприятия, свои товары)
  useEffect(() => {
    if (!currentUser.id || !activeFamilyId) return;

    // Сразу регистрируем всех слушателей SignalR перед любыми асинхронными сетевыми вызовами,
    // чтобы ни одно событие (MemberJoined, MemberRemoved, CartUpdated, EventCreated) не потерялось во время загрузки
    const unsubStatus = SignalRService.onProductStatusChanged((data) => {
        const targetId = (data.cartItemId || data.productId || '').toLowerCase();
        setCarts((prev) => {
          const updated = { ...prev };
          for (const cKey of Object.keys(updated)) {
            const currentFamCart = { ...(updated[cKey] || {}) };
            const matchedKey = Object.keys(currentFamCart).find(
              (k) => k.toLowerCase() === targetId || currentFamCart[k].id.toLowerCase() === targetId
            );
            if (matchedKey) {
              currentFamCart[matchedKey] = {
                ...currentFamCart[matchedKey],
                assignedToUserId: data.assignedToUserId ? data.assignedToUserId.toLowerCase() : (data.takenByUserId ? data.takenByUserId.toLowerCase() : null),
                isBought: data.isBought,
              };
              updated[cKey] = currentFamCart;
            }
          }
          return updated;
        });
      });

      // 5. Подписка на обновление состава корзины (добавление, удаление, изменение количества, корзины мероприятий)
      const unsubCart = SignalRService.onCartUpdated(async (data) => {
        const targetFamilyId = data.familyId || activeFamilyId;
        const currentActiveFamId = activeFamilyIdRef.current;
        if (targetFamilyId && targetFamilyId.toLowerCase() === currentActiveFamId?.toLowerCase()) {
          try {
            const eventId = data.eventId;
            const freshItems = await CartService.getCart(targetFamilyId, eventId);
            const mapped: Record<string, CartItem> = {};
            freshItems.forEach((c) => {
              const lowerId = c.id.toLowerCase();
              mapped[lowerId] = {
                id: lowerId,
                title: c.title,
                unit: c.unit,
                imageKey: c.imageKey || '',
                emoji: c.emoji || '📦',
                count: c.count,
                assignedToUserId: c.assignedToUserId ? c.assignedToUserId.toLowerCase() : (c.takenByUserId ? c.takenByUserId.toLowerCase() : null),
                isBought: c.isBought,
              };
            });
            const storageKey = (eventId || targetFamilyId).toLowerCase();
            setCarts((prev) => ({
              ...prev,
              [storageKey]: mapped,
            }));
          } catch (err) {
            console.warn('Failed to refresh cart on SignalR CartUpdated:', err);
          }
        }
      });

      // 6. Подписка на переименование группы (Bug 2)
      const unsubFamily = SignalRService.onFamilyUpdated((data) => {
        setFamilies((prev) =>
          prev.map((f) => (f.id.toLowerCase() === data.familyId.toLowerCase() ? { ...f, name: data.name } : f))
        );
        setKnownFamilies((prev) => {
          const matchedKey = Object.keys(prev).find((k) => k.toLowerCase() === data.familyId.toLowerCase());
          return matchedKey
            ? { ...prev, [matchedKey]: { ...prev[matchedKey], name: data.name } }
            : prev;
        });
        if (activeFamilyIdRef.current?.toLowerCase() === data.familyId.toLowerCase()) {
          setCurrentUser((prev) => ({ ...prev, familyName: data.name }));
        }
      });

      // 7. Подписка на вступление нового участника (Bug 6)
      const unsubMemberJoined = SignalRService.onMemberJoined((data) => {
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
            if (f.id.toLowerCase() !== data.familyId?.toLowerCase()) return f;
            if (f.members.some((m) => m.id.toLowerCase() === newMember.id.toLowerCase())) return f;
            return { ...f, members: [...f.members, newMember] };
          })
        );

        setKnownFamilies((prev) => {
          const matchedKey = Object.keys(prev).find((k) => k.toLowerCase() === data.familyId?.toLowerCase()) || data.familyId;
          const target = prev[matchedKey];
          if (!target) return prev;
          if (target.members.some((m) => m.id.toLowerCase() === newMember.id.toLowerCase())) return prev;
          return {
            ...prev,
            [matchedKey]: {
              ...target,
              members: [...target.members, newMember],
            },
          };
        });

        // Синхронизация списка участников с бэкенда
        FamilyService.getMembers(data.familyId)
          .then((cloudMembers) => {
            if (Array.isArray(cloudMembers) && cloudMembers.length > 0) {
              const mapped = cloudMembers.map((m: any) => ({
                id: String(m.id),
                name: m.displayName || m.name || 'Участник',
                email: m.email,
                avatarChar: m.avatarChar || (m.displayName || 'У')[0].toUpperCase(),
                avatarBg: m.avatarBg || '#E0E7FF',
                avatarColor: m.avatarColor || '#3730A3',
                familyId: data.familyId,
                familyName: '',
              }));
              setFamilies((prev) =>
                prev.map((f) =>
                  f.id.toLowerCase() === data.familyId?.toLowerCase() ? { ...f, members: mapped } : f
                )
              );
            }
          })
          .catch(() => {});
      });

      // 8. Подписка на удаление участника или выход из группы (Bug 5, Bug 7, Bug 8, Bug 11, Bug 12)
      const unsubMemberRemoved = SignalRService.onMemberRemoved((data) => {
        const isSelf = data.userId?.toLowerCase() === currentUserIdRef.current?.toLowerCase();
        if (isSelf) {
          // Текущего пользователя удалили или он вышел
          setFamilies((prev) => {
            const remaining = prev.filter((f) => f.id.toLowerCase() !== data.familyId?.toLowerCase());
            if (activeFamilyIdRef.current?.toLowerCase() === data.familyId?.toLowerCase()) {
              if (remaining.length > 0) {
                const next = remaining[0];
                setActiveFamilyId(next.id);
                setCurrentUser((u) => ({ ...u, familyId: next.id, familyName: next.name }));
                setActiveCartId(next.id);
                Storage.setItem('@product_basket_last_active_family', next.id).catch(() => {});
                SignalRService.joinFamily(next.id).catch(() => {});
                Alert.alert('Группа', `Вы вышли из группы (или были исключены). Переключено на группу «${next.name}».`);
              } else {
                setActiveFamilyId(null);
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
            const matchedKey = Object.keys(copy).find((k) => k.toLowerCase() === data.familyId?.toLowerCase());
            if (matchedKey) delete copy[matchedKey];
            return copy;
          });
          return;
        }

        // Другого участника удалили из группы или он вышел
        setFamilies((prev) =>
          prev.map((f) => {
            if (f.id.toLowerCase() !== data.familyId?.toLowerCase()) return f;
            return {
              ...f,
              members: f.members.filter((m) => m.id.toLowerCase() !== data.userId?.toLowerCase()),
            };
          })
        );
        setKnownFamilies((prev) => {
          const matchedKey = Object.keys(prev).find((k) => k.toLowerCase() === data.familyId?.toLowerCase());
          if (!matchedKey) return prev;
          const target = prev[matchedKey];
          return {
            ...prev,
            [matchedKey]: {
              ...target,
              members: target.members.filter((m) => m.id.toLowerCase() !== data.userId?.toLowerCase()),
            },
          };
        });

        // Снимаем товары, закрепленные за удаленным участником
        setCarts((prev) => {
          const matchedFamKey = Object.keys(prev).find((k) => k.toLowerCase() === data.familyId?.toLowerCase()) || data.familyId;
          const currentFamCart = { ...(prev[matchedFamKey] || {}) };
          let modified = false;
          Object.keys(currentFamCart).forEach((k) => {
            if (currentFamCart[k].assignedToUserId?.toLowerCase() === data.userId?.toLowerCase()) {
              currentFamCart[k] = {
                ...currentFamCart[k],
                assignedToUserId: null,
                isBought: false,
              };
              modified = true;
            }
          });
          if (modified) {
            return { ...prev, [matchedFamKey]: currentFamCart };
          }
          return prev;
        });

        // Синхронизация актуальных участников с бэкенда
        FamilyService.getMembers(data.familyId)
          .then((cloudMembers) => {
            if (Array.isArray(cloudMembers) && cloudMembers.length > 0) {
              const mapped = cloudMembers.map((m: any) => ({
                id: String(m.id),
                name: m.displayName || m.name || 'Участник',
                email: m.email,
                avatarChar: m.avatarChar || (m.displayName || 'У')[0].toUpperCase(),
                avatarBg: m.avatarBg || '#E0E7FF',
                avatarColor: m.avatarColor || '#3730A3',
                familyId: data.familyId,
                familyName: '',
              }));
              setFamilies((prev) =>
                prev.map((f) =>
                  f.id.toLowerCase() === data.familyId?.toLowerCase() ? { ...f, members: mapped } : f
                )
              );
            }
          })
          .catch(() => {});
      });

      // 9. Подписка на обновление имени участника (Bug 7)
      const unsubMemberUpdated = SignalRService.onMemberUpdated((data) => {
        if (!data?.userId) return;
        const uId = data.userId.toLowerCase();
        const firstChar = (data.displayName || 'У')[0].toUpperCase();
        setFamilies((prev) =>
          prev.map((f) => {
            if (f.id.toLowerCase() !== data.familyId?.toLowerCase()) return f;
            return {
              ...f,
              members: f.members.map((m) =>
                m.id.toLowerCase() === uId ? { ...m, name: data.displayName, avatarChar: firstChar } : m
              ),
            };
          })
        );
        if (uId === currentUserIdRef.current?.toLowerCase()) {
          setCurrentUser((u) => ({ ...u, name: data.displayName, avatarChar: firstChar }));
        }
      });

      // 10. Подписка на создание корзины мероприятия (Bug 3)
      const unsubEventCartCreated = SignalRService.onEventCartCreated((data) => {
        setEvents((prev) =>
          prev.map((e) => (e.id.toLowerCase() === data.eventId?.toLowerCase() ? { ...e, hasCart: true } : e))
        );
      });

      // 11. Подписка на создание, удаление и завершение мероприятий (Bug 4)
      const unsubEventCreated = SignalRService.onEventCreated(async (data) => {
        if (data.familyId?.toLowerCase() === activeFamilyIdRef.current?.toLowerCase()) {
          await refreshEvents(activeFamilyIdRef.current);
        }
      });

      const unsubEventDeleted = SignalRService.onEventDeleted((data) => {
        setEvents((prev) => prev.filter((e) => e.id.toLowerCase() !== data.eventId?.toLowerCase()));
      });

      const unsubEventCompleted = SignalRService.onEventCompleted((data) => {
        setEvents((prev) =>
          prev.map((e) => (e.id.toLowerCase() === data.eventId?.toLowerCase() ? { ...e, isCompleted: true, completedAt: data.completedAt } : e))
        );
      });

      // 12. Подписка на создание и удаление пользовательских товаров (Bug 9)
      const unsubCustomProductCreated = SignalRService.onCustomProductCreated((data) => {
        if (!data?.productId) return;
        const newProduct: CatalogProduct = {
          id: String(data.productId),
          title: data.title || data.product?.title || 'Свой товар',
          unit: data.product?.unit || '1 шт',
          emoji: data.product?.emoji || '🛍️',
          imageKey: data.product?.imageKey || '',
        };
        setFamilies((prev) =>
          prev.map((f) => {
            if (f.id.toLowerCase() !== data.familyId?.toLowerCase()) return f;
            if (f.customProducts?.some((p) => p.id === newProduct.id)) return f;
            return {
              ...f,
              customProducts: [...(f.customProducts || []), newProduct],
            };
          })
        );
      });

    const unsubCustomProductDeleted = SignalRService.onCustomProductDeleted((data) => {
      if (!data?.productId) return;
      setFamilies((prev) =>
        prev.map((f) => {
          if (f.id.toLowerCase() !== data.familyId?.toLowerCase()) return f;
          return {
            ...f,
            customProducts: (f.customProducts || []).filter((p) => p.id !== data.productId),
          };
        })
      );
    });

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

      // 2. Загрузка мероприятий из облака (Bug 3)
      await refreshEvents(activeFamilyId);

      // 3. Загрузка пользовательских товаров для активной группы (Bug 9)
      try {
        const prods = await ProductsService.getProducts(activeFamilyId);
        const customs = prods.filter((p: any) => p.familyId != null || p.isCustom || (p.category && p.category.includes('Свои')));
        const mappedCustoms: CatalogProduct[] = customs.map((cp: any) => ({
          id: String(cp.id),
          title: cp.title,
          unit: cp.unit || '1 шт',
          emoji: cp.emoji || '🛍️',
          imageKey: cp.imageKey || '',
        }));
        setFamilies((prev) =>
          prev.map((f) =>
            f.id.toLowerCase() === activeFamilyId.toLowerCase()
              ? { ...f, customProducts: mappedCustoms }
              : f
          )
        );
        setKnownFamilies((prev) => {
          const matchedKey = Object.keys(prev).find((k) => k.toLowerCase() === activeFamilyId.toLowerCase());
          if (!matchedKey) return prev;
          return {
            ...prev,
            [matchedKey]: {
              ...prev[matchedKey],
              customProducts: mappedCustoms,
            },
          };
        });
      } catch (e) {
        console.warn('Failed to load custom products in setupSignalR:', e);
      }
    };

    setupSignalR();

    return () => {
      unsubStatus();
      unsubCart();
      unsubFamily();
      unsubMemberJoined();
      unsubMemberRemoved();
      unsubEventCreated();
      unsubEventDeleted();
      unsubEventCompleted();
      unsubMemberUpdated();
      unsubEventCartCreated();
      unsubCustomProductCreated();
      unsubCustomProductDeleted();
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
      const userKey = `@product_basket_last_active_family_${cleanEmail}`;
      const savedActiveId = (await Storage.getItem(userKey)) || (await Storage.getItem('@product_basket_last_active_family'));
      if (savedActiveId && userFamilies.some((f) => f.id.toLowerCase() === savedActiveId.toLowerCase())) {
        activeFam = userFamilies.find((f) => f.id.toLowerCase() === savedActiveId.toLowerCase()) || activeFam;
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
      Storage.setItem('@product_basket_last_active_family', activeFam.id).catch(() => {});
      Storage.setItem(`@product_basket_last_active_family_${cleanEmail}`, activeFam.id).catch(() => {});
      setActiveCartId(activeFam.id);
      setCarts((prev) => ({
        ...prev,
        [activeFam.id]: prev[activeFam.id] || {},
      }));
      refreshEvents(activeFam.id).catch(() => {});
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

  const updateUserName = async (name: string): Promise<void> => {
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
          m.id.toLowerCase() === currentUser.id.toLowerCase() ? { ...m, name: trimmed, avatarChar: firstChar } : m
        ),
      }))
    );

    setKnownFamilies((prev) => {
      const copy = { ...prev };
      for (const k of Object.keys(copy)) {
        copy[k] = {
          ...copy[k],
          members: copy[k].members.map((m) =>
            m.id.toLowerCase() === currentUser.id.toLowerCase() ? { ...m, name: trimmed, avatarChar: firstChar } : m
          ),
        };
      }
      return copy;
    });

    try {
      await AuthService.updateProfile(trimmed);
    } catch (e: any) {
      console.warn('Cloud updateProfile failed:', e);
      Alert.alert('Ошибка', e.message || 'Не удалось сохранить имя на сервере');
    }
  };

  // Переключение между семьями пользователя
  const switchFamily = (familyId: string) => {
    const target = families.find((f) => f.id.toLowerCase() === familyId.toLowerCase());
    if (!target) return;

    setActiveFamilyId(target.id);
    setCurrentUser((prev) => ({
      ...prev,
      familyId: target.id,
      familyName: target.name,
    }));

    // Если сейчас открыта корзина семьи (не мероприятие), переключаем на корзину этой семьи
    const activeEvt = events.find((e) => e.id.toLowerCase() === activeCartId.toLowerCase());
    if (!activeEvt) {
      setActiveCartId(target.id);
      setCarts((prev) => ({
        ...prev,
        [target.id]: prev[target.id] || {},
      }));
    }

    Storage.setItem('@product_basket_last_active_family', target.id).catch(() => {});
    if (currentUser.email) {
      const userKey = `@product_basket_last_active_family_${currentUser.email.trim().toLowerCase()}`;
      Storage.setItem(userKey, target.id).catch(() => {});
    }
    refreshEvents(target.id).catch(() => {});
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

    Storage.setItem('@product_basket_last_active_family', familyId).catch(() => {});
    if (currentUser.email) {
      const userKey = `@product_basket_last_active_family_${currentUser.email.trim().toLowerCase()}`;
      Storage.setItem(userKey, familyId).catch(() => {});
    }
    SignalRService.joinFamily(familyId).catch((e) => console.warn('SignalR joinFamily failed:', e));
    refreshEvents(familyId).catch(() => {});

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

      Storage.setItem('@product_basket_last_active_family', foundEntry.id).catch(() => {});
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

        Storage.setItem('@product_basket_last_active_family', serverFam.familyId).catch(() => {});
        if (currentUser.email) {
          const userKey = `@product_basket_last_active_family_${currentUser.email.trim().toLowerCase()}`;
          Storage.setItem(userKey, serverFam.familyId).catch(() => {});
        }
        SignalRService.joinFamily(serverFam.familyId).catch((e) => console.warn('SignalR joinFamily failed:', e));
        refreshEvents(serverFam.familyId).catch(() => {});

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
      prev.map((f) => (f.id.toLowerCase() === family.id.toLowerCase() ? { ...f, name: trimmed } : f))
    );
    setKnownFamilies((prev) => {
      const matchedKey = Object.keys(prev).find((k) => k.toLowerCase() === family.id.toLowerCase());
      return matchedKey ? { ...prev, [matchedKey]: { ...prev[matchedKey], name: trimmed } } : prev;
    });
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
    const leaverId = currentUser.id.toLowerCase();
    const targetFamilyId = family.id.toLowerCase();

    // Удаляем товары уходящего человека из корзины этой семьи
    setCarts((prevCarts) => {
      const familyCartKey = Object.keys(prevCarts).find((k) => k.toLowerCase() === targetFamilyId) || targetFamilyId;
      const familyCart = prevCarts[familyCartKey] || {};
      const filteredCart: Record<string, CartItem> = {};
      for (const [itemId, item] of Object.entries(familyCart)) {
        if (item.assignedToUserId?.toLowerCase() !== leaverId) {
          filteredCart[itemId] = item;
        }
      }
      return {
        ...prevCarts,
        [familyCartKey]: filteredCart,
      };
    });

    setKnownFamilies((prev) => {
      const matchedKey = Object.keys(prev).find((k) => k.toLowerCase() === targetFamilyId);
      if (!matchedKey) return prev;
      return {
        ...prev,
        [matchedKey]: {
          ...prev[matchedKey],
          members: prev[matchedKey].members.filter((m) => m.id.toLowerCase() !== leaverId),
        },
      };
    });

    const remainingFamilies = families.filter((f) => f.id.toLowerCase() !== targetFamilyId);
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
      Storage.setItem('@product_basket_last_active_family', nextFamily.id).catch(() => {});
      if (currentUser.email) {
        Storage.setItem(`@product_basket_last_active_family_${currentUser.email.trim().toLowerCase()}`, nextFamily.id).catch(() => {});
      }
      SignalRService.joinFamily(nextFamily.id).catch(() => {});
      refreshEvents(nextFamily.id).catch(() => {});
    } else {
      setActiveFamilyId(null);
      setCurrentUser((prev) => ({
        ...prev,
        familyId: null,
        familyName: null,
      }));
      setActiveCartId('main');
      setEvents([]);
      Storage.removeItem('@product_basket_last_active_family').catch(() => {});
      if (currentUser.email) {
        Storage.removeItem(`@product_basket_last_active_family_${currentUser.email.trim().toLowerCase()}`).catch(() => {});
      }
    }

    FamilyService.leaveFamily(targetFamilyId).catch((e) => console.warn('Backend leaveFamily failed:', e));
  };

  const removeMemberFromFamily = (memberId: string) => {
    if (!family) return;
    const targetFamilyId = family.id.toLowerCase();
    const cleanMemberId = memberId.toLowerCase();

    // Удаляем товары этого человека из корзины семьи
    setCarts((prevCarts) => {
      const matchedKey = Object.keys(prevCarts).find((k) => k.toLowerCase() === targetFamilyId) || targetFamilyId;
      const familyCart = prevCarts[matchedKey] || {};
      const filteredCart: Record<string, CartItem> = {};
      for (const [itemId, item] of Object.entries(familyCart)) {
        if (item.assignedToUserId?.toLowerCase() !== cleanMemberId) {
          filteredCart[itemId] = item;
        }
      }
      return {
        ...prevCarts,
        [matchedKey]: filteredCart,
      };
    });

    setKnownFamilies((prev) => {
      const matchedKey = Object.keys(prev).find((k) => k.toLowerCase() === targetFamilyId);
      if (!matchedKey || !prev[matchedKey]) return prev;
      return {
        ...prev,
        [matchedKey]: {
          ...prev[matchedKey],
          members: prev[matchedKey].members.filter((m) => m.id.toLowerCase() !== cleanMemberId),
        },
      };
    });

    setFamilies((prev) =>
      prev.map((f) => {
        if (f.id.toLowerCase() !== targetFamilyId) return f;
        return {
          ...f,
          members: f.members.filter((m) => m.id.toLowerCase() !== cleanMemberId),
        };
      })
    );

    if (currentUser.id.toLowerCase() === cleanMemberId) {
      leaveFamily();
    } else {
      FamilyService.removeMember(memberId, family.id).catch((e) =>
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
        f.id.toLowerCase() === familyId.toLowerCase()
          ? {
              ...f,
              customProducts: [...(f.customProducts || []), newProduct],
            }
          : f
      )
    );

    setKnownFamilies((prev) => {
      const matchedKey = Object.keys(prev).find((k) => k.toLowerCase() === familyId.toLowerCase());
      if (!matchedKey) return prev;
      return {
        ...prev,
        [matchedKey]: {
          ...prev[matchedKey],
          customProducts: [...(prev[matchedKey].customProducts || []), newProduct],
        },
      };
    });

    try {
      const created = await ProductsService.createCustomProduct({
        title: trimmedTitle,
        unit: product.unit.trim() || '1 шт',
        category: 'Свои товары',
        emoji: product.emoji || '🛍️',
        familyId: familyId,
      });
      if (created?.id) {
        const realId = String(created.id);
        setFamilies((prev) =>
          prev.map((f) =>
            f.id.toLowerCase() === familyId.toLowerCase()
              ? {
                  ...f,
                  customProducts: (f.customProducts || []).map((cp) =>
                    cp.id === tempId ? { ...cp, id: realId } : cp
                  ),
                }
              : f
          )
        );
        setKnownFamilies((prev) => {
          const matchedKey = Object.keys(prev).find((k) => k.toLowerCase() === familyId.toLowerCase());
          if (!matchedKey) return prev;
          return {
            ...prev,
            [matchedKey]: {
              ...prev[matchedKey],
              customProducts: (prev[matchedKey].customProducts || []).map((cp) =>
                cp.id === tempId ? { ...cp, id: realId } : cp
              ),
            },
          };
        });
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
        f.id.toLowerCase() === familyId.toLowerCase()
          ? {
              ...f,
              customProducts: (f.customProducts || []).filter((p) => p.id.toLowerCase() !== productId.toLowerCase()),
            }
          : f
      )
    );

    setKnownFamilies((prev) => {
      const matchedKey = Object.keys(prev).find((k) => k.toLowerCase() === familyId.toLowerCase());
      if (!matchedKey) return prev;
      return {
        ...prev,
        [matchedKey]: {
          ...prev[matchedKey],
          customProducts: (prev[matchedKey].customProducts || []).filter((p) => p.id.toLowerCase() !== productId.toLowerCase()),
        },
      };
    });

    // Также удаляем из корзины этой семьи, если он там был
    setCarts((prev) => {
      const matchedCartKey = Object.keys(prev).find((k) => k.toLowerCase() === familyId.toLowerCase());
      if (!matchedCartKey) return prev;
      const familyCart = prev[matchedCartKey] || {};
      const updated = { ...familyCart };
      let changed = false;
      for (const k of Object.keys(updated)) {
        if (k.toLowerCase() === productId.toLowerCase() || updated[k].id.toLowerCase() === productId.toLowerCase()) {
          delete updated[k];
          changed = true;
        }
      }
      if (!changed) return prev;
      return {
        ...prev,
        [matchedCartKey]: updated,
      };
    });
  };

  // Получить корзину конкретной семьи
  const getFamilyCart = (familyId: string): Record<string, CartItem> => {
    const norm = familyId.toLowerCase();
    const key = Object.keys(carts).find((k) => k.toLowerCase() === norm) || familyId;
    return carts[key] || {};
  };

  // Управление активной корзиной
  const openMainCart = () => {
    const targetCartKey = activeFamilyId || 'main';
    setActiveCartId(targetCartKey);
  };

  const openEventCart = (eventId: string) => {
    const normEventId = eventId.toLowerCase();
    setActiveCartId(normEventId);
    setCarts((prev) => ({
      ...prev,
      [normEventId]: prev[normEventId] || prev[eventId] || {},
    }));

    const targetEvt = events.find((e) => e.id.toLowerCase() === normEventId);
    const targetFamId = targetEvt?.familyId || activeFamilyId;
    if (targetFamId) {
      CartService.getCart(targetFamId, normEventId)
        .then((freshItems) => {
          if (Array.isArray(freshItems)) {
            const mapped: Record<string, CartItem> = {};
            freshItems.forEach((c) => {
              const lowerId = c.id.toLowerCase();
              mapped[lowerId] = {
                id: lowerId,
                title: c.title,
                unit: c.unit,
                imageKey: c.imageKey || '',
                emoji: c.emoji || '📦',
                count: c.count,
                assignedToUserId: c.assignedToUserId ? c.assignedToUserId.toLowerCase() : (c.takenByUserId ? c.takenByUserId.toLowerCase() : null),
                isBought: c.isBought,
              };
            });
            setCarts((prev) => ({
              ...prev,
              [normEventId]: mapped,
            }));
          }
        })
        .catch(() => {});
    }
  };

  const activeEvent = events.find((e) => e.id.toLowerCase() === activeCartId.toLowerCase());
  const isEventCart = !!activeEvent;
  const activeCartTitle = activeEvent
    ? `${activeEvent.title} ${activeEvent.emoji}`.trim()
    : 'Корзина';

  const effectiveCartId = (isEventCart ? activeCartId : (activeFamilyId || activeCartId || 'main')).toLowerCase();
  const matchedCartKey = Object.keys(carts).find((k) => k.toLowerCase() === effectiveCartId) || effectiveCartId;
  const cartItems = carts[matchedCartKey] || {};

  const addToCart = (item: Omit<CartItem, 'count' | 'assignedToUserId'>) => {
    if (isEventCart && activeEvent?.isCompleted) {
      Alert.alert('Мероприятие завершено', 'Нельзя изменять корзину завершенного мероприятия.');
      return;
    }
    if (!family && !isEventCart) {
      Alert.alert('Группа не выбрана', 'Сначала вступите или создайте группу');
      return;
    }

    const currentKey = effectiveCartId;
    const cleanTitle = item.title.trim().toLowerCase();
    const uId = currentUser.id?.toLowerCase();

    setCarts((prev) => {
      const cartKey = Object.keys(prev).find((k) => k.toLowerCase() === currentKey) || currentKey;
      const currentCart = { ...(prev[cartKey] || {}) };

      // Ищем существующий НЕКУПЛЕННЫЙ товар, который не занят другим участником
      const existingKey = Object.keys(currentCart).find((k) => {
        const c = currentCart[k];
        const cAssigned = c.assignedToUserId?.toLowerCase();
        return (
          !c.isBought &&
          (!cAssigned || cAssigned === uId) &&
          (k.toLowerCase() === item.id.toLowerCase() ||
            c.id.toLowerCase() === item.id.toLowerCase() ||
            c.title.trim().toLowerCase() === cleanTitle)
        );
      });

      if (existingKey) {
        const existing = currentCart[existingKey];
        currentCart[existingKey] = { ...existing, count: existing.count + 1 };
      } else {
        // Создаем отдельный новый некупленный товар (Bug 14)
        const uniqueKey = currentCart[item.id] ? `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : item.id;
        currentCart[uniqueKey] = {
          ...item,
          id: uniqueKey,
          count: 1,
          assignedToUserId: null,
          isBought: false,
        };
      }

      return {
        ...prev,
        [cartKey]: currentCart,
      };
    });

    const targetFamId = (isEventCart && activeEvent?.familyId) ? activeEvent.familyId : activeFamilyId;
    if (targetFamId) {
      const prodId = (item as any).productId ||
        (!item.id.startsWith('cart-') && !item.id.startsWith('custom-') && item.id.includes('-') && item.id.length === 36
          ? item.id
          : undefined);

      CartService.addItem({
        productId: prodId,
        title: item.title,
        unit: item.unit,
        imageKey: item.imageKey,
        emoji: item.emoji,
        count: 1,
        familyId: targetFamId,
        eventId: isEventCart ? activeCartId : undefined,
      })
        .then((createdItem) => {
          if (createdItem?.id) {
            const lowerCreatedId = createdItem.id.toLowerCase();
            setCarts((prev) => {
              const cartKey = Object.keys(prev).find((k) => k.toLowerCase() === currentKey) || currentKey;
              const currentCart = { ...(prev[cartKey] || {}) };
              const tempKey = Object.keys(currentCart).find((k) => {
                const it = currentCart[k];
                return !it.isBought && it.title.trim().toLowerCase() === cleanTitle && k !== lowerCreatedId;
              });
              if (tempKey && tempKey !== lowerCreatedId) {
                const itemData = currentCart[tempKey];
                delete currentCart[tempKey];
                currentCart[lowerCreatedId] = {
                  ...itemData,
                  id: lowerCreatedId,
                  count: Math.max(createdItem.count || 1, itemData.count),
                };
                return { ...prev, [cartKey]: currentCart };
              }
              return prev;
            });
          }
        })
        .catch((e) => console.warn('Cloud sync addItem failed:', e));
    }
  };

  const decrementCartItem = (itemId: string) => {
    if (isEventCart && activeEvent?.isCompleted) {
      return;
    }
    if (!family && !isEventCart) {
      return;
    }

    const currentKey = effectiveCartId;
    let serverTargetId = itemId;

    setCarts((prev) => {
      const cartKey = Object.keys(prev).find((k) => k.toLowerCase() === currentKey) || currentKey;
      const currentCart = { ...(prev[cartKey] || {}) };

      // Ищем сначала НЕКУПЛЕННЫЙ товар (по id, ключу или названию)
      let realKey = Object.keys(currentCart).find((k) => {
        const c = currentCart[k];
        return (
          !c.isBought &&
          (k.toLowerCase() === itemId.toLowerCase() ||
            c.id.toLowerCase() === itemId.toLowerCase() ||
            c.title.trim().toLowerCase() === itemId.trim().toLowerCase())
        );
      });

      // Fallback ТОЛЬКО по точному GUID/ключу конкретной записи (не по названию, чтобы не списать купленный товар!)
      if (!realKey) {
        realKey = Object.keys(currentCart).find((k) => {
          const c = currentCart[k];
          return (
            k.toLowerCase() === itemId.toLowerCase() ||
            c.id.toLowerCase() === itemId.toLowerCase()
          );
        });
      }

      if (!realKey) return prev;

      const existing = currentCart[realKey];
      serverTargetId = existing.id;

      if (existing.count <= 1) {
        delete currentCart[realKey];
      } else {
        currentCart[realKey] = { ...existing, count: existing.count - 1 };
      }

      return {
        ...prev,
        [cartKey]: currentCart,
      };
    });

    CartService.decrementItem(serverTargetId).catch((e) => console.warn('Cloud sync decrement failed:', e));
  };

  const deleteFromCart = (itemId: string) => {
    if (isEventCart && activeEvent?.isCompleted) {
      return;
    }
    if (!family && !isEventCart) {
      return;
    }

    const currentKey = effectiveCartId;
    let serverTargetId = itemId;

    setCarts((prev) => {
      const cartKey = Object.keys(prev).find((k) => k.toLowerCase() === currentKey) || currentKey;
      const currentCart = { ...(prev[cartKey] || {}) };

      // Ищем сначала НЕКУПЛЕННЫЙ товар
      let realKey = Object.keys(currentCart).find((k) => {
        const c = currentCart[k];
        return (
          !c.isBought &&
          (k.toLowerCase() === itemId.toLowerCase() ||
            c.id.toLowerCase() === itemId.toLowerCase() ||
            c.title.trim().toLowerCase() === itemId.trim().toLowerCase())
        );
      });

      // Fallback ТОЛЬКО по точному GUID/ключу записи, ни в коем случае не по названию
      if (!realKey) {
        realKey = Object.keys(currentCart).find((k) => {
          const c = currentCart[k];
          return (
            k.toLowerCase() === itemId.toLowerCase() ||
            c.id.toLowerCase() === itemId.toLowerCase()
          );
        });
      }

      if (!realKey) return prev;

      serverTargetId = currentCart[realKey].id;
      delete currentCart[realKey];

      return {
        ...prev,
        [cartKey]: currentCart,
      };
    });

    CartService.deleteItem(serverTargetId).catch((e) => console.warn('Cloud sync delete failed:', e));
  };

  // Распределение товара: взять себе или снять выбор
  const assignCartItem = (itemId: string): { success: boolean; message?: string } => {
    if (isEventCart && activeEvent?.isCompleted) {
      return { success: false, message: 'Мероприятие завершено. Корзина доступна только для чтения.' };
    }
    if (!family && !isEventCart) {
      return { success: false, message: 'Сначала вступите или создайте группу' };
    }

    const matchedKey = Object.keys(carts).find((k) => k.toLowerCase() === effectiveCartId) || effectiveCartId;
    const currentCart = carts[matchedKey] || {};
    const itemKey = Object.keys(currentCart).find((k) => k.toLowerCase() === itemId.toLowerCase() || currentCart[k].id.toLowerCase() === itemId.toLowerCase());
    const item = itemKey ? currentCart[itemKey] : undefined;
    if (!item) return { success: false, message: 'Товар не найден' };

    const uId = currentUser.id.toLowerCase();
    const assignedId = item.assignedToUserId?.toLowerCase() || null;

    if (assignedId === null) {
      // Свободный товар -> берем себе
      setCarts((prev) => ({
        ...prev,
        [matchedKey]: {
          ...prev[matchedKey],
          [itemKey!]: { ...currentCart[itemKey!], assignedToUserId: currentUser.id },
        },
      }));
      CartService.assignProduct(item.id).catch((e) => console.warn('Cloud assignProduct failed:', e));
      return { success: true };
    }

    if (assignedId === uId) {
      // Мы сами взяли -> снимаем свой выбор (и сбрасываем статус "Куплено")
      setCarts((prev) => ({
        ...prev,
        [matchedKey]: {
          ...prev[matchedKey],
          [itemKey!]: { ...currentCart[itemKey!], assignedToUserId: null, isBought: false },
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
    const otherUser = allKnownUsers.find((m) => m.id.toLowerCase() === assignedId);
    const otherName = otherUser ? otherUser.name : 'другой участник';
    return {
      success: false,
      message: `Этот товар уже выбрал(а) ${otherName}. Вы не можете его изменить.`,
    };
  };

  // Отметка статуса "Куплено" (только участник, который выбрал товар, может отметить его купленным)
  const toggleItemPurchased = (itemId: string): { success: boolean; message?: string } => {
    if (isEventCart && activeEvent?.isCompleted) {
      return { success: false, message: 'Мероприятие завершено. Корзина доступна только для чтения.' };
    }
    if (!family && !isEventCart) {
      return { success: false, message: 'Сначала вступите или создайте группу' };
    }

    const matchedKey = Object.keys(carts).find((k) => k.toLowerCase() === effectiveCartId) || effectiveCartId;
    const currentCart = carts[matchedKey] || {};
    const itemKey = Object.keys(currentCart).find((k) => k.toLowerCase() === itemId.toLowerCase() || currentCart[k].id.toLowerCase() === itemId.toLowerCase());
    const item = itemKey ? currentCart[itemKey] : undefined;
    if (!item) return { success: false, message: 'Товар не найден' };

    const uId = currentUser.id.toLowerCase();
    const assignedId = item.assignedToUserId?.toLowerCase() || null;

    if (assignedId === null) {
      return {
        success: false,
        message: 'Сначала выберите товар («Куплю я»), чтобы затем отметить его статусом «Куплено».',
      };
    }

    if (assignedId !== uId) {
      const allKnownUsers = [
        ...(family?.members || []),
        ...Object.values(registeredUsers),
      ];
      const otherUser = allKnownUsers.find((m) => m.id.toLowerCase() === assignedId);
      const otherName = otherUser ? otherUser.name : 'другой участник';
      return {
        success: false,
        message: `Товар «${item.title}» выбрал(а) ${otherName}. Только ${otherName} может отметить его купленным.`,
      };
    }

    setCarts((prev) => {
      const activeCart = prev[matchedKey] || {};
      const it = activeCart[itemKey!];
      if (!it) return prev;
      return {
        ...prev,
        [matchedKey]: {
          ...activeCart,
          [itemKey!]: {
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

  const createEvent = async (data: { title: string; date: string; emoji: string; familyId?: string; hasCart?: boolean }) => {
    const targetFamilyId = data.familyId || activeFamilyId || (families.length > 0 ? families[0].id : undefined);
    const tempId = `evt-${Date.now()}`;
    const willHaveCart = data.hasCart ?? true;
    const newEvt: AppEvent = {
      id: tempId,
      title: data.title,
      date: data.date,
      emoji: data.emoji,
      badgeBg: '#FFF0F4',
      hasCart: willHaveCart,
      isCompleted: false,
      familyId: targetFamilyId,
    };
    setEvents((prev) => [newEvt, ...prev]);
    if (willHaveCart) {
      setCarts((prev) => ({
        ...prev,
        [tempId]: {},
      }));
    }

    if (targetFamilyId) {
      try {
        const cloudEvt = await EventsService.createEvent({
          title: data.title,
          eventDate: data.date,
          icon: data.emoji,
          familyId: targetFamilyId,
          hasCart: willHaveCart,
        });
        if (cloudEvt?.id) {
          const realId = String(cloudEvt.id);
          setEvents((prev) =>
            prev.map((e) => (e.id === tempId ? { ...e, id: realId, hasCart: cloudEvt.hasCart ?? willHaveCart } : e))
          );
          if (willHaveCart) {
            setCarts((prev) => {
              const copy = { ...prev };
              copy[realId] = copy[tempId] || {};
              delete copy[tempId];
              return copy;
            });
            if (!cloudEvt.hasCart) {
              EventsService.createEventCart(realId).catch(() => {});
            }
          }
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
    const norm = id.toLowerCase();
    setEvents((prev) =>
      prev.map((e) => (e.id.toLowerCase() === norm ? { ...e, hasCart: true } : e))
    );
    setCarts((prev) => ({
      ...prev,
      [norm]: prev[norm] || prev[id] || {},
    }));
    EventsService.createEventCart(id).catch((e) => console.warn('Backend createEventCart failed:', e));
  };

  const getEventCartStats = (
    eventId: string
  ): { total: number; assigned: number; bought: number } => {
    const norm = eventId.toLowerCase();
    const eventCartKey = Object.keys(carts).find((k) => k.toLowerCase() === norm) || eventId;
    const eventCart = carts[eventCartKey] || {};
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
        refreshEvents,
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
