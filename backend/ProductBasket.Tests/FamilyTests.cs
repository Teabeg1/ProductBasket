using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ProductBasket.Api.Dtos;
using Xunit;

namespace ProductBasket.Tests;

public class FamilyTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public FamilyTests(CustomWebApplicationFactory factory)
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

    [Fact]
    public async Task CreateFamily_Generates6CharCode_AndAdminMembership()
    {
        var (client, _) = await CreateAuthenticatedUserAsync("Ivan");

        var response = await client.PostAsJsonAsync("/api/family/create", new CreateFamilyRequest
        {
            Name = "Семья Ивановых"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var family = await response.Content.ReadFromJsonAsync<FamilyResponse>();
        Assert.NotNull(family);
        Assert.Equal("Семья Ивановых", family.Name);
        Assert.Equal(6, family.InviteCode.Length);
        Assert.Equal("Admin", family.Role);
    }

    [Fact]
    public async Task JoinFamily_ValidCode_AddsSecondUser()
    {
        var (creatorClient, _) = await CreateAuthenticatedUserAsync("Creator");
        var createRes = await creatorClient.PostAsJsonAsync("/api/family/create", new CreateFamilyRequest
        {
            Name = "Группа Друзей"
        });
        var family = await createRes.Content.ReadFromJsonAsync<FamilyResponse>();

        var (joinerClient, joinerAuth) = await CreateAuthenticatedUserAsync("Joiner");
        var joinRes = await joinerClient.PostAsJsonAsync("/api/family/join", new JoinFamilyRequest
        {
            InviteCode = family!.InviteCode
        });

        Assert.Equal(HttpStatusCode.OK, joinRes.StatusCode);
        var joined = await joinRes.Content.ReadFromJsonAsync<FamilyResponse>();
        Assert.NotNull(joined);
        Assert.Equal(family.FamilyId, joined.FamilyId);

        // Проверяем список участников
        var membersRes = await creatorClient.GetAsync($"/api/family/{family.FamilyId}/members");
        var members = await membersRes.Content.ReadFromJsonAsync<List<FamilyMemberDto>>();
        Assert.NotNull(members);
        Assert.Equal(2, members.Count);
        Assert.Contains(members, m => m.Id == joinerAuth.User.Id);
    }

    [Fact]
    public async Task JoinFamily_InvalidCode_ReturnsNotFound()
    {
        var (client, _) = await CreateAuthenticatedUserAsync("UserX");
        var response = await client.PostAsJsonAsync("/api/family/join", new JoinFamilyRequest
        {
            InviteCode = "NONEXISTENT"
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RemoveMember_PurgesAssignedProducts()
    {
        var (userAClient, userAAuth) = await CreateAuthenticatedUserAsync("UserA");
        var famRes = await userAClient.PostAsJsonAsync("/api/family/create", new CreateFamilyRequest { Name = "Fam" });
        var family = await famRes.Content.ReadFromJsonAsync<FamilyResponse>();

        var (userBClient, userBAuth) = await CreateAuthenticatedUserAsync("UserB");
        await userBClient.PostAsJsonAsync("/api/family/join", new JoinFamilyRequest { InviteCode = family!.InviteCode });

        // User B добавляет товар и берет его себе
        var addRes = await userBClient.PostAsJsonAsync("/api/cart/items", new AddToCartRequest
        {
            FamilyId = family.FamilyId,
            Title = "Печенье",
            Unit = "300 г"
        });
        var item = await addRes.Content.ReadFromJsonAsync<CartItemDto>();
        await userBClient.PostAsync($"/api/cart/{item!.Id}/take", null);

        // User A удаляет User B из группы (принцип равенства)
        var removeRes = await userAClient.DeleteAsync($"/api/family/{family.FamilyId}/members/{userBAuth.User.Id}");
        Assert.Equal(HttpStatusCode.OK, removeRes.StatusCode);

        // В корзине товары User B должны быть автоматически удалены
        var cartRes = await userAClient.GetAsync($"/api/cart?familyId={family.FamilyId}");
        var cartItems = await cartRes.Content.ReadFromJsonAsync<List<CartItemDto>>();
        Assert.NotNull(cartItems);
        Assert.DoesNotContain(cartItems, c => c.Id == item.Id);
    }

    [Fact]
    public async Task UpdateFamilyName_Succeeds()
    {
        var (client, _) = await CreateAuthenticatedUserAsync("UserRenamer");
        var famRes = await client.PostAsJsonAsync("/api/family/create", new CreateFamilyRequest { Name = "Старое имя" });
        var family = await famRes.Content.ReadFromJsonAsync<FamilyResponse>();

        var renRes = await client.PutAsJsonAsync($"/api/family/{family!.FamilyId}/name", new UpdateFamilyNameRequest
        {
            Name = "Новое супер имя"
        });
        Assert.Equal(HttpStatusCode.OK, renRes.StatusCode);
    }
}
