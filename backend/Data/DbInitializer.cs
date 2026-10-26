using Microsoft.EntityFrameworkCore;
using ProductBasket.Api.Models;

namespace ProductBasket.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AppDbContext context)
    {
        // Seeding default catalog products
        if (!await context.Products.AnyAsync(p => p.FamilyId == null))
        {
            var defaultProducts = new List<Product>
            {
                new()
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111101"),
                    Title = "Яблоки",
                    Unit = "1 кг • Сезонные",
                    Category = "Фрукты",
                    ImageKey = "apple",
                    Emoji = "🍎"
                },
                new()
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111102"),
                    Title = "Молоко",
                    Unit = "930 мл • 3.2%",
                    Category = "Молочные продукты",
                    ImageKey = "milk",
                    Emoji = "🥛"
                },
                new()
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111103"),
                    Title = "Майонез",
                    Unit = "380 мл • Провансаль",
                    Category = "Соусы",
                    ImageKey = "mayo",
                    Emoji = "🥫"
                },
                new()
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111104"),
                    Title = "Огурцы",
                    Unit = "600 г • Гладкие",
                    Category = "Овощи",
                    ImageKey = "cucumbers",
                    Emoji = "🥒"
                },
                new()
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111105"),
                    Title = "Сыр",
                    Unit = "200 г • Тильзитер",
                    Category = "Молочные продукты",
                    ImageKey = "cheese",
                    Emoji = "🧀"
                },
                new()
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111106"),
                    Title = "Макароны",
                    Unit = "450 г • Перья",
                    Category = "Бакалея",
                    ImageKey = "pasta",
                    Emoji = "🍝"
                },
                new()
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111107"),
                    Title = "Сахар",
                    Unit = "1 кг • Кристаллический",
                    Category = "Бакалея",
                    ImageKey = "sugar",
                    Emoji = "🍚"
                },
                new()
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111108"),
                    Title = "Соль",
                    Unit = "1 кг • Каменная мелкая",
                    Category = "Бакалея",
                    ImageKey = "salt",
                    Emoji = "🧂"
                }
            };

            await context.Products.AddRangeAsync(defaultProducts);
            await context.SaveChangesAsync();
        }
    }
}
