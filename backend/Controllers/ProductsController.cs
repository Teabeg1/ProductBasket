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
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<CartHub> _hubContext;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(AppDbContext context, IHubContext<CartHub> hubContext, ILogger<ProductsController> logger)
    {
        _context = context;
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Получение каталога товаров (базовые товары + пользовательские товары семьи)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<ProductDto>>> GetProducts([FromQuery] string? familyId)
    {
        var userId = GetCurrentUserId();
        var query = _context.Products.AsQueryable();

        var hasFamilyId = Guid.TryParse(familyId, out var parsedFamilyId);
        if (userId.HasValue)
        {
            var myFamilyIds = await _context.FamilyMembers
                .Where(fm => fm.UserId == userId.Value)
                .Select(fm => fm.FamilyId)
                .ToListAsync();

            if (hasFamilyId)
            {
                if (myFamilyIds.Contains(parsedFamilyId))
                {
                    query = query.Where(p => p.FamilyId == null || p.FamilyId == parsedFamilyId);
                }
                else
                {
                    query = query.Where(p => p.FamilyId == null);
                }
            }
            else
            {
                query = query.Where(p => p.FamilyId == null || myFamilyIds.Contains(p.FamilyId!.Value));
            }
        }
        else
        {
            query = query.Where(p => p.FamilyId == null);
        }

        var products = await query.OrderBy(p => p.FamilyId != null).ThenBy(p => p.Title).ToListAsync();

        return Ok(products.Select(MapProductDto).ToList());
    }

    /// <summary>
    /// Создание пользовательского товара для группы
    /// </summary>
    [HttpPost("custom")]
    public async Task<ActionResult<ProductDto>> CreateCustomProduct([FromBody] CreateCustomProductRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var targetFamilyId = await ResolveFamilyIdAsync(userId.Value, request.FamilyId);
        if (targetFamilyId == null)
        {
            return BadRequest(new { message = "Группа не определена или вы не являетесь её участником." });
        }

        var customProduct = new Product
        {
            FamilyId = targetFamilyId.Value,
            Title = request.Title.Trim(),
            Unit = string.IsNullOrWhiteSpace(request.Unit) ? "1 шт" : request.Unit.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "Свои товары" : request.Category.Trim(),
            Emoji = string.IsNullOrWhiteSpace(request.Emoji) ? "🛍️" : request.Emoji.Trim(),
            ImageKey = null,
            ImageUrl = null,
            CreatedAt = DateTime.UtcNow
        };

        _context.Products.Add(customProduct);
        await _context.SaveChangesAsync();

        var fStr = targetFamilyId.Value.ToString().ToLowerInvariant();
        var pStr = customProduct.Id.ToString().ToLowerInvariant();
        await _hubContext.Clients.Group(fStr).SendAsync("CustomProductCreated", new
        {
            familyId = fStr,
            productId = pStr,
            title = customProduct.Title,
            product = MapProductDto(customProduct)
        });

        return StatusCode(StatusCodes.Status201Created, MapProductDto(customProduct));
    }

    /// <summary>
    /// Удаление пользовательского товара
    /// </summary>
    [HttpDelete("custom/{id:guid}")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCustomProduct([FromRoute] Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound(new { message = "Товар не найден" });

        if (product.FamilyId == null)
        {
            return BadRequest(new { message = "Базовый системный товар нельзя удалить" });
        }

        var isMember = await _context.FamilyMembers
            .AnyAsync(fm => fm.FamilyId == product.FamilyId.Value && fm.UserId == userId.Value);

        if (!isMember)
        {
            return Forbid();
        }

        var familyId = product.FamilyId.Value;

        // Также удаляем товар из корзины семьи, если он там был добавлен
        var cartItems = await _context.CartItems
            .Where(c => c.FamilyId == familyId && c.ProductId == product.Id)
            .ToListAsync();

        _context.CartItems.RemoveRange(cartItems);
        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        var famStr = familyId.ToString().ToLowerInvariant();
        var prodStr = id.ToString().ToLowerInvariant();

        await _hubContext.Clients.Group(famStr).SendAsync("CartUpdated", new
        {
            familyId = famStr
        });

        await _hubContext.Clients.Group(famStr).SendAsync("CustomProductDeleted", new
        {
            familyId = famStr,
            productId = prodStr
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

    private static ProductDto MapProductDto(Product p)
    {
        return new ProductDto
        {
            Id = p.Id,
            Title = p.Title,
            Unit = p.Unit,
            Category = p.Category,
            ImageKey = p.ImageKey,
            ImageUrl = p.ImageUrl,
            Emoji = p.Emoji,
            IsCustom = p.FamilyId != null,
            FamilyId = p.FamilyId
        };
    }
}
