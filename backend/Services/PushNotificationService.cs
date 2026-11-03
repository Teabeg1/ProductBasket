using System.Net.Http.Json;
using Microsoft.Extensions.Logging;

namespace ProductBasket.Api.Services;

public interface IPushNotificationService
{
    Task SendPushNotificationAsync(IEnumerable<string> pushTokens, string title, string body, object? data = null);
}

public class PushNotificationService : IPushNotificationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PushNotificationService> _logger;

    public PushNotificationService(HttpClient httpClient, ILogger<PushNotificationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task SendPushNotificationAsync(IEnumerable<string> pushTokens, string title, string body, object? data = null)
    {
        var validTokens = pushTokens
            .Where(t => !string.IsNullOrWhiteSpace(t) && (t.StartsWith("ExponentPushToken") || t.StartsWith("ExpoPushToken")))
            .Distinct()
            .ToList();

        if (validTokens.Count == 0)
        {
            return;
        }

        var messages = validTokens.Select(token => new
        {
            to = token,
            sound = "default",
            title = title,
            body = body,
            data = data
        }).ToList();

        try
        {
            var response = await _httpClient.PostAsJsonAsync("https://exp.host/--/api/v2/push/send", messages);
            if (!response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Expo Push API returned non-success code {StatusCode}: {Content}", response.StatusCode, content);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send Expo Push Notification");
        }
    }
}
