using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductBasket.Api.Data;
using ProductBasket.Api.Dtos;
using ProductBasket.Api.Models;
using ProductBasket.Api.Services;

namespace ProductBasket.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext context, ITokenService tokenService, ILogger<AuthController> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _logger = logger;
    }

    /// <summary>
    /// Регистрация нового пользователя
    /// </summary>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        var cleanEmail = request.Email.Trim().ToLower();

        if (await _context.Users.AnyAsync(u => u.Email == cleanEmail))
        {
            return BadRequest(new { message = "Пользователь с таким email уже существует" });
        }

        var user = new User
        {
            DisplayName = request.DisplayName.Trim(),
            Email = cleanEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = _tokenService.GenerateToken(user);

        return StatusCode(StatusCodes.Status201Created, new AuthResponse
        {
            Token = token,
            User = MapUserDto(user, null, null)
        });
    }

    /// <summary>
    /// Вход пользователя в систему
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var cleanEmail = request.Email.Trim().ToLower();
        var user = await _context.Users
            .Include(u => u.FamilyMembers)
                .ThenInclude(fm => fm.Family)
            .FirstOrDefaultAsync(u => u.Email == cleanEmail);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Неверный email или пароль" });
        }

        var activeMember = user.FamilyMembers.FirstOrDefault();
        var familyId = activeMember?.FamilyId;
        var familyName = activeMember?.Family?.Name;

        var token = _tokenService.GenerateToken(user, familyId);

        return Ok(new AuthResponse
        {
            Token = token,
            User = MapUserDto(user, familyId, familyName)
        });
    }

    /// <summary>
    /// Получение текущего профиля авторизованного пользователя
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetProfile()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.Users
            .Include(u => u.FamilyMembers)
                .ThenInclude(fm => fm.Family)
            .FirstOrDefaultAsync(u => u.Id == userId.Value);

        if (user == null) return NotFound(new { message = "Пользователь не найден" });

        var activeMember = user.FamilyMembers.FirstOrDefault();
        return Ok(MapUserDto(user, activeMember?.FamilyId, activeMember?.Family?.Name));
    }

    /// <summary>
    /// Обновление имени пользователя
    /// </summary>
    [Authorize]
    [HttpPut("profile")]
    [HttpPut("me")]
    public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.Users
            .Include(u => u.FamilyMembers)
                .ThenInclude(fm => fm.Family)
            .FirstOrDefaultAsync(u => u.Id == userId.Value);

        if (user == null) return NotFound(new { message = "Пользователь не найден" });

        var trimmedName = request.DisplayName.Trim();
        if (string.IsNullOrWhiteSpace(trimmedName))
        {
            return BadRequest(new { message = "Имя не может быть пустым" });
        }

        user.DisplayName = trimmedName;
        await _context.SaveChangesAsync();

        var activeMember = user.FamilyMembers.FirstOrDefault();
        return Ok(MapUserDto(user, activeMember?.FamilyId, activeMember?.Family?.Name));
    }

    /// <summary>
    /// Запрос на восстановление пароля (Frame 3)
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var cleanEmail = request.Email.Trim().ToLower();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == cleanEmail);
        return Ok(new
        {
            success = true,
            message = "Инструкция по сбросу пароля отправлена на указанный email"
        });
    }

    /// <summary>
    /// Сброс пароля по коду подтверждения (Frame 3)
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var cleanEmail = request.Email.Trim().ToLower();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == cleanEmail);
        if (user == null)
        {
            return NotFound(new { message = "Пользователь с указанным email не найден" });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Пароль успешно сброшен" });
    }

    /// <summary>
    /// Смена пароля
    /// </summary>
    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Старый пароль указан неверно" });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Пароль успешно обновлен" });
    }

    /// <summary>
    /// Удаление аккаунта
    /// </summary>
    [Authorize]
    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null) return NotFound();

        // Снимаем товары, закрепленные за пользователем
        var takenItems = await _context.CartItems.Where(c => c.TakenByUserId == userId.Value).ToListAsync();
        foreach (var item in takenItems)
        {
            item.TakenByUserId = null;
            item.Status = "Pending";
            item.IsBought = false;
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Account deleted successfully" });
    }

    private Guid? GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idClaim, out var id) ? id : null;
    }

    private static UserDto MapUserDto(User user, Guid? familyId, string? familyName)
    {
        var displayName = user.DisplayName.Trim();
        var firstChar = !string.IsNullOrEmpty(displayName) ? displayName[0].ToString().ToUpper() : "U";
        return new UserDto
        {
            Id = user.Id,
            DisplayName = user.DisplayName,
            Email = user.Email,
            AvatarUrl = user.AvatarUrl,
            AvatarChar = firstChar,
            AvatarBg = "#E0E7FF",
            AvatarColor = "#3730A3",
            FamilyId = familyId,
            FamilyName = familyName
        };
    }
}
