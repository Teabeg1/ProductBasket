using System.ComponentModel.DataAnnotations;

namespace ProductBasket.Api.Dtos;

public class ProductDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public string Category { get; set; } = "Продукты";
    public string? ImageKey { get; set; }
    public string? ImageUrl { get; set; }
    public string? Emoji { get; set; }
    public bool IsCustom { get; set; }
    public Guid? FamilyId { get; set; }
}

public class CreateCustomProductRequest
{
    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Unit { get; set; }

    [MaxLength(100)]
    public string? Category { get; set; }

    [MaxLength(20)]
    public string? Emoji { get; set; }

    public Guid? FamilyId { get; set; }
}
