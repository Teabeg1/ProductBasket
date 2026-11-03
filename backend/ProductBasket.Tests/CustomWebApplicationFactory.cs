using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProductBasket.Api.Data;
using ProductBasket.Api.Services;

namespace ProductBasket.Tests;

public class PushCallRecord
{
    public List<string> Tokens { get; set; } = new();
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public object? Data { get; set; }
}

public class FakePushNotificationService : IPushNotificationService
{
    public List<PushCallRecord> Calls { get; } = new();

    public Task SendPushNotificationAsync(IEnumerable<string> pushTokens, string title, string body, object? data = null)
    {
        Calls.Add(new PushCallRecord
        {
            Tokens = pushTokens.ToList(),
            Title = title,
            Body = body,
            Data = data
        });
        return Task.CompletedTask;
    }
}

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = "TestDb_" + Guid.NewGuid();
    public FakePushNotificationService PushService { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Удаляем регистрацию Npgsql DbContext
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            // Добавляем InMemory базу данных для тестирования
            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseInMemoryDatabase(_dbName);
            });

            // Заменяем IPushNotificationService на FakePushNotificationService
            var pushDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IPushNotificationService));
            if (pushDescriptor != null)
            {
                services.Remove(pushDescriptor);
            }
            services.AddSingleton<IPushNotificationService>(PushService);

            // Подавляем лишние логи в тестах
            services.AddLogging(builder => builder.SetMinimumLevel(LogLevel.Warning));
        });
    }
}
