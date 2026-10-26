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
}
