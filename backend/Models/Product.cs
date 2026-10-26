using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductBasket.Api.Models;

[Table("products")]
public class Product
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Unit { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Category { get; set; } = "Продукты";

    [MaxLength(50)]
    public string? ImageKey { get; set; }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    [MaxLength(20)]
    public string? Emoji { get; set; }

    public Guid? FamilyId { get; set; }
    public Family? Family { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
