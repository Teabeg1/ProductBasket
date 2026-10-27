using System.ComponentModel.DataAnnotations;

namespace ProductBasket.Api.Dtos;

public class EventDto
{
    public Guid Id { get; set; }
    public Guid FamilyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string EventDate { get; set; } = string.Empty;
    public string Icon { get; set; } = "🎉";
    public string BadgeBg { get; set; } = "#FFF0F4";
    public bool HasCart { get; set; }
    public bool IsCompleted { get; set; }
    public string? CompletedAt { get; set; }
    public int MembersCount { get; set; }
    public EventCartStatsDto? CartStats { get; set; }
}

public class CreateEventRequest
{
    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string EventDate { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Icon { get; set; } = "🎉";

    public Guid? FamilyId { get; set; }

    public bool? HasCart { get; set; }
}

public class EventCartStatsDto
{
    public int Total { get; set; }
    public int Assigned { get; set; }
    public int Bought { get; set; }
}
