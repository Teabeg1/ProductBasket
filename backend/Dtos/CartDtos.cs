using System.ComponentModel.DataAnnotations;

namespace ProductBasket.Api.Dtos;

public class CartItemDto
{
    public Guid Id { get; set; }
    public Guid? ProductId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public string? ImageKey { get; set; }
    public string? ImageUrl { get; set; }
    public string? Emoji { get; set; }
    public int Count { get; set; }
    public string Status { get; set; } = "Pending";
    public Guid? AssignedToUserId { get; set; }
    public Guid? TakenByUserId => AssignedToUserId;
    public string? TakenByName { get; set; }
    public bool IsBought { get; set; }
    public Guid? EventId { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AddToCartRequest
{
    public Guid? ProductId { get; set; }

    [MaxLength(150)]
    public string? Title { get; set; }

    [MaxLength(100)]
    public string? Unit { get; set; }

    [MaxLength(50)]
    public string? ImageKey { get; set; }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    [MaxLength(20)]
    public string? Emoji { get; set; }

    public int Count { get; set; } = 1;

    public Guid? EventId { get; set; }

    public Guid? FamilyId { get; set; }
}

public class UpdateCartItemRequest
{
    [Range(0, 1000)]
    public int Count { get; set; }
}

public class CartActionResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public CartItemDto? Item { get; set; }
}
