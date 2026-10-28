using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProductBasket.Api.Data;
using ProductBasket.Api.Dtos;
using ProductBasket.Api.Hubs;
using ProductBasket.Api.Models;

namespace ProductBasket.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CartController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<CartHub> _hubContext;
    private readonly ILogger<CartController> _logger;

    public CartController(AppDbContext context, IHubContext<CartHub> hubContext, ILogger<CartController> logger)
    {
        _context = context;
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Получение товаров в корзине семьи или мероприятия
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<CartItemDto>>> GetCartItems([FromQuery] string? familyId, [FromQuery] string? eventId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        Guid? parsedEventId = Guid.TryParse(eventId, out var eGuid) ? eGuid : null;
        Guid? parsedFamilyId = Guid.TryParse(familyId, out var fGuid) ? fGuid : null;

        Guid? targetFamilyId = null;
        if (parsedEventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(parsedEventId.Value);
            if (ev == null) return NotFound(new { message = "Мероприятие не найдено" });
            if (!await IsUserInFamilyAsync(userId.Value, ev.FamilyId))
            {
                return Forbid();
            }
            targetFamilyId = ev.FamilyId;
        }
        else
        {
            targetFamilyId = await ResolveFamilyIdAsync(userId.Value, parsedFamilyId);
        }

        if (targetFamilyId == null)
        {
            return Ok(new List<CartItemDto>());
        }

        var query = _context.CartItems
            .Include(c => c.TakenByUser)
            .Where(c => c.FamilyId == targetFamilyId.Value);

        if (parsedEventId.HasValue)
        {
            query = query.Where(c => c.EventId == parsedEventId.Value);
        }
        else
        {
            query = query.Where(c => c.EventId == null);
        }

        var items = await query.OrderBy(c => c.CreatedAt).ToListAsync();

        return Ok(items.Select(c => MapCartItemDto(c)).ToList());
    }

    /// <summary>
    /// Добавление товара в корзину (или увеличение количества)
    /// </summary>
    [HttpPost("items")]
    public async Task<ActionResult<CartItemDto>> AddItem([FromBody] AddToCartRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        Guid? targetFamilyId = null;
        if (request.EventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(request.EventId.Value);
            if (ev == null) return NotFound(new { message = "Мероприятие не найдено" });
            if (!await IsUserInFamilyAsync(userId.Value, ev.FamilyId))
            {
                return Forbid();
            }
            if (ev.IsCompleted)
            {
                return BadRequest(new { message = "Мероприятие завершено. Нельзя добавлять товары в завершенное мероприятие." });
            }
            if (!ev.HasCart)
            {
                ev.HasCart = true;
            }
            targetFamilyId = ev.FamilyId;
        }
        else
        {
            targetFamilyId = await ResolveFamilyIdAsync(userId.Value, request.FamilyId);
        }

        if (targetFamilyId == null)
        {
            return BadRequest(new { message = "Группа не найдена или вы не являетесь её участником." });
        }

        // Если указан ProductId, но не указан Title — подтягиваем данные из каталога
        if (request.ProductId.HasValue && string.IsNullOrWhiteSpace(request.Title))
        {
            var catalogProduct = await _context.Products.FindAsync(request.ProductId.Value);
            if (catalogProduct != null)
            {
                request.Title = catalogProduct.Title;
                request.Unit ??= catalogProduct.Unit;
                request.ImageKey ??= catalogProduct.ImageKey;
                request.ImageUrl ??= catalogProduct.ImageUrl;
                request.Emoji ??= catalogProduct.Emoji;
            }
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Название товара обязательно для заполнения" });
        }

        var cleanTitle = request.Title.Trim().ToLower();

        // Проверяем, есть ли уже этот товар в корзине семьи/мероприятия.
        // Товар можно объединять ТОЛЬКО если он еще НЕ куплен И (не взят никем ИЛИ взят текущим пользователем).
        // Если товар уже куплен или взят другим участником — обязательно создается отдельный новый пункт (Bug 14).
        var existing = await _context.CartItems
            .Include(c => c.TakenByUser)
            .FirstOrDefaultAsync(c =>
                c.FamilyId == targetFamilyId.Value &&
                c.EventId == request.EventId &&
                !c.IsBought && c.Status != "Purchased" &&
                (c.TakenByUserId == null || c.TakenByUserId == userId.Value) &&
                ((request.ProductId.HasValue && c.ProductId == request.ProductId) ||
                 c.Title.ToLower() == cleanTitle)
            );

        if (existing != null)
        {
            existing.Quantity += request.Count > 0 ? request.Count : 1;
            existing.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await BroadcastCartUpdatedAsync(targetFamilyId.Value, request.EventId);
            return Ok(MapCartItemDto(existing));
        }

        var newItem = new CartItem
        {
            FamilyId = targetFamilyId.Value,
            ProductId = request.ProductId,
            Title = request.Title.Trim(),
            Unit = request.Unit?.Trim() ?? string.Empty,
            ImageKey = request.ImageKey,
            ImageUrl = request.ImageUrl,
            Emoji = request.Emoji,
            Quantity = request.Count > 0 ? request.Count : 1,
            Status = "Pending",
            TakenByUserId = null,
            IsBought = false,
            EventId = request.EventId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CartItems.Add(newItem);
        await _context.SaveChangesAsync();

        await BroadcastCartUpdatedAsync(targetFamilyId.Value, request.EventId);
        return StatusCode(StatusCodes.Status201Created, MapCartItemDto(newItem));
    }

    /// <summary>
    /// Обновление количества товара в корзине (при 0 товар удаляется)
    /// </summary>
    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateItem([FromRoute] string id, [FromBody] UpdateCartItemRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var item = await FindCartItemByIdOrProductOrTitleAsync(id, userId.Value, preferUnbought: true);
        if (item == null) return NotFound(new { message = "Товар не найден" });

        if (!await IsUserInFamilyAsync(userId.Value, item.FamilyId))
        {
            return Forbid();
        }

        var familyId = item.FamilyId;
        var eventId = item.EventId;

        if (eventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(eventId.Value);
            if (ev != null && ev.IsCompleted)
            {
                return BadRequest(new { message = "Мероприятие завершено. Редактирование корзины невозможно." });
            }
        }

        if (request.Count <= 0)
        {
            _context.CartItems.Remove(item);
            await _context.SaveChangesAsync();
            await BroadcastCartUpdatedAsync(familyId, eventId);
            return Ok(new { success = true, deleted = true });
        }

        item.Quantity = request.Count;
        item.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await BroadcastCartUpdatedAsync(familyId, eventId);
        return Ok(MapCartItemDto(item));
    }

    /// <summary>
    /// Уменьшение количества товара на 1 (при достижении 0 товар удаляется)
    /// </summary>
    [HttpPost("items/{id}/decrement")]
    public async Task<IActionResult> DecrementItem([FromRoute] string id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var item = await FindCartItemByIdOrProductOrTitleAsync(id, userId.Value, preferUnbought: true);
        if (item == null) return NotFound(new { message = "Товар не найден" });

        if (!await IsUserInFamilyAsync(userId.Value, item.FamilyId))
        {
            return Forbid();
        }

        var familyId = item.FamilyId;
        var eventId = item.EventId;

        if (eventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(eventId.Value);
            if (ev != null && ev.IsCompleted)
            {
                return BadRequest(new { message = "Мероприятие завершено. Редактирование корзины невозможно." });
            }
        }

        if (item.Quantity <= 1)
        {
            _context.CartItems.Remove(item);
            await _context.SaveChangesAsync();
            await BroadcastCartUpdatedAsync(familyId, eventId);
            return Ok(new { success = true, deleted = true });
        }

        item.Quantity -= 1;
        item.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await BroadcastCartUpdatedAsync(familyId, eventId);
        return Ok(MapCartItemDto(item));
    }

    /// <summary>
    /// Удаление товара из корзины
    /// </summary>
    [HttpDelete("items/{id}")]
    public async Task<IActionResult> DeleteItem([FromRoute] string id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var item = await FindCartItemByIdOrProductOrTitleAsync(id, userId.Value, preferUnbought: true);
        if (item == null) return NotFound(new { message = "Товар не найден" });

        if (!await IsUserInFamilyAsync(userId.Value, item.FamilyId))
        {
            return Forbid();
        }

        var familyId = item.FamilyId;
        var eventId = item.EventId;

        if (eventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(eventId.Value);
            if (ev != null && ev.IsCompleted)
            {
                return BadRequest(new { message = "Мероприятие завершено. Редактирование корзины невозможно." });
            }
        }

        _context.CartItems.Remove(item);
        await _context.SaveChangesAsync();

        await BroadcastCartUpdatedAsync(familyId, eventId);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Единое действие назначения товара («Куплю я» / отмена своего выбора)
    /// </summary>
    [HttpPost("{id}/assign")]
    public async Task<ActionResult<CartActionResponse>> AssignProduct([FromRoute] string id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var item = await FindCartItemByIdOrProductOrTitleAsync(id, userId.Value, preferUnbought: true);
        if (item == null)
        {
            return NotFound(new CartActionResponse { Success = false, Message = "Товар не найден" });
        }

        if (!await IsUserInFamilyAsync(userId.Value, item.FamilyId))
        {
            return Forbid();
        }

        if (item.EventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(item.EventId.Value);
            if (ev != null && ev.IsCompleted)
            {
                return BadRequest(new CartActionResponse { Success = false, Message = "Мероприятие завершено. Редактирование корзины невозможно." });
            }
        }

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null) return Unauthorized();

        // 1. Свободный товар -> берем себе
        if (item.TakenByUserId == null)
        {
            item.TakenByUserId = userId.Value;
            item.Status = "Taken";
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await BroadcastStatusChangedAsync(item, user.DisplayName);
            return Ok(new CartActionResponse { Success = true, Item = MapCartItemDto(item, user.DisplayName) });
        }

        // 2. Взят нами -> снимаем свой выбор и сбрасываем статус "Куплено"
        if (item.TakenByUserId == userId.Value)
        {
            item.TakenByUserId = null;
            item.Status = "Pending";
            item.IsBought = false;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await BroadcastStatusChangedAsync(item, null);
            return Ok(new CartActionResponse { Success = true, Item = MapCartItemDto(item) });
        }

        // 3. Товар занят другим участником -> блокировка
        var otherName = item.TakenByUser?.DisplayName ?? "другой участник";
        return BadRequest(new CartActionResponse
        {
            Success = false,
            Message = $"Этот товар уже выбрал(а) {otherName}. Вы не можете его изменить.",
            Item = MapCartItemDto(item)
        });
    }

    /// <summary>
    /// Действие «Куплю я» (закрепление за пользователем)
    /// </summary>
    [HttpPost("{id}/take")]
    public async Task<ActionResult<CartActionResponse>> TakeProduct([FromRoute] string id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var item = await FindCartItemByIdOrProductOrTitleAsync(id, userId.Value, preferUnbought: true);
        if (item == null)
        {
            return NotFound(new CartActionResponse { Success = false, Message = "Товар не найден" });
        }

        if (!await IsUserInFamilyAsync(userId.Value, item.FamilyId))
        {
            return Forbid();
        }

        if (item.EventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(item.EventId.Value);
            if (ev != null && ev.IsCompleted)
            {
                return BadRequest(new CartActionResponse { Success = false, Message = "Мероприятие завершено. Редактирование корзины невозможно." });
            }
        }

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null) return Unauthorized();

        if (item.TakenByUserId == null)
        {
            item.TakenByUserId = userId.Value;
            item.Status = "Taken";
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await BroadcastStatusChangedAsync(item, user.DisplayName);
            return Ok(new CartActionResponse { Success = true, Item = MapCartItemDto(item, user.DisplayName) });
        }

        if (item.TakenByUserId == userId.Value)
        {
            return Ok(new CartActionResponse { Success = true, Item = MapCartItemDto(item, user.DisplayName) });
        }

        var otherName = item.TakenByUser?.DisplayName ?? "другой участник";
        return BadRequest(new CartActionResponse
        {
            Success = false,
            Message = $"Этот товар уже выбрал(а) {otherName}. Вы не можете его изменить.",
            Item = MapCartItemDto(item)
        });
    }

    /// <summary>
    /// Отказ от покупки товара (перевод в статус «Не назначено»)
    /// </summary>
    [HttpPost("{id}/release")]
    public async Task<ActionResult<CartActionResponse>> ReleaseProduct([FromRoute] string id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var item = await FindCartItemByIdOrProductOrTitleAsync(id, userId.Value, preferUnbought: false);
        if (item == null)
        {
            return NotFound(new CartActionResponse { Success = false, Message = "Товар не найден" });
        }

        if (!await IsUserInFamilyAsync(userId.Value, item.FamilyId))
        {
            return Forbid();
        }

        if (item.EventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(item.EventId.Value);
            if (ev != null && ev.IsCompleted)
            {
                return BadRequest(new CartActionResponse { Success = false, Message = "Мероприятие завершено. Редактирование корзины невозможно." });
            }
        }

        if (item.TakenByUserId == null)
        {
            return Ok(new CartActionResponse { Success = true, Item = MapCartItemDto(item) });
        }

        if (item.TakenByUserId != userId.Value)
        {
            var otherName = item.TakenByUser?.DisplayName ?? "другой участник";
            return BadRequest(new CartActionResponse
            {
                Success = false,
                Message = $"Товар выбрал(а) {otherName}. Снять выбор может только он(а)."
            });
        }

        item.TakenByUserId = null;
        item.Status = "Pending";
        item.IsBought = false;
        item.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await BroadcastStatusChangedAsync(item, null);
        return Ok(new CartActionResponse { Success = true, Item = MapCartItemDto(item) });
    }

    /// <summary>
    /// Отметка статуса «Куплено» (только участник, взявший товар)
    /// </summary>
    [HttpPost("{id}/toggle-purchased")]
    public async Task<ActionResult<CartActionResponse>> TogglePurchased([FromRoute] string id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var item = await FindCartItemByIdOrProductOrTitleAsync(id, userId.Value, preferUnbought: false);
        if (item == null)
        {
            return NotFound(new CartActionResponse { Success = false, Message = "Товар не найден" });
        }

        if (!await IsUserInFamilyAsync(userId.Value, item.FamilyId))
        {
            return Forbid();
        }

        if (item.EventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(item.EventId.Value);
            if (ev != null && ev.IsCompleted)
            {
                return BadRequest(new CartActionResponse { Success = false, Message = "Мероприятие завершено. Редактирование корзины невозможно." });
            }
        }

        if (item.TakenByUserId == null)
        {
            return BadRequest(new CartActionResponse
            {
                Success = false,
                Message = "Сначала выберите товар («Куплю я»), чтобы затем отметить его статусом «Куплено»."
            });
        }

        if (item.TakenByUserId != userId.Value)
        {
            var otherName = item.TakenByUser?.DisplayName ?? "другой участник";
            return BadRequest(new CartActionResponse
            {
                Success = false,
                Message = $"Товар «{item.Title}» выбрал(а) {otherName}. Только {otherName} может отметить его купленным."
            });
        }

        item.IsBought = !item.IsBought;
        item.Status = item.IsBought ? "Purchased" : "Taken";
        item.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(userId.Value);
        await BroadcastStatusChangedAsync(item, user?.DisplayName);

        return Ok(new CartActionResponse { Success = true, Item = MapCartItemDto(item, user?.DisplayName) });
    }

    private Guid? GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idClaim, out var id) ? id : null;
    }

    private async Task<Guid?> ResolveFamilyIdAsync(Guid userId, Guid? requestedFamilyId)
    {
        if (requestedFamilyId.HasValue)
        {
            var isMember = await _context.FamilyMembers
                .AnyAsync(fm => fm.FamilyId == requestedFamilyId.Value && fm.UserId == userId);
            return isMember ? requestedFamilyId.Value : null;
        }

        var membership = await _context.FamilyMembers
            .FirstOrDefaultAsync(fm => fm.UserId == userId);

        return membership?.FamilyId;
    }

    private async Task<bool> IsUserInFamilyAsync(Guid userId, Guid familyId)
    {
        return await _context.FamilyMembers.AnyAsync(fm => fm.FamilyId == familyId && fm.UserId == userId);
    }

    private async Task<CartItem?> FindCartItemByIdOrProductOrTitleAsync(string idOrTitle, Guid? userId = null, bool preferUnbought = true)
    {
        if (string.IsNullOrWhiteSpace(idOrTitle)) return null;

        var clean = idOrTitle.Trim().ToLowerInvariant();

        // 1. Попытка распарсить как Guid (Id элемента корзины или ProductId)
        if (Guid.TryParse(idOrTitle, out var guid))
        {
            var itemById = await _context.CartItems
                .Include(c => c.TakenByUser)
                .FirstOrDefaultAsync(c => c.Id == guid);
            if (itemById != null) return itemById;

            // Поиск по ProductId среди товаров семей текущего пользователя
            var query = _context.CartItems
                .Include(c => c.TakenByUser)
                .Where(c => c.ProductId == guid);

            if (userId.HasValue)
            {
                var userFamilyIds = await _context.FamilyMembers
                    .Where(fm => fm.UserId == userId.Value)
                    .Select(fm => fm.FamilyId)
                    .ToListAsync();
                query = query.Where(c => userFamilyIds.Contains(c.FamilyId));
            }

            if (preferUnbought)
            {
                return await query
                    .OrderByDescending(c => c.UpdatedAt)
                    .FirstOrDefaultAsync(c => !c.IsBought && c.Status != "Purchased");
            }

            return await query.OrderByDescending(c => c.UpdatedAt).FirstOrDefaultAsync();
        }

        // 2. Если передан строковый ключ (например prod-apple или русское название)
        var titleToMatch = clean;
        if (clean.StartsWith("prod-apple")) titleToMatch = "яблоки";
        else if (clean.StartsWith("prod-milk")) titleToMatch = "молоко";
        else if (clean.StartsWith("prod-mayo")) titleToMatch = "майонез";
        else if (clean.StartsWith("prod-cucumbers")) titleToMatch = "огурцы";
        else if (clean.StartsWith("prod-cheese")) titleToMatch = "сыр";
        else if (clean.StartsWith("prod-pasta")) titleToMatch = "макароны";
        else if (clean.StartsWith("prod-sugar")) titleToMatch = "сахар";
        else if (clean.StartsWith("prod-salt")) titleToMatch = "соль";

        var titleQuery = _context.CartItems
            .Include(c => c.TakenByUser)
            .Where(c => c.Title.ToLower() == titleToMatch || c.Title.ToLower() == clean);

        if (userId.HasValue)
        {
            var userFamilyIds = await _context.FamilyMembers
                .Where(fm => fm.UserId == userId.Value)
                .Select(fm => fm.FamilyId)
                .ToListAsync();
            titleQuery = titleQuery.Where(c => userFamilyIds.Contains(c.FamilyId));
        }

        if (preferUnbought)
        {
            return await titleQuery
                .OrderByDescending(c => c.UpdatedAt)
                .FirstOrDefaultAsync(c => !c.IsBought && c.Status != "Purchased");
        }

        return await titleQuery.OrderByDescending(c => c.UpdatedAt).FirstOrDefaultAsync();
    }

    private Task<CartItem?> FindCartItemByIdOrProductAsync(Guid id, Guid? userId = null, bool preferUnbought = true)
    {
        return FindCartItemByIdOrProductOrTitleAsync(id.ToString(), userId, preferUnbought);
    }

    private async Task BroadcastStatusChangedAsync(CartItem item, string? takenByName)
    {
        var fStr = item.FamilyId.ToString().ToLowerInvariant();
        await _hubContext.Clients.Group(fStr).SendAsync("ProductStatusChanged", new
        {
            cartItemId = item.Id.ToString().ToLowerInvariant(),
            productId = item.ProductId?.ToString().ToLowerInvariant(),
            status = item.Status,
            takenByUserId = item.TakenByUserId?.ToString().ToLowerInvariant(),
            assignedToUserId = item.TakenByUserId?.ToString().ToLowerInvariant(),
            takenByName = takenByName ?? item.TakenByUser?.DisplayName,
            isBought = item.IsBought
        });
    }

    private async Task BroadcastCartUpdatedAsync(Guid familyId, Guid? eventId)
    {
        var fStr = familyId.ToString().ToLowerInvariant();
        var eStr = eventId?.ToString().ToLowerInvariant();
        await _hubContext.Clients.Group(fStr).SendAsync("CartUpdated", new
        {
            familyId = fStr,
            eventId = eStr
        });
    }

    private static CartItemDto MapCartItemDto(CartItem c, string? overrideTakenByName = null)
    {
        return new CartItemDto
        {
            Id = c.Id,
            ProductId = c.ProductId,
            Title = c.Title,
            Unit = c.Unit,
            ImageKey = c.ImageKey,
            ImageUrl = c.ImageUrl,
            Emoji = c.Emoji,
            Count = c.Quantity,
            Status = c.Status,
            AssignedToUserId = c.TakenByUserId,
            TakenByName = overrideTakenByName ?? c.TakenByUser?.DisplayName,
            IsBought = c.IsBought,
            EventId = c.EventId,
            UpdatedAt = c.UpdatedAt
        };
    }
}
