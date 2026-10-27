using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ProductBasket.Api.Data;
using ProductBasket.Api.Hubs;
using ProductBasket.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Поддержка порта от облачных платформ (Render, Railway, Heroku)
var cloudPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(cloudPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{cloudPort}");
}

// 1. Конфигурация базы данных PostgreSQL / InMemory (Entity Framework Core)
var rawConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=productbasket;Username=postgres;Password=admin123";

var useInMemory = string.Equals(Environment.GetEnvironmentVariable("USE_INMEMORY_DB"), "true", StringComparison.OrdinalIgnoreCase)
    || rawConnectionString.StartsWith("InMemory", StringComparison.OrdinalIgnoreCase);

var connectionString = ParsePostgresConnectionString(rawConnectionString);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (useInMemory)
    {
        options.UseInMemoryDatabase("ProductBasketDb");
    }
    else
    {
        options.UseNpgsql(connectionString)
               .UseSnakeCaseNamingConvention();
    }
});

// 2. Сервисы авторизации и JWT
builder.Services.AddScoped<ITokenService, TokenService>();

var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] 
    ?? "ProductBasket_SuperSecretKey_For_Development_Only_2026!#_MustBe32BytesOrMore";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "ProductBasketApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "ProductBasketClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    // Поддержка передачи JWT токена через Query-параметр access_token для SignalR вебсокетов
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// 3. Контроллеры и JSON сериализация
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// 4. SignalR для real-time синхронизации корзины
builder.Services.AddSignalR();

// 5. CORS для работы с мобильным приложением (Expo / React Native)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// 6. Swagger / OpenAPI документация с поддержкой JWT Bearer
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ProductBasket API",
        Version = "v1",
        Description = "Серверный REST API и SignalR хаб для мобильного приложения «Совместная корзина продуктов»"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Введите JWT токен в формате: Bearer {ваш_токен}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Инициализация базы данных и каталога продуктов
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = services.GetRequiredService<AppDbContext>();
        logger.LogInformation("Проверка подключения к базе данных PostgreSQL...");
        if (db.Database.IsRelational())
        {
            await db.Database.MigrateAsync();
        }
        else
        {
            await db.Database.EnsureCreatedAsync();
        }
        await DbInitializer.InitializeAsync(db);
        logger.LogInformation("База данных PostgreSQL успешно инициализирована и наполнена базовыми товарами.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "ВНИМАНИЕ: Не удалось подключиться к базе данных PostgreSQL. Проверьте строку подключения в appsettings.json (логин, пароль, порт).");
    }
}

// Конвейер обработки HTTP-запросов (Middleware)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "ProductBasket API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<CartHub>("/hubs/cart");

// Диагностический эндпоинт для проверки развернутой версии и статуса БД
app.MapGet("/api/version", () => Results.Ok(new
{
    service = "ProductBasket.Api",
    version = "1.0.1",
    build = "fix-bug-14-unbought-separation",
    database = useInMemory ? "InMemory" : "PostgreSQL",
    serverTimeUtc = DateTime.UtcNow
}));

// Перенаправление с корня на Swagger для удобства в облаке (Render / Railway)
app.MapGet("/", () => Results.Redirect("/swagger"));

app.Run();

// Парсинг строки подключения: поддерживает как key-value, так и postgresql:// URI от Neon/Render
static string ParsePostgresConnectionString(string connStr)
{
    if (string.IsNullOrWhiteSpace(connStr)) return connStr;

    if (connStr.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) || 
        connStr.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        try
        {
            var uri = new Uri(connStr);
            var userInfo = uri.UserInfo.Split(':');
            var username = userInfo[0];
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
            var database = uri.AbsolutePath.TrimStart('/');
            var port = uri.Port > 0 ? uri.Port : 5432;
            return $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
        }
        catch
        {
            return connStr;
        }
    }

    return connStr;
}

// Для интеграционных тестов
public partial class Program { }
