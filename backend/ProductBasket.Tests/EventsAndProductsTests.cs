using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ProductBasket.Api.Dtos;
using Xunit;

namespace ProductBasket.Tests;

public class EventsAndProductsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public EventsAndProductsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient Client, AuthResponse Auth, Guid FamilyId)> SetupUserWithFamilyAsync(string name)
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

        var famRes = await client.PostAsJsonAsync("/api/family/create", new CreateFamilyRequest { Name = $"{name} Family" });
        var family = await famRes.Content.ReadFromJsonAsync<FamilyResponse>();

        return (client, auth, family!.FamilyId);
    }

    [Fact]
    public async Task Event_FullLifecycle_Succeeds()
    {
        var (client, _, familyId) = await SetupUserWithFamilyAsync("EvUser");

        // 1. Создание
        var createRes = await client.PostAsJsonAsync("/api/events", new CreateEventRequest
        {
            FamilyId = familyId,
            Title = "День рождения Дениса",
            EventDate = "25 мая",
            Icon = "🎂"
        });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var ev = await createRes.Content.ReadFromJsonAsync<EventDto>();
        Assert.NotNull(ev);
        Assert.Equal("День рождения Дениса", ev.Title);
        Assert.False(ev.HasCart);
        Assert.False(ev.IsCompleted);

        // 2. Переименование мероприятия
        var renameRes = await client.PutAsJsonAsync($"/api/events/{ev.Id}/title", new UpdateEventTitleRequest
        {
            Title = "Юбилей Дениса"
        });
        Assert.Equal(HttpStatusCode.OK, renameRes.StatusCode);
        var renamedEv = await renameRes.Content.ReadFromJsonAsync<EventDto>();
        Assert.NotNull(renamedEv);
        Assert.Equal("Юбилей Дениса", renamedEv.Title);

        // 3. Создание корзины мероприятия
        var cartRes = await client.PostAsync($"/api/events/{ev.Id}/cart", null);
        Assert.Equal(HttpStatusCode.OK, cartRes.StatusCode);

        // 4. Завершение мероприятия
        var completeRes = await client.PostAsync($"/api/events/{ev.Id}/complete", null);
        Assert.Equal(HttpStatusCode.OK, completeRes.StatusCode);

        // 5. Возобновление мероприятия
        var reopenRes = await client.PostAsync($"/api/events/{ev.Id}/reopen", null);
        Assert.Equal(HttpStatusCode.OK, reopenRes.StatusCode);

        // 6. Удаление мероприятия
        var deleteRes = await client.DeleteAsync($"/api/events/{ev.Id}");
        Assert.Equal(HttpStatusCode.OK, deleteRes.StatusCode);

        // Проверяем, что в списке больше нет этого события
        var listRes = await client.GetAsync($"/api/events?familyId={familyId}");
        var events = await listRes.Content.ReadFromJsonAsync<List<EventDto>>();
        Assert.NotNull(events);
        Assert.DoesNotContain(events, e => e.Id == ev.Id);
    }

    [Fact]
    public async Task Products_CatalogAndCustomProducts_WorksCorrectly()
    {
        var (client, _, familyId) = await SetupUserWithFamilyAsync("ProdUser");

        // 1. Получение каталога (базовые товары)
        var catalogRes = await client.GetAsync("/api/products");
        Assert.Equal(HttpStatusCode.OK, catalogRes.StatusCode);
        var products = await catalogRes.Content.ReadFromJsonAsync<List<ProductDto>>();
        Assert.NotNull(products);
        Assert.NotEmpty(products);
        Assert.Contains(products, p => p.Title == "Молоко");

        // 2. Создание пользовательского товара для семьи
        var customRes = await client.PostAsJsonAsync("/api/products/custom", new CreateCustomProductRequest
        {
            FamilyId = familyId,
            Title = "Домашние пельмени",
            Unit = "800 г",
            Emoji = "🥟"
        });
        Assert.Equal(HttpStatusCode.Created, customRes.StatusCode);
        var custom = await customRes.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(custom);
        Assert.True(custom.IsCustom);
        Assert.Equal("Домашние пельмени", custom.Title);

        // 3. Проверка, что товар появился в общем списке
        var listRes = await client.GetAsync($"/api/products?familyId={familyId}");
        var updatedList = await listRes.Content.ReadFromJsonAsync<List<ProductDto>>();
        Assert.NotNull(updatedList);
        Assert.Contains(updatedList, p => p.Id == custom.Id);

        // 4. Удаление пользовательского товара
        var delRes = await client.DeleteAsync($"/api/products/custom/{custom.Id}");
        Assert.Equal(HttpStatusCode.OK, delRes.StatusCode);

        // 5. Попытка удалить системный товар должна вернуть ошибку
        var sysProd = products.First(p => !p.IsCustom);
        var sysDelRes = await client.DeleteAsync($"/api/products/custom/{sysProd.Id}");
        Assert.Equal(HttpStatusCode.BadRequest, sysDelRes.StatusCode);
    }

    [Fact]
    public async Task Events_MultiFamilyVisibility_And_CrossFamilyIsolation()
    {
        // 1. Создаем пользователя Ивана с двумя семьями: Home и Dorm
        var client = _factory.CreateClient();
        var email = $"ivan_{Guid.NewGuid()}@example.com";
        var res = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            DisplayName = "Иван Multi",
            Email = email,
            Password = "Password123!"
        });
        var auth = await res.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        var famHomeRes = await client.PostAsJsonAsync("/api/family/create", new CreateFamilyRequest { Name = "Группа Смирновых" });
        var famHome = await famHomeRes.Content.ReadFromJsonAsync<FamilyResponse>();

        var famDormRes = await client.PostAsJsonAsync("/api/family/create", new CreateFamilyRequest { Name = "Общежитие 304" });
        var famDorm = await famDormRes.Content.ReadFromJsonAsync<FamilyResponse>();

        // 2. Создаем событие в Home и событие в Dorm
        var evHomeRes = await client.PostAsJsonAsync("/api/events", new CreateEventRequest
        {
            FamilyId = famHome!.FamilyId,
            Title = "Пикник на природе",
            EventDate = "18 мая",
            Icon = "🏕️"
        });
        Assert.Equal(HttpStatusCode.Created, evHomeRes.StatusCode);

        var evDormRes = await client.PostAsJsonAsync("/api/events", new CreateEventRequest
        {
            FamilyId = famDorm!.FamilyId,
            Title = "Студенческий хакатон",
            EventDate = "10 мая",
            Icon = "💻"
        });
        Assert.Equal(HttpStatusCode.Created, evDormRes.StatusCode);

        // 3. Иван вызывает GET /api/events без параметра -> ДОЛЖЕН видеть оба мероприятия!
        var allEventsRes = await client.GetAsync("/api/events");
        var allEvents = await allEventsRes.Content.ReadFromJsonAsync<List<EventDto>>();
        Assert.NotNull(allEvents);
        Assert.Contains(allEvents, e => e.Title == "Пикник на природе");
        Assert.Contains(allEvents, e => e.Title == "Студенческий хакатон");

        // 4. Фильтр по группе Home -> видит только Пикник
        var homeEventsRes = await client.GetAsync($"/api/events?familyId={famHome.FamilyId}");
        var homeEvents = await homeEventsRes.Content.ReadFromJsonAsync<List<EventDto>>();
        Assert.NotNull(homeEvents);
        Assert.Single(homeEvents);
        Assert.Equal("Пикник на природе", homeEvents[0].Title);

        // 5. Сторонний пользователь не может удалить чужое мероприятие
        var otherClient = _factory.CreateClient();
        var otherReg = await otherClient.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            DisplayName = "Чужак",
            Email = $"stranger_{Guid.NewGuid()}@example.com",
            Password = "Password123!"
        });
        var otherAuth = await otherReg.Content.ReadFromJsonAsync<AuthResponse>();
        otherClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherAuth!.Token);

        var ev = await evHomeRes.Content.ReadFromJsonAsync<EventDto>();
        var illegalDel = await otherClient.DeleteAsync($"/api/events/{ev!.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, illegalDel.StatusCode);
    }

    [Fact]
    public async Task Events_UpdateTitle_ValidatesAndEnforcesFamilyMembership()
    {
        var (ownerClient, _, familyId) = await SetupUserWithFamilyAsync("RenameOwner");
        var (strangerClient, _, _) = await SetupUserWithFamilyAsync("RenameStranger");

        var createRes = await ownerClient.PostAsJsonAsync("/api/events", new CreateEventRequest
        {
            FamilyId = familyId,
            Title = "Старое название",
            EventDate = "20 декабря",
            Icon = "🎄"
        });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<EventDto>();
        Assert.NotNull(created);

        // 1. Пустое / пробельное название отклоняется (400 BadRequest)
        var emptyRes = await ownerClient.PutAsJsonAsync($"/api/events/{created.Id}/title", new UpdateEventTitleRequest
        {
            Title = "   "
        });
        Assert.Equal(HttpStatusCode.BadRequest, emptyRes.StatusCode);

        // 2. Сторонний пользователь не может переименовать чужое мероприятие (403 Forbidden)
        var forbiddenRes = await strangerClient.PutAsJsonAsync($"/api/events/{created.Id}/title", new UpdateEventTitleRequest
        {
            Title = "Взлом"
        });
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenRes.StatusCode);

        // 3. Несуществующее мероприятие возвращает 404 NotFound
        var notFoundRes = await ownerClient.PutAsJsonAsync($"/api/events/{Guid.NewGuid()}/title", new UpdateEventTitleRequest
        {
            Title = "Новое"
        });
        Assert.Equal(HttpStatusCode.NotFound, notFoundRes.StatusCode);

        // 4. Участник группы успешно переименовывает мероприятие, и изменение сохраняется в БД
        var okRes = await ownerClient.PutAsJsonAsync($"/api/events/{created.Id}/title", new UpdateEventTitleRequest
        {
            Title = "  Новогодний ужин  "
        });
        Assert.Equal(HttpStatusCode.OK, okRes.StatusCode);
        var updated = await okRes.Content.ReadFromJsonAsync<EventDto>();
        Assert.NotNull(updated);
        Assert.Equal("Новогодний ужин", updated.Title);

        var listRes = await ownerClient.GetAsync($"/api/events?familyId={familyId}");
        var list = await listRes.Content.ReadFromJsonAsync<List<EventDto>>();
        Assert.NotNull(list);
        Assert.Contains(list, e => e.Id == created.Id && e.Title == "Новогодний ужин");
    }
}
