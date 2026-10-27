using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProductBasket.Api.Data;
using ProductBasket.Api.Models;

namespace ProductBasket.Api.Hubs;

[Authorize]
public class CartHub : Hub
{
    private readonly AppDbContext _context;
    private readonly ILogger<CartHub> _logger;

    public CartHub(AppDbContext context, ILogger<CartHub> logger)
    {
        _context = context;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdStr, out var userId))
        {
            // Автоматически подключаем пользователя ко всем его семейным группам
            var familyIds = await _context.FamilyMembers
                .Where(fm => fm.UserId == userId)
                .Select(fm => fm.FamilyId)
                .ToListAsync();

            foreach (var fId in familyIds)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, fId.ToString().ToLowerInvariant());
            }
        }

        await base.OnConnectedAsync();
    }

    public async Task JoinFamily(string familyId)
    {
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdStr, out var userId) && Guid.TryParse(familyId, out var fGuid))
        {
            var isMember = await _context.FamilyMembers.AnyAsync(fm => fm.FamilyId == fGuid && fm.UserId == userId);
            if (isMember)
            {
                var groupName = fGuid.ToString().ToLowerInvariant();
                await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
                _logger.LogInformation("Connection {ConnectionId} joined group {FamilyId}", Context.ConnectionId, groupName);
            }
        }
    }

    public async Task LeaveFamily(string familyId)
    {
        if (!string.IsNullOrEmpty(familyId))
        {
            var groupName = Guid.TryParse(familyId, out var fGuid) ? fGuid.ToString().ToLowerInvariant() : familyId.ToLowerInvariant();
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("Connection {ConnectionId} left group {FamilyId}", Context.ConnectionId, groupName);
        }
    }

    /// <summary>
    /// Действие назначения «Куплю я» / отмена своего выбора (single-click toggle)
    /// </summary>
    public async Task AssignProduct(Guid cartItemId)
    {
        var userId = GetUserId();
        var item = await FindItemAsync(cartItemId);
        if (item == null) throw new HubException("Товар не найден");

        if (!await IsMemberAsync(userId, item.FamilyId))
        {
            throw new HubException("Вы не состоите в группе этого товара");
        }

        if (item.EventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(item.EventId.Value);
            if (ev != null && ev.IsCompleted)
            {
                throw new HubException("Мероприятие завершено. Редактирование корзины невозможно.");
            }
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null) throw new HubException("Пользователь не найден");

        if (item.TakenByUserId == null)
        {
            item.TakenByUserId = userId;
            item.Status = "Taken";
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await BroadcastStatusAsync(item, user.DisplayName);
        }
        else if (item.TakenByUserId == userId)
        {
            item.TakenByUserId = null;
            item.Status = "Pending";
            item.IsBought = false;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await BroadcastStatusAsync(item, null);
        }
        else
        {
            throw new HubException($"Товар уже выбран: {item.TakenByUser?.DisplayName ?? "другим участником"}");
        }
    }

    public async Task TakeProduct(Guid cartItemId)
    {
        var userId = GetUserId();
        var item = await FindItemAsync(cartItemId);
        if (item == null) throw new HubException("Товар не найден");

        if (!await IsMemberAsync(userId, item.FamilyId))
        {
            throw new HubException("Вы не состоите в группе этого товара");
        }

        if (item.EventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(item.EventId.Value);
            if (ev != null && ev.IsCompleted)
            {
                throw new HubException("Мероприятие завершено. Редактирование корзины невозможно.");
            }
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null) throw new HubException("Пользователь не найден");

        if (item.TakenByUserId == null)
        {
            item.TakenByUserId = userId;
            item.Status = "Taken";
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await BroadcastStatusAsync(item, user.DisplayName);
        }
        else if (item.TakenByUserId != userId)
        {
            throw new HubException($"Товар уже выбран: {item.TakenByUser?.DisplayName ?? "другим участником"}");
        }
    }

    public async Task ReleaseProduct(Guid cartItemId)
    {
        var userId = GetUserId();
        var item = await FindItemAsync(cartItemId);
        if (item == null) throw new HubException("Товар не найден");

        if (!await IsMemberAsync(userId, item.FamilyId))
        {
            throw new HubException("Вы не состоите в группе этого товара");
        }

        if (item.EventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(item.EventId.Value);
            if (ev != null && ev.IsCompleted)
            {
                throw new HubException("Мероприятие завершено. Редактирование корзины невозможно.");
            }
        }

        if (item.TakenByUserId == userId)
        {
            item.TakenByUserId = null;
            item.Status = "Pending";
            item.IsBought = false;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await BroadcastStatusAsync(item, null);
        }
    }

    public async Task TogglePurchased(Guid cartItemId)
    {
        var userId = GetUserId();
        var item = await FindItemAsync(cartItemId);
        if (item == null) throw new HubException("Товар не найден");

        if (!await IsMemberAsync(userId, item.FamilyId))
        {
            throw new HubException("Вы не состоите в группе этого товара");
        }

        if (item.EventId.HasValue)
        {
            var ev = await _context.Events.FindAsync(item.EventId.Value);
            if (ev != null && ev.IsCompleted)
            {
                throw new HubException("Мероприятие завершено. Редактирование корзины невозможно.");
            }
        }

        if (item.TakenByUserId != userId)
        {
            throw new HubException("Только участник, выбравший товар, может отметить его купленным");
        }

        item.IsBought = !item.IsBought;
        item.Status = item.IsBought ? "Purchased" : "Taken";
        item.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(userId);
        await BroadcastStatusAsync(item, user?.DisplayName);
    }

    private Guid GetUserId()
    {
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            throw new HubException("Пользователь не авторизован");
        }
        return userId;
    }

    private async Task<CartItem?> FindItemAsync(Guid id)
    {
        return await _context.CartItems
            .Include(c => c.TakenByUser)
            .FirstOrDefaultAsync(c => c.Id == id || c.ProductId == id);
    }

    private async Task<bool> IsMemberAsync(Guid userId, Guid familyId)
    {
        return await _context.FamilyMembers.AnyAsync(fm => fm.FamilyId == familyId && fm.UserId == userId);
    }

    private async Task BroadcastStatusAsync(CartItem item, string? takenByName)
    {
        var fStr = item.FamilyId.ToString().ToLowerInvariant();
        await Clients.Group(fStr).SendAsync("ProductStatusChanged", new
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
}
