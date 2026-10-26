using System.ComponentModel.DataAnnotations;

namespace ProductBasket.Api.Dtos;

public class CreateFamilyRequest
{
    [Required(ErrorMessage = "Название группы обязательно")]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}

public class JoinFamilyRequest
{
    [Required(ErrorMessage = "Код приглашения обязателен")]
    [MaxLength(16)]
    public string InviteCode { get; set; } = string.Empty;
}

public class FamilyResponse
{
    public Guid FamilyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string InviteCode { get; set; } = string.Empty;
    public string Role { get; set; } = "Member";
}

public class FamilyMemberDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "Member";
    public bool IsCurrentUser { get; set; }
    public string? AvatarChar { get; set; }
    public string? AvatarBg { get; set; }
    public string? AvatarColor { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class UpdateFamilyNameRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}

public class FamilyDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int MembersCount { get; set; }
    public List<FamilyMemberDto> Members { get; set; } = new();
}
