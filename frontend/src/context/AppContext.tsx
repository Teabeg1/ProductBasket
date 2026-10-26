import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DEV_USERS, DEMO_STAGE, type DevUser } from '../config/devConfig';
import { getThemeColors, type AppTheme } from '../constants/theme';
import { TRANSLATIONS, type Language } from '../constants/i18n';
import { FamilyService, type AuthResponse } from '../services/api';

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

// Данные для Этапа 2 (демо богатого прототипа)
// Группа 1: Родная группа (родители)
const STAGE2_FAMILY_HOME: FamilyState = {
  id: 'fam-home',
  name: 'Группа Смирновых',
  code: '7A9K2M',
  members: [
    { ...DEV_USERS.ivan, familyId: 'fam-home', familyName: 'Группа Смирновых' },
    { ...DEV_USERS.elena, familyId: 'fam-home', familyName: 'Группа Смирновых' },
    { ...DEV_USERS.denis, familyId: 'fam-home', familyName: 'Группа Смирновых' },
  ],
  customProducts: [
    {
      id: 'custom-home-pelmeni',
      title: 'Домашние пельмени',
      unit: '800 г • Заморозка',
      imageKey: '',
      emoji: '🥟',
    },
  ],
};

// Группа 2: Соседи по комнате в общежитии (студенты)
// Иван учится в ВУЗе в другом городе и делит комнату с Артемом и Данилом
const STAGE2_FAMILY_DORM: FamilyState = {
  id: 'fam-dorm',
  name: 'Общежитие: комната 304',
  code: '3D8R9P',
  members: [
    { ...DEV_USERS.ivan, familyId: 'fam-dorm', familyName: 'Общежитие: комната 304' },
    { ...DEV_USERS.artem, familyId: 'fam-dorm', familyName: 'Общежитие: комната 304' },
    { ...DEV_USERS.danil, familyId: 'fam-dorm', familyName: 'Общежитие: комната 304' },
  ],
  customProducts: [
    {
      id: 'custom-dorm-noodles',
      title: 'Лапша Доширак',
      unit: '90 г • Острая',
      imageKey: '',
      emoji: '🍜',
    },
  ],
};

const STAGE2_INITIAL_FAMILIES: FamilyState[] = [STAGE2_FAMILY_HOME, STAGE2_FAMILY_DORM];

const STAGE2_INITIAL_CARTS: Record<string, Record<string, CartItem>> = {
  // Корзина группы Смирновых
  'fam-home': {
    'prod-milk': {
      id: 'prod-milk',
      title: 'Молоко',
      unit: '930 мл • 3.2%',
      imageKey: 'milk',
      emoji: '🥛',
      count: 2,
      assignedToUserId: 'user-ivan',
      isBought: true,
    },
    'prod-apple': {
      id: 'prod-apple',
      title: 'Яблоки',
      unit: '1 кг • Сезонные',
      imageKey: 'apple',
      emoji: '🍎',
      count: 1,
      assignedToUserId: 'user-elena',
      isBought: false,
    },
    'prod-cheese': {
      id: 'prod-cheese',
      title: 'Сыр',
      unit: '200 г • Тильзитер',
      imageKey: 'cheese',
      emoji: '🧀',
      count: 1,
      assignedToUserId: null,
      isBought: false,
    },
    'prod-pasta': {
      id: 'prod-pasta',
      title: 'Макароны',
      unit: '450 г • Перья',
      imageKey: 'pasta',
      emoji: '🍝',
      count: 2,
      assignedToUserId: null,
      isBought: false,
    },
    'custom-home-pelmeni': {
      id: 'custom-home-pelmeni',
      title: 'Домашние пельмени',
      unit: '800 г • Заморозка',
      imageKey: '',
      emoji: '🥟',
      count: 1,
      assignedToUserId: 'user-ivan',
      isBought: false,
    },
  },
  // Корзина соседей по общежитию
  'fam-dorm': {
    'prod-sugar': {
      id: 'prod-sugar',
      title: 'Сахар',
      unit: '1 кг • Кристаллический',
      imageKey: 'sugar',
      emoji: '🍚',
      count: 1,
      assignedToUserId: 'user-artem',
      isBought: false,
    },
    'custom-dorm-noodles': {
      id: 'custom-dorm-noodles',
      title: 'Лапша Доширак',
      unit: '90 г • Острая',
      imageKey: '',
      emoji: '🍜',
      count: 4,
      assignedToUserId: 'user-ivan',
      isBought: true,
    },
    'prod-salt': {
      id: 'prod-salt',
      title: 'Соль',
      unit: '1 кг • Каменная мелкая',
      imageKey: 'salt',
      emoji: '🧂',
      count: 1,
      assignedToUserId: null,
      isBought: false,
    },
    'prod-cheese': {
      id: 'prod-cheese',
      title: 'Сыр',
      unit: '200 г • Тильзитер',
      imageKey: 'cheese',
      emoji: '🧀',
      count: 1,
      assignedToUserId: 'user-danil',
      isBought: false,
    },
  },
  // Корзины мероприятий
  'evt-picnic': {
    'prod-cucumbers': {
      id: 'prod-cucumbers',
      title: 'Огурцы',
      unit: '600 г • Гладкие',
      imageKey: 'cucumbers',
      emoji: '🥒',
      count: 3,
      assignedToUserId: 'user-ivan',
      isBought: true,
    },
    'prod-cheese': {
      id: 'prod-cheese',
      title: 'Сыр',
      unit: '200 г • Тильзитер',
      imageKey: 'cheese',
      emoji: '🧀',
      count: 2,
      assignedToUserId: null,
      isBought: false,
    },
  },
  'evt-hackathon': {
    'prod-apple': {
      id: 'prod-apple',
      title: 'Яблоки',
      unit: '1 кг • Сезонные',
      imageKey: 'apple',
      emoji: '🍎',
      count: 2,
      assignedToUserId: 'user-ivan',
      isBought: true,
    },
  },
};

const STAGE2_INITIAL_EVENTS: AppEvent[] = [
  {
    id: 'evt-picnic',
    title: 'Пикник на природе',
    date: '18 мая',
    emoji: '🏕️',
    badgeBg: '#FFF0F4',
    hasCart: true,
    isCompleted: false,
    familyId: 'fam-home',
  },
  {
    id: 'evt-bday',
    title: 'День рождения Дениса',
    date: '25 мая',
    emoji: '🎂',
    badgeBg: '#FFF0F4',
    hasCart: false,
    isCompleted: false,
    familyId: 'fam-home',
  },
  {
    id: 'evt-hackathon',
    title: 'Студенческий хакатон',
    date: '10 мая',
    emoji: '💻',
    badgeBg: '#F0FDF4',
    hasCart: true,
    isCompleted: true,
    completedAt: '10 мая',
    familyId: 'fam-dorm',
  },
];

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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Theme & Font Scale & Language
  const [theme, setTheme] = useState<AppTheme>('light');
  const language: Language = 'ru';
  const [fontScale, setFontScale] = useState<FontScaleLevel>('medium');
  const fontScaleMultiplier = FONT_SCALE_MULTIPLIERS[fontScale];

  // Список всех известных семей (реестр)
  const [knownFamilies, setKnownFamilies] = useState<Record<string, FamilyState>>(() => {
    const initial: Record<string, FamilyState> = {};
    if (DEMO_STAGE === 2) {
      initial['fam-home'] = STAGE2_FAMILY_HOME;
      initial['fam-dorm'] = STAGE2_FAMILY_DORM;
    }
    return initial;
  });

  // Семьи, в которых состоит текущий пользователь
  const [families, setFamilies] = useState<FamilyState[]>(() => {
    return DEMO_STAGE === 2 ? STAGE2_INITIAL_FAMILIES : [];
  });

  // Идентификатор активной семьи
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(() => {
    return DEMO_STAGE === 2 ? STAGE2_FAMILY_HOME.id : null;
  });

  // Текущая активная семья
  const family = families.find((f) => f.id === activeFamilyId) || null;

  // Активный пользователь
  const [currentUser, setCurrentUser] = useState<DevUser>(() => {
    if (DEMO_STAGE === 2) {
      return {
        ...DEV_USERS.ivan,
        familyId: STAGE2_FAMILY_HOME.id,
        familyName: STAGE2_FAMILY_HOME.name,
      };
    }
    return {
      ...DEV_USERS.ivan,
      familyId: null,
      familyName: null,
    };
  });

  // Хранилище корзин: ключом выступает familyId или eventId
  const [carts, setCarts] = useState<Record<string, Record<string, CartItem>>>(() => {
    return DEMO_STAGE === 2 ? STAGE2_INITIAL_CARTS : { main: {} };
  });

  // Идентификатор активной корзины: familyId активной семьи или eventId мероприятия
  const [activeCartId, setActiveCartId] = useState<string>(() => {
    return DEMO_STAGE === 2 ? STAGE2_FAMILY_HOME.id : 'main';
  });

  // Мероприятия
  const [events, setEvents] = useState<AppEvent[]>(() => {
    return DEMO_STAGE === 2 ? STAGE2_INITIAL_EVENTS : [];
  });

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

  const [registeredUsers, setRegisteredUsers] = useState<Record<string, DevUser>>({
    'ivan@mail.ru': DEV_USERS.ivan,
    'elena@mail.ru': DEV_USERS.elena,
    'denis@mail.ru': DEV_USERS.denis,
    'artem@mail.ru': DEV_USERS.artem,
    'danil@mail.ru': DEV_USERS.danil,
  });

  const setCurrentUserByEmail = (email: string): { user: DevUser; hasFamily: boolean } => {
    const cleanEmail = email.trim().toLowerCase();
    let baseUser = registeredUsers[cleanEmail];

    if (!baseUser) {
      if (cleanEmail.includes('elena')) {
        baseUser = DEV_USERS.elena;
      } else if (cleanEmail.includes('denis')) {
        baseUser = DEV_USERS.denis;
      } else if (cleanEmail.includes('artem')) {
        baseUser = DEV_USERS.artem;
      } else if (cleanEmail.includes('danil')) {
        baseUser = DEV_USERS.danil;
      } else {
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
      const myFamilies = await FamilyService.getMyFamilies();
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
    const activeFam = hasFamily ? userFamilies[0] : null;

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

  const logout = () => {
    setCurrentUser({
      ...DEV_USERS.ivan,
      familyId: null,
      familyName: null,
    });
    setFamilies([]);
    setActiveFamilyId(null);
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
        const joinedUser: DevUser = {
          ...currentUser,
          familyId: serverFam.familyId,
          familyName: serverFam.name,
        };

        const serverFamily: FamilyState = {
          id: serverFam.familyId,
          name: serverFam.name,
          code: serverFam.inviteCode || formattedInput,
          members: [joinedUser],
          customProducts: [],
        };

        setKnownFamilies((prev) => ({ ...prev, [serverFam.familyId]: serverFamily }));
        setFamilies((prev) => [...prev, serverFamily]);
        setActiveFamilyId(serverFam.familyId);
        setCurrentUser(joinedUser);
        setActiveCartId(serverFam.familyId);
        setCarts((prev) => ({ ...prev, [serverFam.familyId]: {} }));

        return true;
      }
    } catch (e) {
      console.warn('Backend joinFamily failed:', e);
    }

    // 4. Для удобства демо/тестирования: если введен любой валидный 6-символьный код
    if (formattedInput.length === 6) {
      const dynamicFamilyId = `fam-join-${formattedInput.toLowerCase()}`;
      const dynamicFamilyName = `Группа #${formattedInput}`;
      const joinedUser: DevUser = {
        ...currentUser,
        familyId: dynamicFamilyId,
        familyName: dynamicFamilyName,
      };

      const dynamicFamily: FamilyState = {
        id: dynamicFamilyId,
        name: dynamicFamilyName,
        code: formattedInput,
        members: [
          joinedUser,
          {
            id: `usr-demo-${formattedInput}`,
            name: 'Участник группы',
            email: `member-${formattedInput.toLowerCase()}@mail.ru`,
            familyId: dynamicFamilyId,
            familyName: dynamicFamilyName,
            avatarChar: 'У',
            avatarBg: '#E0E7FF',
            avatarColor: '#3730A3',
          },
        ],
        customProducts: [],
      };

      setKnownFamilies((prev) => ({ ...prev, [dynamicFamilyId]: dynamicFamily }));
      setFamilies((prev) => [...prev, dynamicFamily]);
      setActiveFamilyId(dynamicFamilyId);
      setCurrentUser(joinedUser);
      setActiveCartId(dynamicFamilyId);
      setCarts((prev) => ({ ...prev, [dynamicFamilyId]: {} }));

      return true;
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
    }
  };

  // Добавление пользовательского товара локально в указанную семью
  const addCustomProduct = (
    familyId: string,
    product: { title: string; unit: string; emoji: string }
  ) => {
    const trimmedTitle = product.title.trim();
    if (!trimmedTitle) return;

    const newProduct: CatalogProduct = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
  };

  // Удаление пользовательского товара из семьи
  const deleteCustomProduct = (familyId: string, productId: string) => {
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
      return { success: true };
    }

    // Товар уже взял другой участник семьи -> заблокирован
    const allKnownUsers = [
      ...(family?.members || []),
      ...Object.values(registeredUsers),
      ...Object.values(DEV_USERS),
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
        ...Object.values(DEV_USERS),
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

    return { success: true };
  };

  const totalCartItemsCount = Object.values(cartItems).reduce((sum, item) => sum + item.count, 0);

  const createEvent = (data: { title: string; date: string; emoji: string; familyId?: string }) => {
    const targetFamilyId = data.familyId || activeFamilyId || (families.length > 0 ? families[0].id : undefined);
    const newEvt: AppEvent = {
      id: `evt-${Date.now()}`,
      title: data.title,
      date: data.date,
      emoji: data.emoji,
      badgeBg: '#FFF0F4',
      hasCart: false,
      isCompleted: false,
      familyId: targetFamilyId,
    };
    setEvents((prev) => [newEvt, ...prev]);
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
  };

  const createEventCart = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, hasCart: true } : e))
    );
    setCarts((prev) => ({
      ...prev,
      [id]: prev[id] || {},
    }));
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
    if (DEMO_STAGE === 2) {
      setCarts(STAGE2_INITIAL_CARTS);
      setEvents(STAGE2_INITIAL_EVENTS);
      setFamilies(STAGE2_INITIAL_FAMILIES);
      setKnownFamilies({
        'fam-home': STAGE2_FAMILY_HOME,
        'fam-dorm': STAGE2_FAMILY_DORM,
      });
      setActiveFamilyId(STAGE2_FAMILY_HOME.id);
      setActiveCartId(STAGE2_FAMILY_HOME.id);
      setCurrentUser({
        ...DEV_USERS.ivan,
        familyId: STAGE2_FAMILY_HOME.id,
        familyName: STAGE2_FAMILY_HOME.name,
      });
    } else {
      setCarts({ main: {} });
      setActiveCartId('main');
      setEvents([]);
      setFamilies([]);
      setKnownFamilies({});
      setActiveFamilyId(null);
      setCurrentUser({
        ...DEV_USERS.ivan,
        familyId: null,
        familyName: null,
      });
    }
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
