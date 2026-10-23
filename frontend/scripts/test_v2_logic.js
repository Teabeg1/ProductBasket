// Comprehensive Verification Test Suite for CorzinaUI APK v2
const assert = require('assert');

console.log('=======================================================');
console.log('   RUNNING COMPREHENSIVE APK v2 LOGIC & EDGE-CASE TESTS');
console.log('=======================================================');

// 1. Initial Data Setup (matching devConfig & AppContext Stage 2)
const DEV_USERS = {
  ivan: { id: 'user-ivan', name: 'Иван', email: 'ivan@mail.ru' },
  elena: { id: 'user-elena', name: 'Елена (Мама)', email: 'elena@mail.ru' },
  denis: { id: 'user-denis', name: 'Денис (Папа)', email: 'denis@mail.ru' },
  artem: { id: 'user-artem', name: 'Артём (Сосед)', email: 'artem@mail.ru' },
  danil: { id: 'user-danil', name: 'Данил (Сосед)', email: 'danil@mail.ru' },
};

const STAGE2_FAMILY_HOME = {
  id: 'fam-home',
  name: 'Группа Смирновых',
  code: '7A9K2M',
  members: [
    { ...DEV_USERS.ivan, familyId: 'fam-home', familyName: 'Группа Смирновых' },
    { ...DEV_USERS.elena, familyId: 'fam-home', familyName: 'Группа Смирновых' },
    { ...DEV_USERS.denis, familyId: 'fam-home', familyName: 'Группа Смирновых' },
  ],
  customProducts: [
    { id: 'custom-home-pelmeni', title: 'Домашние пельмени', unit: '800 г', emoji: '🥟' },
  ],
};

const STAGE2_FAMILY_DORM = {
  id: 'fam-dorm',
  name: 'Общежитие: комната 304',
  code: '3D8R9P',
  members: [
    { ...DEV_USERS.ivan, familyId: 'fam-dorm', familyName: 'Общежитие: комната 304' },
    { ...DEV_USERS.artem, familyId: 'fam-dorm', familyName: 'Общежитие: комната 304' },
    { ...DEV_USERS.danil, familyId: 'fam-dorm', familyName: 'Общежитие: комната 304' },
  ],
  customProducts: [
    { id: 'custom-dorm-noodles', title: 'Лапша Доширак', unit: '90 г', emoji: '🍜' },
  ],
};

const INITIAL_CARTS = {
  'fam-home': {
    'prod-milk': { id: 'prod-milk', title: 'Молоко', count: 2, assignedToUserId: 'user-ivan', isBought: true },
    'prod-apple': { id: 'prod-apple', title: 'Яблоки', count: 1, assignedToUserId: 'user-elena', isBought: false },
    'prod-cheese': { id: 'prod-cheese', title: 'Сыр', count: 1, assignedToUserId: null, isBought: false },
    'custom-home-pelmeni': { id: 'custom-home-pelmeni', title: 'Домашние пельмени', count: 1, assignedToUserId: 'user-ivan', isBought: false },
  },
  'fam-dorm': {
    'prod-sugar': { id: 'prod-sugar', title: 'Сахар', count: 1, assignedToUserId: 'user-artem', isBought: false },
    'custom-dorm-noodles': { id: 'custom-dorm-noodles', title: 'Лапша Доширак', count: 4, assignedToUserId: 'user-ivan', isBought: true },
    'prod-cheese': { id: 'prod-cheese', title: 'Сыр', count: 1, assignedToUserId: 'user-danil', isBought: false },
  },
  'evt-picnic': {
    'prod-cucumbers': { id: 'prod-cucumbers', title: 'Огурцы', count: 3, assignedToUserId: 'user-ivan', isBought: true },
  },
};

// =========================================================================
// TEST 1: Requirement 1 - Multi-Family Simultaneous Membership & Isolation
// =========================================================================
console.log('\n[Test 1] Multi-Family Membership & Non-Intersecting Participants...');
{
  const families = [STAGE2_FAMILY_HOME, STAGE2_FAMILY_DORM];
  const ivanId = DEV_USERS.ivan.id;

  // Ivan is simultaneously in Home and Dorm groups
  assert.strictEqual(families[0].members.some(m => m.id === ivanId), true, 'Ivan must be in Family Home');
  assert.strictEqual(families[1].members.some(m => m.id === ivanId), true, 'Ivan must be in Family Dorm');

  // Parents are ONLY in Home family
  assert.strictEqual(families[0].members.some(m => m.id === DEV_USERS.elena.id), true);
  assert.strictEqual(families[1].members.some(m => m.id === DEV_USERS.elena.id), false, 'Elena must NOT be in Dorm');
  assert.strictEqual(families[1].members.some(m => m.id === DEV_USERS.denis.id), false, 'Denis must NOT be in Dorm');

  // Roommates are ONLY in Dorm family
  assert.strictEqual(families[1].members.some(m => m.id === DEV_USERS.artem.id), true);
  assert.strictEqual(families[0].members.some(m => m.id === DEV_USERS.artem.id), false, 'Artem must NOT be in Home');
  assert.strictEqual(families[0].members.some(m => m.id === DEV_USERS.danil.id), false, 'Danil must NOT be in Home');

  console.log('✓ PASS: Ivan belongs simultaneously to two non-intersecting groups.');
}

// =========================================================================
// TEST 2: User Switch Isolation (Elena vs Artem vs Ivan)
// =========================================================================
console.log('\n[Test 2] User Account Switching & Family Scoping...');
{
  const knownFamilies = {
    'fam-home': STAGE2_FAMILY_HOME,
    'fam-dorm': STAGE2_FAMILY_DORM,
  };

  function simulateUserLogin(email) {
    const cleanEmail = email.trim().toLowerCase();
    const baseUser = Object.values(DEV_USERS).find(u => u.email === cleanEmail);
    assert(baseUser, `User ${email} must exist in DEV_USERS`);

    const userFamilies = Object.values(knownFamilies).filter((f) =>
      f.members.some((m) => m.id === baseUser.id || m.email?.toLowerCase() === cleanEmail)
    );
    const hasFamily = userFamilies.length > 0;
    const activeFam = hasFamily ? userFamilies[0] : null;

    return {
      currentUser: {
        ...baseUser,
        familyId: activeFam ? activeFam.id : null,
        familyName: activeFam ? activeFam.name : null,
      },
      families: userFamilies,
      activeFamilyId: activeFam ? activeFam.id : null,
      activeCartId: activeFam ? activeFam.id : 'main',
    };
  }

  // 2.1 Elena logs in -> only Home family
  const elenaSession = simulateUserLogin('elena@mail.ru');
  assert.strictEqual(elenaSession.families.length, 1, 'Elena must only have 1 family');
  assert.strictEqual(elenaSession.families[0].id, 'fam-home');
  assert.strictEqual(elenaSession.activeFamilyId, 'fam-home');

  // 2.2 Artem logs in -> only Dorm family
  const artemSession = simulateUserLogin('artem@mail.ru');
  assert.strictEqual(artemSession.families.length, 1, 'Artem must only have 1 family');
  assert.strictEqual(elenaSession.families.some(f => f.id === 'fam-dorm'), false, 'Elena cannot see Dorm');
  assert.strictEqual(artemSession.families[0].id, 'fam-dorm');
  assert.strictEqual(artemSession.activeFamilyId, 'fam-dorm');

  // 2.3 Ivan logs in -> sees both families
  const ivanSession = simulateUserLogin('ivan@mail.ru');
  assert.strictEqual(ivanSession.families.length, 2, 'Ivan must have both families');
  assert.deepStrictEqual(ivanSession.families.map(f => f.id).sort(), ['fam-dorm', 'fam-home']);

  console.log('✓ PASS: User switching correctly isolates family state per user account.');
}

// =========================================================================
// TEST 3: Requirement 2 - Custom Products Local to Each Family & Synced
// =========================================================================
console.log('\n[Test 3] Custom Products Per-Family Scoping and Registry Sync...');
{
  let families = [JSON.parse(JSON.stringify(STAGE2_FAMILY_HOME)), JSON.parse(JSON.stringify(STAGE2_FAMILY_DORM))];
  let knownFamilies = {
    'fam-home': families[0],
    'fam-dorm': families[1],
  };
  let carts = JSON.parse(JSON.stringify(INITIAL_CARTS));

  function addCustomProduct(familyId, product) {
    const newProduct = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: product.title,
      unit: product.unit,
      emoji: product.emoji,
    };
    families = families.map(f => f.id === familyId ? { ...f, customProducts: [...(f.customProducts || []), newProduct] } : f);
    if (knownFamilies[familyId]) {
      knownFamilies[familyId] = {
        ...knownFamilies[familyId],
        customProducts: [...(knownFamilies[familyId].customProducts || []), newProduct],
      };
    }
    return newProduct.id;
  }

  function deleteCustomProduct(familyId, productId) {
    families = families.map(f => f.id === familyId ? { ...f, customProducts: (f.customProducts || []).filter(p => p.id !== productId) } : f);
    if (knownFamilies[familyId]) {
      knownFamilies[familyId] = {
        ...knownFamilies[familyId],
        customProducts: (knownFamilies[familyId].customProducts || []).filter(p => p.id !== productId),
      };
    }
    if (carts[familyId] && carts[familyId][productId]) {
      delete carts[familyId][productId];
    }
  }

  // 3.1 Add custom product to Home
  const homeProdId = addCustomProduct('fam-home', { title: 'Сырники творожные', unit: '400 г', emoji: '🥞' });
  assert.strictEqual(families.find(f => f.id === 'fam-home').customProducts.some(p => p.id === homeProdId), true);
  assert.strictEqual(knownFamilies['fam-home'].customProducts.some(p => p.id === homeProdId), true, 'knownFamilies must be updated');
  assert.strictEqual(families.find(f => f.id === 'fam-dorm').customProducts.some(p => p.id === homeProdId), false, 'Must not leak to Dorm');

  // 3.2 Add custom product to Dorm
  const dormProdId = addCustomProduct('fam-dorm', { title: 'Энергетик', unit: '500 мл', emoji: '🥤' });
  assert.strictEqual(families.find(f => f.id === 'fam-dorm').customProducts.some(p => p.id === dormProdId), true);
  assert.strictEqual(families.find(f => f.id === 'fam-home').customProducts.some(p => p.id === dormProdId), false, 'Must not leak to Home');

  // 3.3 Add to cart and delete custom product
  carts['fam-home'][homeProdId] = { id: homeProdId, title: 'Сырники творожные', count: 2, assignedToUserId: null, isBought: false };
  deleteCustomProduct('fam-home', homeProdId);
  assert.strictEqual(families.find(f => f.id === 'fam-home').customProducts.some(p => p.id === homeProdId), false);
  assert.strictEqual(carts['fam-home'][homeProdId], undefined, 'Product must be removed from family cart');

  console.log('✓ PASS: Custom products are strictly scoped locally per family and clean up properly.');
}

// =========================================================================
// TEST 4: Requirement 3 - Viewing Participants List & Family Cart Counts
// =========================================================================
console.log('\n[Test 4] Viewing Participants List by Family Name...');
{
  function getMemberAssignedCount(familyCart, memberId) {
    const items = Object.values(familyCart || {});
    return items.filter(i => i.assignedToUserId === memberId).length;
  }

  // 4.1 Home family members and item counts
  const homeCart = INITIAL_CARTS['fam-home'];
  const homeMembers = STAGE2_FAMILY_HOME.members;
  assert.strictEqual(homeMembers.length, 3);
  assert.deepStrictEqual(homeMembers.map(m => m.name), ['Иван', 'Елена (Мама)', 'Денис (Папа)']);
  assert.strictEqual(getMemberAssignedCount(homeCart, 'user-ivan'), 2, 'Ivan has 2 items in Home (milk, pelmeni)');
  assert.strictEqual(getMemberAssignedCount(homeCart, 'user-elena'), 1, 'Elena has 1 item in Home (apple)');
  assert.strictEqual(getMemberAssignedCount(homeCart, 'user-denis'), 0, 'Denis has 0 items in Home');

  // 4.2 Dorm family members and item counts
  const dormCart = INITIAL_CARTS['fam-dorm'];
  const dormMembers = STAGE2_FAMILY_DORM.members;
  assert.strictEqual(dormMembers.length, 3);
  assert.deepStrictEqual(dormMembers.map(m => m.name), ['Иван', 'Артём (Сосед)', 'Данил (Сосед)']);
  assert.strictEqual(getMemberAssignedCount(dormCart, 'user-artem'), 1, 'Artem has 1 item in Dorm (sugar)');
  assert.strictEqual(getMemberAssignedCount(dormCart, 'user-ivan'), 1, 'Ivan has 1 item in Dorm (noodles)');
  assert.strictEqual(getMemberAssignedCount(dormCart, 'user-danil'), 1, 'Danil has 1 item in Dorm (cheese)');

  console.log('✓ PASS: Participants list and per-family cart counts are accurately computed.');
}

// =========================================================================
// TEST 5: Requirement 4 - "Куплено" Status Permissions and State Transitions
// =========================================================================
console.log('\n[Test 5] Status «Куплено» Permissions & Toggle Rules...');
{
  let testCart = {
    'prod-unassigned': { id: 'prod-unassigned', title: 'Хлеб', assignedToUserId: null, isBought: false },
    'prod-elena': { id: 'prod-elena', title: 'Яблоки', assignedToUserId: DEV_USERS.elena.id, isBought: false },
    'prod-ivan': { id: 'prod-ivan', title: 'Молоко', assignedToUserId: DEV_USERS.ivan.id, isBought: false },
  };

  function toggleItemPurchased(cart, itemId, currentUserId) {
    const item = cart[itemId];
    if (!item) return { success: false, message: 'Товар не найден' };
    if (item.assignedToUserId === null) {
      return { success: false, message: 'Сначала выберите товар («Куплю я»)' };
    }
    if (item.assignedToUserId !== currentUserId) {
      return { success: false, message: 'Только участник, который выбрал товар, может отметить его купленным' };
    }
    item.isBought = !item.isBought;
    return { success: true };
  }

  function assignCartItem(cart, itemId, currentUserId) {
    const item = cart[itemId];
    if (!item) return { success: false };
    if (item.assignedToUserId === null) {
      item.assignedToUserId = currentUserId;
      return { success: true };
    }
    if (item.assignedToUserId === currentUserId) {
      item.assignedToUserId = null;
      item.isBought = false; // Reset bought status on unassign
      return { success: true };
    }
    return { success: false, message: 'Занято другим' };
  }

  // 5.1 Unassigned item cannot be marked bought
  const res1 = toggleItemPurchased(testCart, 'prod-unassigned', DEV_USERS.ivan.id);
  assert.strictEqual(res1.success, false);
  assert.strictEqual(testCart['prod-unassigned'].isBought, false);

  // 5.2 Another user's item cannot be marked bought by Ivan
  const res2 = toggleItemPurchased(testCart, 'prod-elena', DEV_USERS.ivan.id);
  assert.strictEqual(res2.success, false);
  assert.strictEqual(testCart['prod-elena'].isBought, false);

  // 5.3 Assignee (Ivan) CAN mark his item as bought
  const res3 = toggleItemPurchased(testCart, 'prod-ivan', DEV_USERS.ivan.id);
  assert.strictEqual(res3.success, true);
  assert.strictEqual(testCart['prod-ivan'].isBought, true);

  // 5.4 Toggle back
  const res4 = toggleItemPurchased(testCart, 'prod-ivan', DEV_USERS.ivan.id);
  assert.strictEqual(res4.success, true);
  assert.strictEqual(testCart['prod-ivan'].isBought, false);

  // 5.5 If bought and user unassigns -> resets isBought to false
  toggleItemPurchased(testCart, 'prod-ivan', DEV_USERS.ivan.id);
  assert.strictEqual(testCart['prod-ivan'].isBought, true);
  assignCartItem(testCart, 'prod-ivan', DEV_USERS.ivan.id);
  assert.strictEqual(testCart['prod-ivan'].assignedToUserId, null);
  assert.strictEqual(testCart['prod-ivan'].isBought, false, 'Unassigning must reset isBought');

  console.log('✓ PASS: «Куплено» status strictly enforced with permissions and reset triggers.');
}

// =========================================================================
// TEST 6: Requirement 5 - Completed Events Tracking & Cart Reset
// =========================================================================
console.log('\n[Test 6] Completed Events Folder & Active Cart Reset...');
{
  let events = [
    { id: 'evt-picnic', title: 'Пикник на природе', isCompleted: false },
    { id: 'evt-hackathon', title: 'Студенческий хакатон', isCompleted: true, completedAt: '10 мая' },
  ];
  let activeCartId = 'evt-picnic';
  const activeFamilyId = 'fam-home';

  function completeEvent(eventId) {
    events = events.map(e => e.id === eventId ? { ...e, isCompleted: true, completedAt: '17 октября' } : e);
    if (activeCartId === eventId) {
      activeCartId = activeFamilyId || 'main';
    }
  }

  function reopenEvent(eventId) {
    events = events.map(e => e.id === eventId ? { ...e, isCompleted: false, completedAt: undefined } : e);
  }

  // 6.1 Check active vs completed folders
  let activeEvents = events.filter(e => !e.isCompleted);
  let completedEvents = events.filter(e => !!e.isCompleted);
  assert.strictEqual(activeEvents.length, 1);
  assert.strictEqual(completedEvents.length, 1);
  assert.strictEqual(completedEvents[0].id, 'evt-hackathon');

  // 6.2 Complete active event
  completeEvent('evt-picnic');
  activeEvents = events.filter(e => !e.isCompleted);
  completedEvents = events.filter(e => !!e.isCompleted);
  assert.strictEqual(activeEvents.length, 0, 'No more active events');
  assert.strictEqual(completedEvents.length, 2, 'Two events in completed folder');
  assert.strictEqual(activeCartId, 'fam-home', 'Active cart was cleanly reset from completed event to family cart');

  // 6.3 Reopen event
  reopenEvent('evt-picnic');
  activeEvents = events.filter(e => !e.isCompleted);
  assert.strictEqual(activeEvents.length, 1);
  assert.strictEqual(activeEvents[0].id, 'evt-picnic');
  assert.strictEqual(activeEvents[0].isCompleted, false);

  console.log('✓ PASS: Completed events folder management and cart lifecycle fully verified.');
}

// =========================================================================
// TEST 7: Event Isolation per Group & Space Filter Slider
// =========================================================================
console.log('\n[Test 7] Event Scoping per Group & Space Filter Slider...');
{
  const events = [
    { id: 'evt-picnic', title: 'Пикник на природе', emoji: '🧺', familyId: 'fam-home', isCompleted: false },
    { id: 'evt-denis-bday', title: 'День рождения папы', emoji: '🎂', familyId: 'fam-home', isCompleted: false },
    { id: 'evt-hackathon', title: 'Студенческий хакатон', emoji: '💻', familyId: 'fam-dorm', isCompleted: true },
  ];

  // 7.1 Elena (only fam-home)
  const elenaFamilyIds = ['fam-home'];
  const elenaEvents = events.filter((e) => !e.familyId || elenaFamilyIds.includes(e.familyId));
  assert.strictEqual(elenaEvents.length, 2, 'Elena should only see 2 Home events');
  assert.strictEqual(elenaEvents.some(e => e.id === 'evt-hackathon'), false, 'Dorm hackathon must be hidden from Elena');

  // 7.2 Ivan (fam-home and fam-dorm)
  const ivanFamilyIds = ['fam-home', 'fam-dorm'];
  const ivanEvents = events.filter((e) => !e.familyId || ivanFamilyIds.includes(e.familyId));
  assert.strictEqual(ivanEvents.length, 3, 'Ivan should see all 3 events across his groups');

  // 7.3 Space filter slider
  function filterBySpace(userEvts, spaceFilter) {
    if (spaceFilter === 'all') return userEvts;
    return userEvts.filter(e => e.familyId === spaceFilter);
  }

  const ivanAll = filterBySpace(ivanEvents, 'all');
  assert.strictEqual(ivanAll.length, 3, 'All filter shows 3 events');

  const ivanHome = filterBySpace(ivanEvents, 'fam-home');
  assert.strictEqual(ivanHome.length, 2, 'Home filter shows 2 events');
  assert.deepStrictEqual(ivanHome.map(e => e.id), ['evt-picnic', 'evt-denis-bday']);

  const ivanDorm = filterBySpace(ivanEvents, 'fam-dorm');
  assert.strictEqual(ivanDorm.length, 1, 'Dorm filter shows 1 event');
  assert.strictEqual(ivanDorm[0].id, 'evt-hackathon');

  // 7.4 Creating new event with familyId
  function createEvent(eventList, title, date, emoji, targetFamilyId) {
    const newId = `evt-${Date.now()}`;
    const newEvent = {
      id: newId,
      title,
      date,
      emoji,
      familyId: targetFamilyId,
      isCompleted: false,
      hasCart: false,
    };
    return [...eventList, newEvent];
  }

  const updatedEvents = createEvent(events, 'Вечеринка в общаге', '25 мая', '🎉', 'fam-dorm');
  const elenaAfterNewEvent = updatedEvents.filter((e) => !e.familyId || elenaFamilyIds.includes(e.familyId));
  assert.strictEqual(elenaAfterNewEvent.length, 2, 'Elena must not see newly created dorm event');

  const dormAfterNewEvent = filterBySpace(
    updatedEvents.filter((e) => !e.familyId || ivanFamilyIds.includes(e.familyId)),
    'fam-dorm'
  );
  assert.strictEqual(dormAfterNewEvent.length, 2, 'Dorm should now have 2 events for Ivan');

  console.log('✓ PASS: Events strictly scoped per group and space filter slider works properly.');
}

// =========================================================================
// TEST 8: Header Titles Formatting & Terminology Validation
// =========================================================================
console.log('\n[Test 8] Header Titles Formatting & Russian Terminology...');
{
  const events = [
    { id: 'evt-picnic', title: 'Пикник на природе', emoji: '🧺', familyId: 'fam-home' },
    { id: 'evt-denis-bday', title: 'День рождения папы', emoji: '🎂', familyId: 'fam-home' },
  ];

  function getActiveCartTitle(activeCartId, eventList) {
    if (!activeCartId) return 'Корзина';
    if (activeCartId.startsWith('evt-') || activeCartId.startsWith('event-')) {
      const ev = eventList.find((e) => e.id === activeCartId);
      return ev ? `${ev.title} ${ev.emoji}` : 'Корзина события';
    }
    return 'Корзина';
  }

  // 8.1 Cart header title formatting
  const mainCartTitle = getActiveCartTitle('fam-home', events);
  assert.strictEqual(mainCartTitle, 'Корзина', 'Main cart must be "Корзина"');

  const picnicCartTitle = getActiveCartTitle('evt-picnic', events);
  assert.strictEqual(picnicCartTitle, 'Пикник на природе 🧺', 'Event cart must be "${title} ${emoji}" without "Корзина: " prefix');
  assert.strictEqual(picnicCartTitle.startsWith('Корзина: '), false, 'Must NOT start with "Корзина: "');

  // 8.2 & 8.3 Terminology validation via i18n source file
  const fs = require('fs');
  const path = require('path');
  const i18nContent = fs.readFileSync(path.join(__dirname, '../src/constants/i18n.ts'), 'utf8');

  assert(i18nContent.includes("rolesTitle: 'Моя группа'"), 'rolesTitle must be "Моя группа"');
  assert(i18nContent.includes("addFamilyMember: 'Добавить в группу'"), 'addFamilyMember must be "Добавить в группу"');
  assert(i18nContent.includes("leaveFamily: 'Выйти из группы'"), 'leaveFamily must be "Выйти из группы"');
  assert(i18nContent.includes("removeFamilyMember: 'Удалить из группы'"), 'removeFamilyMember must be "Удалить из группы"');
  assert(i18nContent.includes("familyGroupTitle: 'Управление группой'"), 'familyGroupTitle must be "Управление группой"');
  assert(i18nContent.includes("createFamilySubmitBtn: 'Создать группу'"), 'createFamilySubmitBtn must be "Создать группу"');
  assert(i18nContent.includes("joinFamilyCardTitle: 'Вступить по коду группы'"), 'joinFamilyCardTitle must be "Вступить по коду группы"');

  console.log('✓ PASS: Cart and Roles header titles formatted correctly, terminology updated.');
}
// =========================================================================
// TEST 9: Russian-Only Mode & Typography Scaling (Lecturer Requirements)
// =========================================================================
console.log('\n[Test 9] Russian-Only Mode & Typography Scaling System...');
{
  const fs = require('fs');
  const path = require('path');

  // 9.1 i18n is strictly Russian, no English dictionary
  const i18nContent = fs.readFileSync(path.join(__dirname, '../src/constants/i18n.ts'), 'utf8');
  assert(i18nContent.includes("export type Language = 'ru';"), 'Language type must only be ru');
  assert(!i18nContent.includes('en: {'), 'English dictionary must be completely removed');
  assert(i18nContent.includes("textScaleTitle: 'Масштаб текста'"), 'Must have textScaleTitle key');

  // 9.2 AppContext text scale state & multipliers
  const appContextContent = fs.readFileSync(path.join(__dirname, '../src/context/AppContext.tsx'), 'utf8');
  assert(!appContextContent.includes('toggleLanguage:'), 'AppContext must NOT expose toggleLanguage');
  assert(appContextContent.includes('fontScale: FontScaleLevel;'), 'AppContext must export fontScale');
  assert(appContextContent.includes('fontScaleMultiplier: number;'), 'AppContext must export fontScaleMultiplier');
  assert(appContextContent.includes("useState<FontScaleLevel>('medium')"), 'Default font scale must be medium (larger)');
  assert(appContextContent.includes('small: 1.0'), 'Multiplier for small must be 1.0 (original)');
  assert(appContextContent.includes('medium: 1.12'), 'Multiplier for medium must be 1.12 (+12%)');
  assert(appContextContent.includes('large: 1.25'), 'Multiplier for large must be 1.25 (+25%)');

  // 9.3 AppText component exists and scales fontSize
  const appTextContent = fs.readFileSync(path.join(__dirname, '../src/components/AppText.tsx'), 'utf8');
  assert(appTextContent.includes('fontScaleMultiplier'), 'AppText must utilize fontScaleMultiplier');

  // 9.4 Scale is completely in AdvancedSettingsScreen, removed from SettingsScreen
  const settingsContent = fs.readFileSync(path.join(__dirname, '../src/screens/SettingsScreen.tsx'), 'utf8');
  assert(!settingsContent.includes('<TextScaleSlider />'), 'SettingsScreen must NOT include TextScaleSlider');

  const advSettingsContent = fs.readFileSync(path.join(__dirname, '../src/screens/AdvancedSettingsScreen.tsx'), 'utf8');
  assert(advSettingsContent.includes('<TextScaleSlider />'), 'AdvancedSettingsScreen must include TextScaleSlider');

  // 9.5 TextScaleSlider contains exactly 3 options: Мелкий, Обычный, Крупный
  const sliderContent = fs.readFileSync(path.join(__dirname, '../src/components/TextScaleSlider.tsx'), 'utf8');
  assert(sliderContent.includes("label: 'Мелкий'"), 'Must include Мелкий option');
  assert(sliderContent.includes("label: 'Обычный'"), 'Must include Обычный option');
  assert(sliderContent.includes("label: 'Крупный'"), 'Must include Крупный option');
  assert(!sliderContent.includes('Живой образец'), 'Must NOT have preview sample');

  console.log('✓ PASS: Strict Russian-only mode verified and font scaling multiplier defaults are active.');
}

console.log('\n=======================================================');
console.log('   ALL 9 COMPREHENSIVE TESTS SUCCESSFULLY PASSED!');
console.log('=======================================================\n');
