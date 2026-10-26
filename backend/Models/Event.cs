using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductBasket.Api.Models;

[Table("events")]
public class Event
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid FamilyId { get; set; }
    public Family Family { get; set; } = null!;

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string EventDate { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Icon { get; set; } = "🎉";

    [MaxLength(20)]
    public string BadgeBg { get; set; } = "#FFF0F4";

    public bool HasCart { get; set; } = false;

    public bool IsCompleted { get; set; } = false;

    [MaxLength(50)]
    public string? CompletedAt { get; set; }

    public Guid CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<CartItem> CartItems { get; set; } = new();
}
