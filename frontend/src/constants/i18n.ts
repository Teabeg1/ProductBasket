export type Language = 'ru' | 'en';

export const TRANSLATIONS = {
  ru: {
    // Tabs
    tabCart: 'Корзина',
    tabRoles: 'Роли',
    tabEvents: 'Мероприятия',
    tabSettings: 'Настройки',

    // Cart Screen
    cartTitle: 'Корзина',
    itemsCountSuffix: 'шт',
    addToCart: 'В корзину',

    // Roles Screen
    rolesTitle: 'Моя группа',
    membersInCart: 'участников в корзине',
    allChosen: 'Все выбрано',
    itemsToBuy: 'Товары к покупке',
    cartEmptyTitle: 'В корзине пока пусто',
    cartEmptySubtitle: 'Добавьте товары во вкладке «Корзина», чтобы распределить обязанности по покупкам.',
    goToCatalog: 'Перейти в каталог',
    buyMyself: 'Куплю я',
    willBuy: 'Купит',
    rolesHintTitle: '💡 Совет',
    rolesHintText: 'Нажмите на товар, чтобы изменить ответственного или взять покупку на себя.',

    // Events Screen
    eventsTitle: 'Мероприятия',
    createEventBtn: 'Создать мероприятие',
    eventsEmptyTitle: 'Мероприятий пока нет',
    eventsEmptySubtitle: 'Создайте совместное событие (например, Праздник или Пикник) и соберите корзину.',
    createCartBtn: 'Создать корзину',
    openCartBtn: 'Открыть корзину',
    cartCreatedStatus: 'Корзина создана',
    deleteEventConfirmTitle: 'Удалить мероприятие',
    deleteEventConfirmText: 'Вы уверены, что хотите удалить это событие?',
    cancel: 'Отмена',
    delete: 'Удалить',

    // Settings Screen
    settingsTitle: 'Настройки',
    familyGroupTitle: 'Управление группой',
    addFamilyMember: 'Добавить в группу',
    removeFamilyMember: 'Удалить из группы',
    appSettingsTitle: 'Настройки приложения',
    advancedSettings: 'Расширенные настройки',
    appTheme: 'Тема приложения',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    leaveFamily: 'Выйти из группы',
    leaveFamilyConfirmText: 'Вы уверены, что хотите выйти из группы?',
    creator: 'Создатель',
    member: 'Участник',

    // Advanced Settings Screen
    advSettingsTitle: 'Расширенные настройки',
    notificationsHeader: 'УВЕДОМЛЕНИЯ',
    pushNotifications: 'Push-уведомления',
    notifyItemTaken: 'Оповещать о взятом товаре',
    notifySound: 'Звук при обновлении',
    languageHeader: 'ЯЗЫК ИНТЕРФЕЙСА',
    languageLabel: 'Язык',
    languageCurrent: 'Русский (Россия)',
    securityHeader: 'АККАУНТ И БЕЗОПАСНОСТЬ',
    changePassword: 'Сменить пароль',
    deleteAccount: 'Удалить аккаунт навсегда',

    // Onboarding Screen
    onboardingTitle: 'Группа',
    onboardingSubtitle: 'Выберите способ совместного доступа',
    createFamilyCardTitle: 'Создать новую группу',
    createFamilyCardSubtitle: 'Создайте группу и приглашайте участников по коду',
    familyNamePlaceholder: 'Например, Наша группа',
    createFamilySubmitBtn: 'Создать группу',
    orByInvite: 'ИЛИ ПО ПРИГЛАШЕНИЮ',
    joinFamilyCardTitle: 'Вступить по коду группы',
    joinFamilyCardSubtitle: 'Введите 6-значный код от участника вашей группы',
    joinFamilySubmitBtn: 'Присоединиться к покупкам',
    joinSuccessTitle: 'Добро пожаловать!',
    joinSuccessText: 'Вы успешно присоединились к группе',
    invalidCodeTitle: 'Ошибка кода',
    invalidCodeText: 'Группа с таким кодом не найдена.',

    // Modal Create Event
    modalCreateEventTitle: 'Новое мероприятие',
    eventNameLabel: 'Название мероприятия',
    eventNamePlaceholder: 'Например: Пикник или Новый Год',
    eventDateLabel: 'Дата проведения',
    eventIconLabel: 'Иконка мероприятия',
    createEventSubmitBtn: 'Создать мероприятие',

    // Modal Add Family
    modalAddFamilyTitle: 'Добавить в группу',
    modalAddFamilySubtitle: 'Пригласите участников в «{familyName}» по коду приглашения',
    inviteCodeHeader: 'КОД ПРИГЛАШЕНИЯ В ГРУППУ',
    copyCodeBtn: 'Скопировать',
    copiedBtn: 'Скопировано!',
    inviteCodeHint: 'Для входа достаточно ввести этот код',
    shareCodeBtn: 'Поделиться кодом',
  },
  en: {
    // Tabs
    tabCart: 'Cart',
    tabRoles: 'Roles',
    tabEvents: 'Events',
    tabSettings: 'Settings',

    // Cart Screen
    cartTitle: 'Shopping Cart',
    itemsCountSuffix: 'pcs',
    addToCart: 'Add to Cart',

    // Roles Screen
    rolesTitle: 'My Group',
    membersInCart: 'members in basket',
    allChosen: 'All chosen',
    itemsToBuy: 'Items to Buy',
    cartEmptyTitle: 'Your cart is empty',
    cartEmptySubtitle: 'Add items from the "Cart" tab to assign shopping tasks.',
    goToCatalog: 'Open Catalog',
    buyMyself: 'I will buy',
    willBuy: 'Buys',
    rolesHintTitle: '💡 Tip',
    rolesHintText: 'Tap an item to change assignee or take responsibility for buying it.',

    // Events Screen
    eventsTitle: 'Events',
    createEventBtn: 'Create Event',
    eventsEmptyTitle: 'No events yet',
    eventsEmptySubtitle: 'Create a shared event (e.g., Party or Picnic) and start a group basket.',
    createCartBtn: 'Create Cart',
    openCartBtn: 'Open Cart',
    cartCreatedStatus: 'Cart Created',
    deleteEventConfirmTitle: 'Delete Event',
    deleteEventConfirmText: 'Are you sure you want to delete this event?',
    cancel: 'Cancel',
    delete: 'Delete',

    // Settings Screen
    settingsTitle: 'Settings',
    familyGroupTitle: 'Group Management',
    addFamilyMember: 'Add to Group',
    removeFamilyMember: 'Remove from Group',
    appSettingsTitle: 'App Settings',
    advancedSettings: 'Advanced Settings',
    appTheme: 'App Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    leaveFamily: 'Leave Group',
    leaveFamilyConfirmText: 'Are you sure you want to leave the group?',
    creator: 'Creator',
    member: 'Member',

    // Advanced Settings Screen
    advSettingsTitle: 'Advanced Settings',
    notificationsHeader: 'NOTIFICATIONS',
    pushNotifications: 'Push Notifications',
    notifyItemTaken: 'Notify on Item Picked',
    notifySound: 'Update Sound',
    languageHeader: 'INTERFACE LANGUAGE',
    languageLabel: 'Language',
    languageCurrent: 'English (US)',
    securityHeader: 'ACCOUNT & SECURITY',
    changePassword: 'Change Password',
    deleteAccount: 'Delete Account Permanently',

    // Onboarding Screen
    onboardingTitle: 'Group',
    onboardingSubtitle: 'Choose how to collaborate',
    createFamilyCardTitle: 'Create New Group',
    createFamilyCardSubtitle: 'Create a group and invite members with code',
    familyNamePlaceholder: 'e.g. Room 304',
    createFamilySubmitBtn: 'Create Group',
    orByInvite: 'OR VIA INVITATION',
    joinFamilyCardTitle: 'Join with Group Code',
    joinFamilyCardSubtitle: 'Enter 6-character code from a group member',
    joinFamilySubmitBtn: 'Join Shopping Basket',
    joinSuccessTitle: 'Welcome!',
    joinSuccessText: 'You successfully joined the group',
    invalidCodeTitle: 'Invalid Code',
    invalidCodeText: 'Group with this code was not found.',

    // Modal Create Event
    modalCreateEventTitle: 'New Event',
    eventNameLabel: 'Event Name',
    eventNamePlaceholder: 'e.g. Picnic or Party',
    eventDateLabel: 'Event Date',
    eventIconLabel: 'Event Icon',
    createEventSubmitBtn: 'Create Event',

    // Modal Add Family
    modalAddFamilyTitle: 'Add to Group',
    modalAddFamilySubtitle: 'Invite members to "{familyName}" with invite code',
    inviteCodeHeader: 'GROUP INVITATION CODE',
    copyCodeBtn: 'Copy',
    copiedBtn: 'Copied!',
    inviteCodeHint: 'Just enter this code to join',
    shareCodeBtn: 'Share Code',
  },
};
