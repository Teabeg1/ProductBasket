using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductBasket.Api.Models;

[Table("cart_items")]
public class CartItem
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid FamilyId { get; set; }
    public Family Family { get; set; } = null!;

    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Unit { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? ImageKey { get; set; }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    [MaxLength(20)]
    public string? Emoji { get; set; }

    public int Quantity { get; set; } = 1;

    [MaxLength(20)]
    public string Status { get; set; } = "Pending"; // "Pending", "Taken", "Purchased"

    public Guid? TakenByUserId { get; set; }
    public User? TakenByUser { get; set; }

    public bool IsBought { get; set; } = false;

    public Guid? EventId { get; set; }
    public Event? Event { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
