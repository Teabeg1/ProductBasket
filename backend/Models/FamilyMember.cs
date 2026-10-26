using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductBasket.Api.Models;

[Table("family_members")]
public class FamilyMember
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid FamilyId { get; set; }
    public Family Family { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [MaxLength(20)]
    public string Role { get; set; } = "Member"; // "Admin" or "Member"

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
