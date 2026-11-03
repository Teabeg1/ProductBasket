using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ProductBasket.Api.Dtos;
using Xunit;

namespace ProductBasket.Tests;

public class CartTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public CartTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient Client, AuthResponse Auth)> CreateAuthenticatedUserAsync(string name)
    {
        var client = _factory.CreateClient();
        var email = $"{name.ToLower()}_{Guid.NewGuid()}@example.com";
        var res = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            DisplayName = name,
            Email = email,
            Password = "Password123!"
        });
        var auth = await res.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return (client, auth);
    }

    private async Task<(HttpClient ClientA, HttpClient ClientB, Guid FamilyId)> SetupFamilyWithTwoUsersAsync()
    {
        var (clientA, _) = await CreateAuthenticatedUserAsync("Alice");
        var (clientB, _) = await CreateAuthenticatedUserAsync("Bob");

        var famRes = await clientA.PostAsJsonAsync("/api/family/create", new CreateFamilyRequest { Name = "Семья Тест" });
        var family = await famRes.Content.ReadFromJsonAsync<FamilyResponse>();

        await clientB.PostAsJsonAsync("/api/family/join", new JoinFamilyRequest { InviteCode = family!.InviteCode });

        return (clientA, clientB, family.FamilyId);
    }

    [Fact]
    public async Task AddItem_And_UpdateCount_WorksCorrectly()
    {
        var (clientA, _, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. Добавляем молоко
        var addRes = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Молоко 3.2%",
            Unit = "930 мл",
            Emoji = "🥛",
            Count = 1
        });
        Assert.Equal(HttpStatusCode.Created, addRes.StatusCode);
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(item);
        Assert.Equal(1, item.Count);

        // 2. Обновляем количество до 3
        var updateRes = await clientA.PutAsJsonAsync($"/api/cart/items/{item.Id}", new UpdateCartItemRequest { Count = 3 });
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updatedItem = await updateRes.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(updatedItem);
        Assert.Equal(3, updatedItem.Count);

        // 3. Обновляем количество до 0 (должно удалить)
        var zeroRes = await clientA.PutAsJsonAsync($"/api/cart/items/{item.Id}", new UpdateCartItemRequest { Count = 0 });
        Assert.Equal(HttpStatusCode.OK, zeroRes.StatusCode);

        // 4. Проверяем, что корзина пуста
        var getRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var items = await getRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(items);
        Assert.Empty(items);
    }

    [Fact]
    public async Task TakeProduct_AssignsToUser_AndLocksFromOtherUsers()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // Alice добавляет сыр
        var addRes = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Сыр Тильзитер",
            Unit = "200 г",
            Count = 1
        });
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();

        // Alice нажимает «Куплю я»
        var takeResA = await clientA.PostAsync($"/api/cart/{item!.Id}/take", null);
        Assert.Equal(HttpStatusCode.OK, takeResA.StatusCode);
        var actionA = await takeResA.Content.ReadFromJsonAsync<CartActionResponse>();
        Assert.True(actionA!.Success);
        Assert.Equal("Taken", actionA.Item!.Status);
        Assert.Equal("Alice", actionA.Item.TakenByName);

        // Bob пытается взять этот же товар -> ДОЛЖЕН получить отказ (защита от перезаписи)
        var takeResB = await clientB.PostAsync($"/api/cart/{item.Id}/take", null);
        Assert.Equal(HttpStatusCode.BadRequest, takeResB.StatusCode);
        var actionB = await takeResB.Content.ReadFromJsonAsync<CartActionResponse>();
        Assert.False(actionB!.Success);
        Assert.Contains("Alice", actionB.Message);
    }

    [Fact]
    public async Task ReleaseProduct_ResetsStatusToPending()
    {
        var (clientA, _, familyId) = await SetupFamilyWithTwoUsersAsync();

        var addRes = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Яблоки",
            Count = 1
        });
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();

        // Взять
        await clientA.PostAsync($"/api/cart/{item!.Id}/take", null);

        // Снять выбор
        var releaseRes = await clientA.PostAsync($"/api/cart/{item.Id}/release", null);
        Assert.Equal(HttpStatusCode.OK, releaseRes.StatusCode);
        var action = await releaseRes.Content.ReadFromJsonAsync<CartActionResponse>();
        Assert.True(action!.Success);
        Assert.Equal("Pending", action.Item!.Status);
        Assert.Null(action.Item.AssignedToUserId);
    }

    [Fact]
    public async Task TogglePurchased_OnlyAllowedForAssignedUser()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        var addRes = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Хлеб",
            Count = 1
        });
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();

        // Товар пока не назначен -> попытка отметить купленным выдает ошибку
        var toggleUnassigned = await clientA.PostAsync($"/api/cart/{item!.Id}/toggle-purchased", null);
        Assert.Equal(HttpStatusCode.BadRequest, toggleUnassigned.StatusCode);

        // Alice берет товар
        await clientA.PostAsync($"/api/cart/{item.Id}/take", null);

        // Bob не может отметить товар Alice как купленный
        var toggleBob = await clientB.PostAsync($"/api/cart/{item.Id}/toggle-purchased", null);
        Assert.Equal(HttpStatusCode.BadRequest, toggleBob.StatusCode);

        // Alice успешно отмечает купленным
        var toggleAlice = await clientA.PostAsync($"/api/cart/{item.Id}/toggle-purchased", null);
        Assert.Equal(HttpStatusCode.OK, toggleAlice.StatusCode);
        var action = await toggleAlice.Content.ReadFromJsonAsync<CartActionResponse>();
        Assert.True(action!.Success);
        Assert.True(action.Item!.IsBought);
        Assert.Equal("Purchased", action.Item.Status);
    }

    [Fact]
    public async Task EventCart_IsIsolatedFromMainCart()
    {
        var (clientA, _, familyId) = await SetupFamilyWithTwoUsersAsync();

        // Создаем мероприятие
        var evRes = await clientA.PostAsJsonAsync("/api/events", new CreateEventRequest
        {
            FamilyId = familyId,
            Title = "Пикник",
            EventDate = "20 мая"
        });
        var ev = await evRes.Content.ReadFromJsonAsync<EventDto>();

        // Добавляем огурцы в корзину мероприятия
        await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            EventId = ev!.Id,
            Title = "Огурцы",
            Count = 2
        });

        // Добавляем хлеб в основную корзину семьи
        await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            EventId = null,
            Title = "Хлеб",
            Count = 1
        });

        // Проверяем корзину мероприятия
        var eventCartRes = await clientA.GetAsync($"/api/cart?familyId={familyId}&eventId={ev.Id}");
        var eventCart = await eventCartRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(eventCart);
        Assert.Single(eventCart);
        Assert.Equal("Огурцы", eventCart[0].Title);

        // Проверяем основную корзину
        var mainCartRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var mainCart = await mainCartRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(mainCart);
        Assert.Single(mainCart);
        Assert.Equal("Хлеб", mainCart[0].Title);
    }

    [Fact]
    public async Task AssignProduct_TogglesBetweenTakenAndPending()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        var addRes = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Чай",
            Count = 1
        });
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();

        // 1. Первое нажатие -> Взят Alice
        var assign1 = await clientA.PostAsync($"/api/cart/{item!.Id}/assign", null);
        Assert.Equal(HttpStatusCode.OK, assign1.StatusCode);
        var res1 = await assign1.Content.ReadFromJsonAsync<CartActionResponse>();
        Assert.True(res1!.Success);
        Assert.Equal("Taken", res1.Item!.Status);
        Assert.NotNull(res1.Item.AssignedToUserId);

        // 2. Второе нажатие Alice -> Снимает выбор (Pending)
        var assign2 = await clientA.PostAsync($"/api/cart/{item.Id}/assign", null);
        Assert.Equal(HttpStatusCode.OK, assign2.StatusCode);
        var res2 = await assign2.Content.ReadFromJsonAsync<CartActionResponse>();
        Assert.True(res2!.Success);
        Assert.Equal("Pending", res2.Item!.Status);
        Assert.Null(res2.Item.AssignedToUserId);

        // 3. Теперь Bob нажимает -> Взят Bob
        var assign3 = await clientB.PostAsync($"/api/cart/{item.Id}/assign", null);
        Assert.Equal(HttpStatusCode.OK, assign3.StatusCode);
        var res3 = await assign3.Content.ReadFromJsonAsync<CartActionResponse>();
        Assert.True(res3!.Success);
        Assert.Equal("Taken", res3.Item!.Status);

        // 4. Alice пытается перехватить -> Ошибка (заблокирован)
        var assign4 = await clientA.PostAsync($"/api/cart/{item.Id}/assign", null);
        Assert.Equal(HttpStatusCode.BadRequest, assign4.StatusCode);
    }

    [Fact]
    public async Task CrossFamilyAccess_IsBlocked()
    {
        var (clientA, _) = await CreateAuthenticatedUserAsync("AliceCross");
        var famResA = await clientA.PostAsJsonAsync("/api/family/create", new CreateFamilyRequest { Name = "Family A" });
        var famA = await famResA.Content.ReadFromJsonAsync<FamilyResponse>();

        var (clientB, _) = await CreateAuthenticatedUserAsync("BobCross");
        var famResB = await clientB.PostAsJsonAsync("/api/family/create", new CreateFamilyRequest { Name = "Family B" });
        var famB = await famResB.Content.ReadFromJsonAsync<FamilyResponse>();

        // Bob добавляет товар в свою семью B
        var addResB = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = famB!.FamilyId,
            Title = "Секретный сыр Боба",
            Count = 1
        });
        var itemB = await addResB.Content.ReadFromJsonAsync<CartItemDto>();

        // Alice пытается добавить товар в чужую семью B -> 400 Bad Request
        var illegalAdd = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = famB.FamilyId,
            Title = "Шпионский товар",
            Count = 1
        });
        Assert.Equal(HttpStatusCode.BadRequest, illegalAdd.StatusCode);

        // Alice пытается изменить товар Боба -> 403 Forbidden
        var illegalPut = await clientA.PutAsJsonAsync($"/api/cart/items/{itemB!.Id}", new UpdateCartItemRequest { Count = 5 });
        Assert.Equal(HttpStatusCode.Forbidden, illegalPut.StatusCode);

        // Alice пытается взять товар Боба -> 403 Forbidden
        var illegalTake = await clientA.PostAsync($"/api/cart/{itemB.Id}/take", null);
        Assert.Equal(HttpStatusCode.Forbidden, illegalTake.StatusCode);

        // Alice пытается удалить товар Боба -> 403 Forbidden
        var illegalDelete = await clientA.DeleteAsync($"/api/cart/items/{itemB.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, illegalDelete.StatusCode);
    }

    [Fact]
    public async Task CartItem_OperationByProductId_Works()
    {
        var (client, _, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. Получаем системный товар (Яблоки) из каталога
        var catRes = await client.GetAsync("/api/products");
        var products = await catRes.Content.ReadFromJsonAsync<List<ProductDto>>();
        var apple = products!.First(p => p.Title == "Яблоки");

        // 2. Добавляем в корзину только по ProductId (без передачи title)
        var addRes = await client.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            ProductId = apple.Id,
            Count = 2
        });
        Assert.Equal(HttpStatusCode.Created, addRes.StatusCode);
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(item);
        Assert.Equal("Яблоки", item.Title);
        Assert.Equal(2, item.Count);

        // 3. Уменьшаем количество на 1 через /decrement по ProductId
        var decRes = await client.PostAsync($"/api/cart/items/{apple.Id}/decrement", null);
        Assert.Equal(HttpStatusCode.OK, decRes.StatusCode);
        var decItem = await decRes.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.Equal(1, decItem!.Count);

        // 4. Удаляем товар по ProductId
        var delRes = await client.DeleteAsync($"/api/cart/items/{apple.Id}");
        Assert.Equal(HttpStatusCode.OK, delRes.StatusCode);

        var listRes = await client.GetAsync($"/api/cart?familyId={familyId}");
        var list = await listRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.Empty(list!);
    }

    [Fact]
    public async Task AddingItem_WhenItemIsBought_CreatesNewItemInsteadOfUpdatingBoughtItem()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. Alice добавляет 8 яблок
        var addRes1 = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Яблоки сезонные",
            Unit = "1 кг",
            Count = 8
        });
        Assert.Equal(HttpStatusCode.Created, addRes1.StatusCode);
        var item1 = await addRes1.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(item1);
        Assert.Equal(8, item1.Count);

        // 2. Alice берет и отмечает «Куплено»
        await clientA.PostAsync($"/api/cart/{item1.Id}/take", null);
        var boughtRes = await clientA.PostAsync($"/api/cart/{item1.Id}/toggle-purchased", null);
        Assert.Equal(HttpStatusCode.OK, boughtRes.StatusCode);
        var boughtItem = (await boughtRes.Content.ReadFromJsonAsync<CartActionResponse>())?.Item;
        Assert.NotNull(boughtItem);
        Assert.True(boughtItem.IsBought);
        Assert.Equal(8, boughtItem.Count);

        // 3. Bob добавляет такие же яблоки (1 шт)
        var addRes2 = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Яблоки сезонные",
            Unit = "1 кг",
            Count = 1
        });
        Assert.Equal(HttpStatusCode.Created, addRes2.StatusCode);
        var item2 = await addRes2.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(item2);
        Assert.NotEqual(item1.Id, item2.Id); // Должен быть создан отдельный пункт!
        Assert.Equal(1, item2.Count);
        Assert.False(item2.IsBought);

        // 4. Проверяем, что в корзине 2 отдельных пункта
        var listRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var allItems = await listRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(allItems);
        Assert.Equal(2, allItems.Count);

        var boughtCheck = allItems.First(i => i.Id == item1.Id);
        Assert.Equal(8, boughtCheck.Count);
        Assert.True(boughtCheck.IsBought);

        var unboughtCheck = allItems.First(i => i.Id == item2.Id);
        Assert.Equal(1, unboughtCheck.Count);
        Assert.False(unboughtCheck.IsBought);
    }

    [Fact]
    public async Task CompletedEvent_BlocksAddingAndUpdatingItems()
    {
        var (client, _, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. Создаем мероприятие
        var evRes = await client.PostAsJsonAsync("/api/events", new CreateEventRequest
        {
            FamilyId = familyId,
            Title = "Пикник",
            EventDate = "15 июня",
            HasCart = true
        });
        var ev = await evRes.Content.ReadFromJsonAsync<EventDto>();
        Assert.NotNull(ev);

        // 2. Добавляем товар в мероприятие до завершения
        var addRes = await client.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            EventId = ev.Id,
            Title = "Сок апельсиновый",
            Unit = "1 л",
            Count = 2
        });
        Assert.Equal(HttpStatusCode.Created, addRes.StatusCode);
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(item);

        // 3. Завершаем мероприятие
        var compRes = await client.PostAsync($"/api/events/{ev.Id}/complete", null);
        Assert.Equal(HttpStatusCode.OK, compRes.StatusCode);

        // 4. Попытка добавить товар в завершенное мероприятие должна вернуть 400 BadRequest
        var addBlocked = await client.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            EventId = ev.Id,
            Title = "Печенье",
            Count = 1
        });
        Assert.Equal(HttpStatusCode.BadRequest, addBlocked.StatusCode);

        // 5. Попытка изменить товар должна вернуть 400 BadRequest
        var updateBlocked = await client.PutAsJsonAsync($"/api/cart/items/{item.Id}", new UpdateCartItemRequest { Count = 5 });
        Assert.Equal(HttpStatusCode.BadRequest, updateBlocked.StatusCode);

        // 6. Попытка уменьшить товар должна вернуть 400 BadRequest
        var decBlocked = await client.PostAsync($"/api/cart/items/{item.Id}/decrement", null);
        Assert.Equal(HttpStatusCode.BadRequest, decBlocked.StatusCode);

        // 7. Попытка удалить товар должна вернуть 400 BadRequest
        var delBlocked = await client.DeleteAsync($"/api/cart/items/{item.Id}");
        Assert.Equal(HttpStatusCode.BadRequest, delBlocked.StatusCode);

        // 8. Попытка назначить товар в завершенном мероприятии должна вернуть 400 BadRequest
        var assignBlocked = await client.PostAsync($"/api/cart/{item.Id}/assign", null);
        Assert.Equal(HttpStatusCode.BadRequest, assignBlocked.StatusCode);

        // 9. Попытка взять товар должна вернуть 400 BadRequest
        var takeBlocked = await client.PostAsync($"/api/cart/{item.Id}/take", null);
        Assert.Equal(HttpStatusCode.BadRequest, takeBlocked.StatusCode);

        // 10. Попытка отметить купленным должна вернуть 400 BadRequest
        var toggleBlocked = await client.PostAsync($"/api/cart/{item.Id}/toggle-purchased", null);
        Assert.Equal(HttpStatusCode.BadRequest, toggleBlocked.StatusCode);
    }

    [Fact]
    public async Task AddingItem_WhenItemTakenByAnotherUser_CreatesNewItemInsteadOfUpdatingOtherUserItem()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. Alice добавляет молоко 2 шт и берет себе («Куплю я»)
        var addRes1 = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Молоко 3.2%",
            Unit = "930 мл",
            Count = 2
        });
        var item1 = await addRes1.Content.ReadFromJsonAsync<CartItemDto>();
        await clientA.PostAsync($"/api/cart/{item1!.Id}/take", null);

        // 2. Bob добавляет такое же молоко (1 шт)
        var addRes2 = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Молоко 3.2%",
            Unit = "930 мл",
            Count = 1
        });
        Assert.Equal(HttpStatusCode.Created, addRes2.StatusCode);
        var item2 = await addRes2.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(item2);

        // Должен быть создан отдельный пункт для Боба, чтобы товар Алисы не увеличивался
        Assert.NotEqual(item1.Id, item2.Id);
        Assert.Equal(1, item2.Count);
        Assert.Null(item2.AssignedToUserId);

        // Проверяем список
        var listRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var items = await listRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.Equal(2, items!.Count);

        var aliceItem = items.First(i => i.Id == item1.Id);
        Assert.Equal(2, aliceItem.Count);
        Assert.NotNull(aliceItem.AssignedToUserId);

        var bobItem = items.First(i => i.Id == item2.Id);
        Assert.Equal(1, bobItem.Count);
        Assert.Null(bobItem.AssignedToUserId);
    }

    [Fact]
    public async Task OperationByProductId_PrefersUnboughtItemOverBoughtItem()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        var catRes = await clientA.GetAsync("/api/products");
        var products = await catRes.Content.ReadFromJsonAsync<List<ProductDto>>();
        var apple = products!.First(p => p.Title == "Яблоки");

        // 1. Alice добавляет яблоки (8 шт) и отмечает купленными
        var addRes1 = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            ProductId = apple.Id,
            Count = 8
        });
        var item1 = await addRes1.Content.ReadFromJsonAsync<CartItemDto>();
        await clientA.PostAsync($"/api/cart/{item1!.Id}/take", null);
        await clientA.PostAsync($"/api/cart/{item1.Id}/toggle-purchased", null);

        // 2. Bob добавляет такие же яблоки (1 шт)
        var addRes2 = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            ProductId = apple.Id,
            Count = 1
        });
        var item2 = await addRes2.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotEqual(item1.Id, item2!.Id);

        // 3. Вызываем /decrement по ProductId (apple.Id)
        // Должен уменьшиться и удалиться НЕКУПЛЕННЫЙ товар (item2), а купленный (item1) остаться нетронутым!
        var decRes = await clientB.PostAsync($"/api/cart/items/{apple.Id}/decrement", null);
        Assert.Equal(HttpStatusCode.OK, decRes.StatusCode);

        var listRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var items = await listRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.Single(items!);

        var remainingItem = items![0];
        Assert.Equal(item1.Id, remainingItem.Id);
        Assert.Equal(8, remainingItem.Count);
        Assert.True(remainingItem.IsBought);
    }

    [Fact]
    public async Task DecrementByProductIdOrSlug_WhenOnlyBoughtItemExists_DoesNotTouchBoughtItem()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. Alice добавляет 8 яблок и отмечает купленными
        var addRes = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Яблоки",
            Count = 8
        });
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();
        await clientA.PostAsync($"/api/cart/{item!.Id}/take", null);
        await clientA.PostAsync($"/api/cart/{item.Id}/toggle-purchased", null);

        // 2. Попытка уменьшить по строковому идентификатору "prod-apple"
        // Поскольку товар уже куплен, unbought не найден -> возвращает 404, а купленный товар НЕ уменьшается!
        var decRes = await clientB.PostAsync("/api/cart/items/prod-apple/decrement", null);
        Assert.Equal(HttpStatusCode.NotFound, decRes.StatusCode);

        // Проверяем, что 8 купленных яблок на месте
        var listRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var items = await listRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.Single(items!);
        Assert.Equal(8, items[0].Count);
        Assert.True(items[0].IsBought);
    }

    [Fact]
    public async Task DecrementByCatalogSlug_WhenUnboughtExists_DecrementsUnboughtItem()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. Alice покупает 8 яблок
        var addRes1 = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Яблоки",
            Count = 8
        });
        var item1 = await addRes1.Content.ReadFromJsonAsync<CartItemDto>();
        await clientA.PostAsync($"/api/cart/{item1!.Id}/take", null);
        await clientA.PostAsync($"/api/cart/{item1.Id}/toggle-purchased", null);

        // 2. Bob добавляет 2 яблока (некупленные)
        var addRes2 = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Яблоки",
            Count = 2
        });
        var item2 = await addRes2.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotEqual(item1.Id, item2!.Id);

        // 3. Уменьшаем через "prod-apple"
        var decRes = await clientB.PostAsync("/api/cart/items/prod-apple/decrement", null);
        Assert.Equal(HttpStatusCode.OK, decRes.StatusCode);

        // 4. Проверяем: некупленный уменьшился с 2 до 1, купленный остался 8
        var listRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var items = await listRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.Equal(2, items!.Count);

        var bought = items.First(i => i.Id == item1.Id);
        Assert.Equal(8, bought.Count);
        Assert.True(bought.IsBought);

        var unbought = items.First(i => i.Id == item2.Id);
        Assert.Equal(1, unbought.Count);
        Assert.False(unbought.IsBought);
    }

    [Fact]
    public async Task Cart_UserOwnership_IsolatesAddedCounts()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. User 1 (Alice) adds 4 mayonnaise
        var addResA = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Майонез",
            Count = 4
        });
        Assert.Equal(HttpStatusCode.Created, addResA.StatusCode);
        var itemA = await addResA.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(itemA);
        Assert.Equal(4, itemA.Count);

        // 2. User 2 (Bob) adds 2 mayonnaise
        var addResB = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Майонез",
            Count = 2
        });
        Assert.Equal(HttpStatusCode.Created, addResB.StatusCode);
        var itemB = await addResB.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(itemB);
        Assert.Equal(2, itemB.Count);

        // 3. Both items exist in cart with their respective owners, sum is 6
        var listRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var items = await listRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(items);
        Assert.Equal(2, items.Count);
        Assert.Equal(6, items.Sum(i => i.Count));

        // 4. Bob decrements mayonnaise via slug/title -> Bob's 2 should decrease to 1, Alice's 4 untouched
        var decRes1 = await clientB.PostAsync("/api/cart/items/prod-mayo/decrement", null);
        Assert.Equal(HttpStatusCode.OK, decRes1.StatusCode);

        var listResAfter1 = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var itemsAfter1 = await listResAfter1.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(itemsAfter1);
        Assert.Equal(5, itemsAfter1.Sum(i => i.Count));
        Assert.Equal(4, itemsAfter1.First(i => i.Id == itemA.Id).Count);
        Assert.Equal(1, itemsAfter1.First(i => i.Id == itemB.Id).Count);

        // 5. Bob decrements again -> Bob's 1 reaches 0 and is removed
        var decRes2 = await clientB.PostAsync("/api/cart/items/prod-mayo/decrement", null);
        Assert.Equal(HttpStatusCode.OK, decRes2.StatusCode);

        var listResAfter2 = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var itemsAfter2 = await listResAfter2.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(itemsAfter2);
        Assert.Single(itemsAfter2);
        Assert.Equal(4, itemsAfter2[0].Count);
        Assert.Equal(itemA.Id, itemsAfter2[0].Id);

        // 6. Bob tries to decrement Alice's item directly by ID -> FORBIDDEN / BAD REQUEST
        var decResAlice = await clientB.PostAsync($"/api/cart/items/{itemA.Id}/decrement", null);
        Assert.Equal(HttpStatusCode.BadRequest, decResAlice.StatusCode);

        // 7. Bob tries to delete Alice's item directly -> FORBIDDEN / BAD REQUEST
        var delResAlice = await clientB.DeleteAsync($"/api/cart/items/{itemA.Id}");
        Assert.Equal(HttpStatusCode.BadRequest, delResAlice.StatusCode);

        // 8. Alice's 4 items are completely intact!
        var finalListRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var finalItems = await finalListRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.Single(finalItems!);
        Assert.Equal(4, finalItems![0].Count);
    }

    [Fact]
    public async Task Cart_DeleteOwnShare_LeavesOtherUserShareIntact()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. User 1 (Alice) adds 4 mayonnaise
        var addResA = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Майонез",
            Count = 4
        });
        var itemA = await addResA.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(itemA);

        // 2. User 2 (Bob) adds 2 mayonnaise
        var addResB = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Майонез",
            Count = 2
        });
        var itemB = await addResB.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(itemB);

        // 3. Total count in cart is 6
        var listRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var items = await listRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(items);
        Assert.Equal(6, items.Sum(i => i.Count));

        // 4. Bob deletes his own item directly (red trash button on Bob's client)
        var delResB = await clientB.DeleteAsync($"/api/cart/items/{itemB.Id}");
        Assert.Equal(HttpStatusCode.OK, delResB.StatusCode);

        // 5. Alice's 4 mayonnaise remain in the cart intact, total count is now 4!
        var afterDelRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var afterDelItems = await afterDelRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(afterDelItems);
        var remaining = Assert.Single(afterDelItems);
        Assert.Equal(itemA.Id, remaining.Id);
        Assert.Equal(4, remaining.Count);
    }

    [Fact]
    public async Task Cart_AssignProduct_ItemTakenByExMember_AllowsRemainingMemberToClaim()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. User A adds an item
        var addRes = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Сметана",
            Count = 1
        });
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(item);

        // 2. User B takes the item
        var takeResB = await clientB.PostAsync($"/api/cart/{item.Id}/take", null);
        Assert.Equal(HttpStatusCode.OK, takeResB.StatusCode);

        // 3. User B leaves family
        var leaveRes = await clientB.PostAsync($"/api/family/{familyId}/leave", null);
        Assert.Equal(HttpStatusCode.OK, leaveRes.StatusCode);

        // 4. User A assigns product to self -> must succeed
        var assignResA = await clientA.PostAsync($"/api/cart/{item.Id}/assign", null);
        Assert.Equal(HttpStatusCode.OK, assignResA.StatusCode);
        var assignResult = await assignResA.Content.ReadFromJsonAsync<CartActionResponse>();
        Assert.NotNull(assignResult?.Item);
        Assert.Equal("Taken", assignResult.Item.Status);
    }

    [Fact]
    public async Task Auth_UpdatePushToken_Succeeds()
    {
        var (client, _) = await CreateAuthenticatedUserAsync("PushUser");

        var pushRes = await client.PostAsJsonAsync("/api/auth/push-token", new UpdatePushTokenRequest
        {
            PushToken = "ExponentPushToken[TestToken123456789]"
        });
        Assert.Equal(HttpStatusCode.OK, pushRes.StatusCode);
    }

    [Fact]
    public async Task PushNotification_ItemAddedAndRemoved_DispatchesExpectedPushes()
    {
        _factory.PushService.Calls.Clear();

        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. Assign push tokens to both users
        await clientA.PostAsJsonAsync("/api/auth/push-token", new UpdatePushTokenRequest
        {
            PushToken = "ExponentPushToken[AliceToken123]"
        });
        await clientB.PostAsJsonAsync("/api/auth/push-token", new UpdatePushTokenRequest
        {
            PushToken = "ExponentPushToken[BobToken456]"
        });

        _factory.PushService.Calls.Clear();

        // 2. Alice adds a product to the cart
        var addRes = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Сыр Гауда",
            Count = 1
        });
        Assert.Equal(HttpStatusCode.Created, addRes.StatusCode);
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(item);

        // Bob must receive push notification about added product
        var addedPush = _factory.PushService.Calls.FirstOrDefault(c => c.Tokens.Contains("ExponentPushToken[BobToken456]"));
        Assert.NotNull(addedPush);
        Assert.Contains("В корзину добавлен новый товар: Сыр Гауда", addedPush.Body);

        _factory.PushService.Calls.Clear();

        // 3. Bob marks "Куплю я" on this item
        var takeRes = await clientB.PostAsync($"/api/cart/{item.Id}/take", null);
        Assert.Equal(HttpStatusCode.OK, takeRes.StatusCode);

        // 4. Alice (the owner who added it) deletes the item from cart
        var delRes = await clientA.DeleteAsync($"/api/cart/items/{item.Id}");
        Assert.Equal(HttpStatusCode.OK, delRes.StatusCode);

        // Bob MUST receive notification: "Товар [Название], который вы собирались купить, был убран из корзины"
        var removedPush = _factory.PushService.Calls.FirstOrDefault(c => c.Tokens.Contains("ExponentPushToken[BobToken456]"));
        Assert.NotNull(removedPush);
        Assert.Contains("который вы собирались купить, был убран из корзины", removedPush.Body);
        Assert.Contains("Сыр Гауда", removedPush.Body);

        _factory.PushService.Calls.Clear();

        // 5. Bob adds an item himself and takes it
        var addResBob = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Кефир",
            Count = 1
        });
        var itemBob = await addResBob.Content.ReadFromJsonAsync<CartItemDto>();
        await clientB.PostAsync($"/api/cart/{itemBob!.Id}/take", null);

        _factory.PushService.Calls.Clear();

        // 6. Bob deletes his OWN item that he was going to buy -> Bob should NOT receive a push notification to himself!
        var delResBob = await clientB.DeleteAsync($"/api/cart/items/{itemBob.Id}");
        Assert.Equal(HttpStatusCode.OK, delResBob.StatusCode);

        var selfPush = _factory.PushService.Calls.FirstOrDefault(c => c.Tokens.Contains("ExponentPushToken[BobToken456]"));
        Assert.Null(selfPush);
    }

    [Fact]
    public async Task DiagnosticVersionEndpoint_ReturnsValidInfo()
    {
        var (client, _, _) = await SetupFamilyWithTwoUsersAsync();
        var res = await client.GetAsync("/api/version");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadAsStringAsync();
        Assert.Contains("ProductBasket.Api", json);
        Assert.Contains("sprint4-ownership-push-sync", json);
    }

    [Fact]
    public async Task Auth_TestPush_WhenTokenPresent_SendsTestNotification()
    {
        _factory.PushService.Calls.Clear();
        var (client, _) = await CreateAuthenticatedUserAsync("TestPushUser");

        await client.PostAsJsonAsync("/api/auth/push-token", new UpdatePushTokenRequest
        {
            PushToken = "ExponentPushToken[TestPushToken999]"
        });

        var testRes = await client.PostAsync("/api/auth/test-push", null);
        Assert.Equal(HttpStatusCode.OK, testRes.StatusCode);

        Assert.Single(_factory.PushService.Calls);
        Assert.Contains("ExponentPushToken[TestPushToken999]", _factory.PushService.Calls[0].Tokens);
        Assert.Equal("Проверка уведомлений", _factory.PushService.Calls[0].Title);
    }

    [Fact]
    public async Task WhenMemberLeaves_TheirItemsArePreserved_AndRemainingMemberCanManageThem()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. Bob adds an item and assigns it to himself
        var addRes = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Гречка",
            Count = 2
        });
        Assert.Equal(HttpStatusCode.Created, addRes.StatusCode);
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(item);

        var assignRes = await clientB.PostAsync($"/api/cart/{item.Id}/assign", null);
        Assert.Equal(HttpStatusCode.OK, assignRes.StatusCode);

        // 2. Bob leaves the family
        var leaveRes = await clientB.PostAsync($"/api/family/{familyId}/leave", null);
        Assert.Equal(HttpStatusCode.OK, leaveRes.StatusCode);

        // 3. Alice fetches the family cart -> item MUST still be there!
        var getRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var items = await getRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(items);
        var preservedItem = items.FirstOrDefault(i => i.Id == item.Id);
        Assert.NotNull(preservedItem);
        Assert.Equal("Гречка", preservedItem.Title);
        Assert.Equal(2, preservedItem.Count);
        Assert.Null(preservedItem.AssignedToUserId);
        Assert.Null(preservedItem.AddedByUserId);
        Assert.False(preservedItem.IsBought);

        // 4. Alice can assign this item to herself
        var takeRes = await clientA.PostAsync($"/api/cart/{preservedItem.Id}/assign", null);
        Assert.Equal(HttpStatusCode.OK, takeRes.StatusCode);

        // 5. Alice can decrement the item
        var decRes = await clientA.PostAsync($"/api/cart/items/{preservedItem.Id}/decrement", null);
        Assert.Equal(HttpStatusCode.OK, decRes.StatusCode);

        // 6. Alice can delete the item
        var delRes = await clientA.DeleteAsync($"/api/cart/items/{preservedItem.Id}");
        Assert.Equal(HttpStatusCode.OK, delRes.StatusCode);

        // 7. Verify cart is now empty
        var finalRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var finalItems = await finalRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(finalItems);
        Assert.Empty(finalItems);
    }

    [Fact]
    public async Task WhenMemberLeaves_RemainingMemberAddingSameItem_AdoptsAuthorlessItemWithoutDuplication()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. Bob adds "Овсянка" (count = 1)
        var addBob = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Овсянка",
            Count = 1
        });
        Assert.Equal(HttpStatusCode.Created, addBob.StatusCode);
        var bobItem = await addBob.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(bobItem);

        // 2. Bob leaves the family
        var leaveRes = await clientB.PostAsync($"/api/family/{familyId}/leave", null);
        Assert.Equal(HttpStatusCode.OK, leaveRes.StatusCode);

        // 3. Alice adds "Овсянка" (count = 1) -> must adopt the authorless item instead of duplicating it
        var addAlice = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Овсянка",
            Count = 1
        });
        Assert.Equal(HttpStatusCode.OK, addAlice.StatusCode);
        var adopted = await addAlice.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(adopted);
        Assert.Equal(bobItem.Id, adopted.Id);
        Assert.Equal(2, adopted.Count);

        // 4. Cart has exactly 1 item
        var cartRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var items = await cartRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(items);
        Assert.Single(items);
        Assert.Equal(2, items[0].Count);

        // 5. Alice decrements item
        var decRes = await clientA.PostAsync($"/api/cart/items/{adopted.Id}/decrement", null);
        Assert.Equal(HttpStatusCode.OK, decRes.StatusCode);

        // 6. Alice deletes item
        var delRes = await clientA.DeleteAsync($"/api/cart/items/{adopted.Id}");
        Assert.Equal(HttpStatusCode.OK, delRes.StatusCode);
    }

    [Fact]
    public async Task Cart_TwoMembers_AddSameItem_Isolation_DecrementAndDeleteOnlyAffectsOwnShare()
    {
        var (clientA, clientB, familyId) = await SetupFamilyWithTwoUsersAsync();

        // 1. Alice adds "Бананы" (1)
        var addA = await clientA.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Бананы",
            Count = 1
        });
        Assert.Equal(HttpStatusCode.Created, addA.StatusCode);
        var itemA = await addA.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(itemA);

        // 2. Bob adds "Бананы" (1) -> separate item for Bob
        var addB = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Бананы",
            Count = 1
        });
        Assert.Equal(HttpStatusCode.Created, addB.StatusCode);
        var itemB = await addB.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(itemB);
        Assert.NotEqual(itemA.Id, itemB.Id);

        // 3. Bob adds another "Бананы" -> Bob's count becomes 2
        var addB2 = await clientB.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = familyId,
            Title = "Бананы",
            Count = 1
        });
        Assert.Equal(HttpStatusCode.OK, addB2.StatusCode);
        var itemB2 = await addB2.Content.ReadFromJsonAsync<CartItemDto>();
        Assert.NotNull(itemB2);
        Assert.Equal(itemB.Id, itemB2.Id);
        Assert.Equal(2, itemB2.Count);

        // 4. Bob decrements -> Bob's count becomes 1, Alice's item is untouched
        var decB = await clientB.PostAsync($"/api/cart/items/{itemB.Id}/decrement", null);
        Assert.Equal(HttpStatusCode.OK, decB.StatusCode);

        // 5. Bob deletes his item
        var delB = await clientB.DeleteAsync($"/api/cart/items/{itemB.Id}");
        Assert.Equal(HttpStatusCode.OK, delB.StatusCode);

        // 6. Alice's item is still present in the family cart
        var getRes = await clientA.GetAsync($"/api/cart?familyId={familyId}");
        var items = await getRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(items);
        Assert.Single(items);
        Assert.Equal(itemA.Id, items[0].Id);
        Assert.Equal(1, items[0].Count);

        // 7. Bob attempts to delete Alice's item -> forbidden (BadRequest)
        var delAByBob = await clientB.DeleteAsync($"/api/cart/items/{itemA.Id}");
        Assert.Equal(HttpStatusCode.BadRequest, delAByBob.StatusCode);
    }
}
