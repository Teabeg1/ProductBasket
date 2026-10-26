using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ProductBasket.Api.Dtos;
using Xunit;

namespace ProductBasket.Tests;

public class AuthTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_ValidUser_ReturnsCreatedAndToken()
    {
        var email = $"test_reg_{Guid.NewGuid()}@example.com";
        var request = new RegisterRequest
        {
            DisplayName = "Иван Тестовый",
            Email = email,
            Password = "Password123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var data = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(data);
        Assert.False(string.IsNullOrEmpty(data.Token));
        Assert.Equal("Иван Тестовый", data.User.DisplayName);
        Assert.Equal(email.ToLower(), data.User.Email);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsBadRequest()
    {
        var email = $"dup_{Guid.NewGuid()}@example.com";
        var request = new RegisterRequest
        {
            DisplayName = "User1",
            Email = email,
            Password = "Password123!"
        };

        var res1 = await _client.PostAsJsonAsync("/api/auth/register", request);
        Assert.Equal(HttpStatusCode.Created, res1.StatusCode);

        var res2 = await _client.PostAsJsonAsync("/api/auth/register", request);
        Assert.Equal(HttpStatusCode.BadRequest, res2.StatusCode);
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsOkAndToken()
    {
        var email = $"login_{Guid.NewGuid()}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            DisplayName = "User Login",
            Email = email,
            Password = "SecretPassword123"
        });

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "SecretPassword123"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var data = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(data);
        Assert.NotEmpty(data.Token);
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        var email = $"wrong_pwd_{Guid.NewGuid()}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            DisplayName = "User Wrong",
            Email = email,
            Password = "CorrectPassword123"
        });

        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "WrongPassword999"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_AndLoginWithNewPassword_Succeeds()
    {
        var email = $"change_pwd_{Guid.NewGuid()}@example.com";
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            DisplayName = "User ChangePwd",
            Email = email,
            Password = "OldPassword123"
        });
        var auth = await regRes.Content.ReadFromJsonAsync<AuthResponse>();

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        var changeRes = await client.PostAsJsonAsync("/api/auth/change-password", new ChangePasswordRequest
        {
            OldPassword = "OldPassword123",
            NewPassword = "NewPassword456"
        });
        Assert.Equal(HttpStatusCode.OK, changeRes.StatusCode);

        // Попытка войти со старым паролем должна провалиться
        var failLogin = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "OldPassword123"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, failLogin.StatusCode);

        // Вход с новым паролем успешен
        var okLogin = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "NewPassword456"
        });
        Assert.Equal(HttpStatusCode.OK, okLogin.StatusCode);
    }

    [Fact]
    public async Task UpdateProfile_UpdatesDisplayName()
    {
        var email = $"profile_{Guid.NewGuid()}@example.com";
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            DisplayName = "Старое Имя",
            Email = email,
            Password = "Password123!"
        });
        var auth = await regRes.Content.ReadFromJsonAsync<AuthResponse>();

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        var updateRes = await client.PutAsJsonAsync("/api/auth/profile", new UpdateProfileRequest
        {
            DisplayName = "Новое Крутое Имя"
        });
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updated = await updateRes.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(updated);
        Assert.Equal("Новое Крутое Имя", updated.DisplayName);
        Assert.Equal("Новое Крутое Имя", updated.Name);

        // Проверяем /api/auth/me
        var meRes = await client.GetAsync("/api/auth/me");
        var me = await meRes.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("Новое Крутое Имя", me!.DisplayName);
    }

    [Fact]
    public async Task ForgotPassword_And_ResetPassword_Works()
    {
        var email = $"forgot_{Guid.NewGuid()}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            DisplayName = "Forgot User",
            Email = email,
            Password = "InitialPassword123"
        });

        // 1. Запрос на восстановление пароля
        var forgotRes = await _client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest
        {
            Email = email
        });
        Assert.Equal(HttpStatusCode.OK, forgotRes.StatusCode);

        // 2. Сброс пароля
        var resetRes = await _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest
        {
            Email = email,
            Code = "123456",
            NewPassword = "BrandNewPassword999"
        });
        Assert.Equal(HttpStatusCode.OK, resetRes.StatusCode);

        // 3. Проверяем вход с новым паролем
        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "BrandNewPassword999"
        });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
    }
}
