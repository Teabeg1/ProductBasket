export type Language = 'ru';

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
    textScaleTitle: 'Масштаб текста',
    textScaleSubtitle: 'Размер шрифта интерфейса',
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
};
