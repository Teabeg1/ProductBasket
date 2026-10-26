using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using ProductBasket.Api.Data;
using ProductBasket.Api.Dtos;
using ProductBasket.Api.Hubs;
using ProductBasket.Api.Models;

namespace ProductBasket.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FamilyController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<CartHub> _hubContext;
    private readonly ILogger<FamilyController> _logger;

    public FamilyController(AppDbContext context, IHubContext<CartHub> hubContext, ILogger<FamilyController> logger)
    {
        _context = context;
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Создание новой семьи / совместной группы
    /// </summary>
    [HttpPost("create")]
    public async Task<ActionResult<FamilyResponse>> Create([FromBody] CreateFamilyRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var code = await GenerateUniqueCodeAsync();
        var family = new Family
        {
            Name = request.Name.Trim(),
            InviteCode = code,
            CreatorUserId = userId.Value,
            CreatedAt = DateTime.UtcNow
        };

        _context.Families.Add(family);

        var membership = new FamilyMember
        {
            FamilyId = family.Id,
            UserId = userId.Value,
            Role = "Admin",
            JoinedAt = DateTime.UtcNow
        };
        _context.FamilyMembers.Add(membership);

        await _context.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new FamilyResponse
        {
            FamilyId = family.Id,
            Name = family.Name,
            InviteCode = family.InviteCode,
            Role = "Admin"
        });
    }

    /// <summary>
    /// Вступление в семью по коду приглашения
    /// </summary>
    [HttpPost("join")]
    public async Task<ActionResult<FamilyResponse>> Join([FromBody] JoinFamilyRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var cleanCode = request.InviteCode.Trim().ToUpper().Replace(" ", "");

        var family = await _context.Families
            .Include(f => f.Members)
            .FirstOrDefaultAsync(f => f.InviteCode == cleanCode);

        if (family == null)
        {
            return NotFound(new { message = "Группа с указанным кодом приглашения не найдена" });
        }

        var existingMember = family.Members.FirstOrDefault(m => m.UserId == userId.Value);
        if (existingMember != null)
        {
            return Ok(new FamilyResponse
            {
                FamilyId = family.Id,
                Name = family.Name,
                InviteCode = family.InviteCode,
                Role = existingMember.Role
            });
        }

        var newMember = new FamilyMember
        {
            FamilyId = family.Id,
            UserId = userId.Value,
            Role = "Member",
            JoinedAt = DateTime.UtcNow
        };

        _context.FamilyMembers.Add(newMember);
        await _context.SaveChangesAsync();

        return Ok(new FamilyResponse
        {
            FamilyId = family.Id,
            Name = family.Name,
            InviteCode = family.InviteCode,
            Role = "Member"
        });
    }

    /// <summary>
    /// Получение списка всех групп текущего пользователя
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<List<FamilyDto>>> GetMyFamilies()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var families = await _context.FamilyMembers
            .Where(fm => fm.UserId == userId.Value)
            .Include(fm => fm.Family)
                .ThenInclude(f => f.Members)
                    .ThenInclude(m => m.User)
            .Select(fm => fm.Family)
            .ToListAsync();

        var result = families.Select(f => new FamilyDto
        {
            Id = f.Id,
            Name = f.Name,
            Code = f.InviteCode,
            MembersCount = f.Members.Count,
            Members = f.Members.Select(m => MapMemberDto(m, userId.Value)).ToList()
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Получение списка участников текущей или указанной семьи
    /// </summary>
    [HttpGet("members")]
    [HttpGet("{familyId:guid}/members")]
    public async Task<ActionResult<List<FamilyMemberDto>>> GetMembers([FromRoute] Guid? familyId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var targetFamilyId = await ResolveFamilyIdAsync(userId.Value, familyId);
        if (targetFamilyId == null)
        {
            return BadRequest(new { message = "Вы не состоите ни в одной группе" });
        }

        var members = await _context.FamilyMembers
            .Where(fm => fm.FamilyId == targetFamilyId.Value)
            .Include(fm => fm.User)
            .OrderBy(fm => fm.JoinedAt)
            .ToListAsync();

        var dtos = members.Select(m => MapMemberDto(m, userId.Value)).ToList();
        return Ok(dtos);
    }

    /// <summary>
    /// Выход из группы с каскадным удалением своих товаров
    /// </summary>
    [HttpPost("leave")]
    [HttpPost("{familyId:guid}/leave")]
    public async Task<IActionResult> Leave([FromRoute] Guid? familyId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var targetFamilyId = await ResolveFamilyIdAsync(userId.Value, familyId);
        if (targetFamilyId == null)
        {
            return BadRequest(new { message = "Группа не указана" });
        }

        var member = await _context.FamilyMembers
            .FirstOrDefaultAsync(fm => fm.FamilyId == targetFamilyId.Value && fm.UserId == userId.Value);

        if (member == null)
        {
            return NotFound(new { message = "Вы не являетесь участником этой группы" });
        }

        // Каскадное удаление товаров участника из всех корзин этой семьи
        var userItems = await _context.CartItems
            .Where(c => c.FamilyId == targetFamilyId.Value && c.TakenByUserId == userId.Value)
            .ToListAsync();

        _context.CartItems.RemoveRange(userItems);
        _context.FamilyMembers.Remove(member);

        await _context.SaveChangesAsync();

        await _hubContext.Clients.Group(targetFamilyId.Value.ToString()).SendAsync("CartUpdated", new { familyId = targetFamilyId.Value });
        await _hubContext.Clients.Group(targetFamilyId.Value.ToString()).SendAsync("MemberLeft", new { familyId = targetFamilyId.Value, userId = userId.Value });

        return Ok(new { success = true, message = "Вы вышли из группы" });
    }

    /// <summary>
    /// Удаление участника из группы любым членом группы (равенство участников)
    /// </summary>
    [HttpDelete("{familyId:guid}/members/{memberUserId:guid}")]
    [HttpDelete("members/{memberUserId:guid}")]
    public async Task<IActionResult> RemoveMember([FromRoute] Guid? familyId, [FromRoute] Guid memberUserId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null) return Unauthorized();

        var targetFamilyId = await ResolveFamilyIdAsync(currentUserId.Value, familyId);
        if (targetFamilyId == null)
        {
            return BadRequest(new { message = "Группа не определена или вы не являетесь её участником" });
        }

        var memberToRemove = await _context.FamilyMembers
            .FirstOrDefaultAsync(fm => fm.FamilyId == targetFamilyId.Value && fm.UserId == memberUserId);

        if (memberToRemove == null)
        {
            return NotFound(new { message = "Участник не найден в данной группе" });
        }

        // Удаляем закрепленные товары этого человека из корзин семьи
        var itemsToRemove = await _context.CartItems
            .Where(c => c.FamilyId == targetFamilyId.Value && c.TakenByUserId == memberUserId)
            .ToListAsync();

        _context.CartItems.RemoveRange(itemsToRemove);
        _context.FamilyMembers.Remove(memberToRemove);

        await _context.SaveChangesAsync();

        await _hubContext.Clients.Group(targetFamilyId.Value.ToString()).SendAsync("CartUpdated", new { familyId = targetFamilyId.Value });
        await _hubContext.Clients.Group(targetFamilyId.Value.ToString()).SendAsync("MemberRemoved", new { familyId = targetFamilyId.Value, userId = memberUserId });

        return Ok(new { success = true });
    }

    /// <summary>
    /// Переименование группы
    /// </summary>
    [HttpPut("name")]
    [HttpPut("{familyId:guid}/name")]
    public async Task<IActionResult> UpdateFamilyName([FromRoute] Guid? familyId, [FromBody] UpdateFamilyNameRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var targetFamilyId = await ResolveFamilyIdAsync(userId.Value, familyId);
        if (targetFamilyId == null) return BadRequest(new { message = "Группа не найдена или вы не являетесь её участником" });

        var family = await _context.Families.FindAsync(targetFamilyId.Value);
        if (family == null) return NotFound(new { message = "Группа не найдена" });

        family.Name = request.Name.Trim();
        await _context.SaveChangesAsync();

        await _hubContext.Clients.Group(targetFamilyId.Value.ToString()).SendAsync("FamilyUpdated", new { familyId = targetFamilyId.Value, name = family.Name });

        return Ok(new { success = true, name = family.Name });
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

    private async Task<string> GenerateUniqueCodeAsync()
    {
        const string chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
        while (true)
        {
            var codeChars = new char[6];
            for (int i = 0; i < 6; i++)
            {
                codeChars[i] = chars[RandomNumberGenerator.GetInt32(chars.Length)];
            }
            var code = new string(codeChars);
            var exists = await _context.Families.AnyAsync(f => f.InviteCode == code);
            if (!exists) return code;
        }
    }

    private static FamilyMemberDto MapMemberDto(FamilyMember fm, Guid currentUserId)
    {
        var name = fm.User.DisplayName.Trim();
        var initial = !string.IsNullOrEmpty(name) ? name[0].ToString().ToUpper() : "U";
        return new FamilyMemberDto
        {
            Id = fm.UserId,
            DisplayName = fm.User.DisplayName,
            Email = fm.User.Email,
            Role = fm.Role,
            IsCurrentUser = fm.UserId == currentUserId,
            AvatarChar = initial,
            AvatarBg = "#E0E7FF",
            AvatarColor = "#3730A3",
            JoinedAt = fm.JoinedAt
        };
    }
}
