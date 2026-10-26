using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductBasket.Api.Models;

[Table("families")]
public class Family
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string InviteCode { get; set; } = string.Empty;

    public Guid CreatorUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<FamilyMember> Members { get; set; } = new();
    public List<CartItem> CartItems { get; set; } = new();
    public List<Event> Events { get; set; } = new();
    public List<Product> CustomProducts { get; set; } = new();
}
