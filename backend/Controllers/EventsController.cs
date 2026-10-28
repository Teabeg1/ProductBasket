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
public class EventsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<CartHub> _hubContext;
    private readonly ILogger<EventsController> _logger;

    public EventsController(AppDbContext context, IHubContext<CartHub> hubContext, ILogger<EventsController> logger)
    {
        _context = context;
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Получение списка мероприятий семьи (или всех групп пользователя, если familyId не указан)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<EventDto>>> GetEvents([FromQuery] string? familyId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var myFamilyIds = await _context.FamilyMembers
            .Where(fm => fm.UserId == userId.Value)
            .Select(fm => fm.FamilyId)
            .ToListAsync();

        if (myFamilyIds.Count == 0) return Ok(new List<EventDto>());

        var query = _context.Events
            .Include(e => e.Family)
                .ThenInclude(f => f.Members)
            .Include(e => e.CartItems)
            .AsQueryable();

        var hasParsed = Guid.TryParse(familyId, out var parsedFamilyId);
        if (hasParsed)
        {
            if (!myFamilyIds.Contains(parsedFamilyId))
            {
                return BadRequest(new { message = "Вы не являетесь участником указанной группы" });
            }
            query = query.Where(e => e.FamilyId == parsedFamilyId);
        }
        else
        {
            query = query.Where(e => myFamilyIds.Contains(e.FamilyId));
        }

        var events = await query.OrderByDescending(e => e.CreatedAt).ToListAsync();
        var result = events.Select(e => MapEventDto(e)).ToList();
        return Ok(result);
    }

    /// <summary>
    /// Создание нового мероприятия
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<EventDto>> CreateEvent([FromBody] CreateEventRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var targetFamilyId = await ResolveFamilyIdAsync(userId.Value, request.FamilyId);
        if (targetFamilyId == null)
        {
            return BadRequest(new { message = "Группа не найдена или вы не являетесь её участником" });
        }

        var newEvent = new Event
        {
            FamilyId = targetFamilyId.Value,
            Title = request.Title.Trim(),
            EventDate = request.EventDate.Trim(),
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? "🎉" : request.Icon.Trim(),
            BadgeBg = "#FFF0F4",
            HasCart = request.HasCart ?? false,
            IsCompleted = false,
            CreatedByUserId = userId.Value,
            CreatedAt = DateTime.UtcNow
        };

        _context.Events.Add(newEvent);
        await _context.SaveChangesAsync();

        var familyMembersCount = await _context.FamilyMembers.CountAsync(fm => fm.FamilyId == targetFamilyId.Value);

        var fStr = targetFamilyId.Value.ToString().ToLowerInvariant();
        await _hubContext.Clients.Group(fStr).SendAsync("EventCreated", new
        {
            eventId = newEvent.Id.ToString().ToLowerInvariant(),
            familyId = fStr,
            title = newEvent.Title
        });

        return StatusCode(StatusCodes.Status201Created, MapEventDto(newEvent, familyMembersCount));
    }

    /// <summary>
    /// Создание корзины для мероприятия
    /// </summary>
    [HttpPost("{id:guid}/cart")]
    public async Task<IActionResult> CreateEventCart([FromRoute] Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var ev = await _context.Events.FindAsync(id);
        if (ev == null) return NotFound(new { message = "Мероприятие не найдено" });

        if (!await IsUserInFamilyAsync(userId.Value, ev.FamilyId))
        {
            return Forbid();
        }

        ev.HasCart = true;
        await _context.SaveChangesAsync();

        var fStr = ev.FamilyId.ToString().ToLowerInvariant();
        await _hubContext.Clients.Group(fStr).SendAsync("EventCartCreated", new
        {
            eventId = ev.Id.ToString().ToLowerInvariant(),
            familyId = fStr
        });

        return Ok(new { success = true, hasCart = true });
    }

    /// <summary>
    /// Завершение мероприятия
    /// </summary>
    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> CompleteEvent([FromRoute] Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var ev = await _context.Events.FindAsync(id);
        if (ev == null) return NotFound(new { message = "Мероприятие не найдено" });

        if (!await IsUserInFamilyAsync(userId.Value, ev.FamilyId))
        {
            return Forbid();
        }

        var months = new[]
        {
            "января", "февраля", "марта", "апреля", "мая", "июня",
            "июля", "августа", "сентября", "октября", "ноября", "декабря"
        };
        var now = DateTime.UtcNow;
        var dateStr = $"{now.Day} {months[now.Month - 1]}";

        ev.IsCompleted = true;
        ev.CompletedAt = dateStr;
        await _context.SaveChangesAsync();

        var fStr = ev.FamilyId.ToString().ToLowerInvariant();
        await _hubContext.Clients.Group(fStr).SendAsync("EventCompleted", new
        {
            eventId = ev.Id.ToString().ToLowerInvariant(),
            familyId = fStr,
            completedAt = dateStr
        });

        return Ok(new { success = true, isCompleted = true, completedAt = dateStr });
    }

    /// <summary>
    /// Возобновление мероприятия
    /// </summary>
    [HttpPost("{id:guid}/reopen")]
    public async Task<IActionResult> ReopenEvent([FromRoute] Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var ev = await _context.Events.FindAsync(id);
        if (ev == null) return NotFound(new { message = "Мероприятие не найдено" });

        if (!await IsUserInFamilyAsync(userId.Value, ev.FamilyId))
        {
            return Forbid();
        }

        ev.IsCompleted = false;
        ev.CompletedAt = null;
        await _context.SaveChangesAsync();

        var fStr = ev.FamilyId.ToString().ToLowerInvariant();
        await _hubContext.Clients.Group(fStr).SendAsync("EventReopened", new
        {
            eventId = ev.Id.ToString().ToLowerInvariant(),
            familyId = fStr
        });

        return Ok(new { success = true, isCompleted = false });
    }

    /// <summary>
    /// Удаление мероприятия
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteEvent([FromRoute] Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var ev = await _context.Events.FindAsync(id);
        if (ev == null) return NotFound(new { message = "Мероприятие не найдено" });

        if (!await IsUserInFamilyAsync(userId.Value, ev.FamilyId))
        {
            return Forbid();
        }

        var familyId = ev.FamilyId;
        _context.Events.Remove(ev);
        await _context.SaveChangesAsync();

        var fStr = familyId.ToString().ToLowerInvariant();
        var eStr = id.ToString().ToLowerInvariant();

        await _hubContext.Clients.Group(fStr).SendAsync("EventDeleted", new
        {
            eventId = eStr,
            familyId = fStr
        });

        await _hubContext.Clients.Group(fStr).SendAsync("CartUpdated", new
        {
            familyId = fStr,
            eventId = eStr
        });

        return Ok(new { success = true });
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

    private static EventDto MapEventDto(Event e, int? overrideMembersCount = null)
    {
        var items = e.CartItems ?? new List<CartItem>();
        var total = items.Count;
        var assigned = items.Count(i => i.TakenByUserId != null);
        var bought = items.Count(i => i.IsBought);

        return new EventDto
        {
            Id = e.Id,
            FamilyId = e.FamilyId,
            Title = e.Title,
            EventDate = e.EventDate,
            Icon = e.Icon,
            BadgeBg = e.BadgeBg,
            HasCart = e.HasCart || (e.CartItems != null && e.CartItems.Count > 0),
            IsCompleted = e.IsCompleted,
            CompletedAt = e.CompletedAt,
            MembersCount = overrideMembersCount ?? e.Family?.Members?.Count ?? 1,
            CartStats = new EventCartStatsDto
            {
                Total = total,
                Assigned = assigned,
                Bought = bought
            }
        };
    }
}
