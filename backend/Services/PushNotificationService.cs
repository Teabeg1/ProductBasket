using System.Net.Http.Json;
using System.Text.Json;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
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

    private static readonly object _firebaseLock = new();
    private static bool _firebaseInitialized = false;

    public PushNotificationService(HttpClient httpClient, ILogger<PushNotificationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        EnsureFirebaseInitialized(logger);
    }

    private static void EnsureFirebaseInitialized(ILogger logger)
    {
        if (_firebaseInitialized) return;
        lock (_firebaseLock)
        {
            if (_firebaseInitialized) return;
            try
            {
                if (FirebaseApp.DefaultInstance != null)
                {
                    _firebaseInitialized = true;
                    return;
                }

                // 1. Проверяем переменную окружения (удобно для Render/Docker без монтирования файлов)
                var envJson = Environment.GetEnvironmentVariable("FIREBASE_CREDENTIALS_JSON")
                           ?? Environment.GetEnvironmentVariable("FIREBASE_ADMIN_CREDENTIALS");

                if (!string.IsNullOrWhiteSpace(envJson))
                {
                    FirebaseApp.Create(new AppOptions
                    {
                        Credential = GoogleCredential.FromJson(envJson)
                    });
                    logger.LogInformation("FirebaseApp успешно инициализирован из переменной окружения.");
                    _firebaseInitialized = true;
                    return;
                }

                // 2. Проверяем локальные пути к файлу сервисного аккаунта
                var candidatePaths = new[]
                {
                    Path.Combine(AppContext.BaseDirectory, "firebase-adminsdk.json"),
                    Path.Combine(Directory.GetCurrentDirectory(), "firebase-adminsdk.json"),
                    Path.Combine(Directory.GetCurrentDirectory(), "backend", "firebase-adminsdk.json")
                };

                foreach (var path in candidatePaths)
                {
                    if (File.Exists(path))
                    {
                        FirebaseApp.Create(new AppOptions
                        {
                            Credential = GoogleCredential.FromFile(path)
                        });
                        logger.LogInformation("FirebaseApp успешно инициализирован из файла ключа: {Path}", path);
                        _firebaseInitialized = true;
                        return;
                    }
                }

                logger.LogWarning("Ключ Firebase (firebase-adminsdk.json) не найден. Нативные FCM пуши будут отключены до добавления ключа.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Ошибка при инициализации FirebaseApp");
            }
        }
    }

    public async Task SendPushNotificationAsync(IEnumerable<string> pushTokens, string title, string body, object? data = null)
    {
        var allTokens = pushTokens
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct()
            .ToList();

        if (allTokens.Count == 0)
        {
            return;
        }

        var expoTokens = allTokens
            .Where(t => t.StartsWith("ExponentPushToken") || t.StartsWith("ExpoPushToken"))
            .ToList();

        var fcmTokens = allTokens
            .Where(t => !t.StartsWith("ExponentPushToken") && !t.StartsWith("ExpoPushToken"))
            .ToList();

        // 1. Отправка через Expo Push Service (для Expo Go)
        if (expoTokens.Count > 0)
        {
            var messages = expoTokens.Select(token => new
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
                else
                {
                    _logger.LogInformation("Expo Push отправлен успешно для {Count} токенов.", expoTokens.Count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send Expo Push Notification");
            }
        }

        // 2. Отправка напрямую через Google Firebase Cloud Messaging v1 (для нативного APK)
        if (fcmTokens.Count > 0)
        {
            try
            {
                if (FirebaseApp.DefaultInstance == null)
                {
                    EnsureFirebaseInitialized(_logger);
                }

                if (FirebaseApp.DefaultInstance == null)
                {
                    _logger.LogWarning("FCM токены обнаружены ({Count}), но FirebaseApp не инициализирован.", fcmTokens.Count);
                    return;
                }

                var dataDict = new Dictionary<string, string>();
                if (data != null)
                {
                    try
                    {
                        var json = JsonSerializer.Serialize(data);
                        using var doc = JsonDocument.Parse(json);
                        foreach (var prop in doc.RootElement.EnumerateObject())
                        {
                            dataDict[prop.Name] = prop.Value.ToString() ?? "";
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug(ex, "Failed to serialize push data payload to dictionary");
                    }
                }

                var message = new MulticastMessage
                {
                    Tokens = fcmTokens,
                    Notification = new Notification
                    {
                        Title = title,
                        Body = body
                    },
                    Data = dataDict,
                    Android = new AndroidConfig
                    {
                        Priority = Priority.High,
                        Notification = new AndroidNotification
                        {
                            ChannelId = "default",
                            Sound = "default",
                            Priority = NotificationPriority.MAX,
                            DefaultSound = true,
                            DefaultVibrateTimings = true
                        }
                    }
                };

                var fcmResponse = await FirebaseMessaging.DefaultInstance.SendEachForMulticastAsync(message);
                _logger.LogInformation("FCM Push отправлен: {SuccessCount} доставлено, {FailureCount} ошибок из {TotalCount} устройств.",
                    fcmResponse.SuccessCount, fcmResponse.FailureCount, fcmTokens.Count);

                if (fcmResponse.FailureCount > 0)
                {
                    foreach (var resp in fcmResponse.Responses.Where(r => !r.IsSuccess))
                    {
                        _logger.LogWarning("FCM Delivery failure: {Error}", resp.Exception?.Message);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send Firebase Cloud Messaging push");
            }
        }
    }
}
