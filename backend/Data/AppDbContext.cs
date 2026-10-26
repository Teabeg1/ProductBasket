using Microsoft.EntityFrameworkCore;
using ProductBasket.Api.Models;

namespace ProductBasket.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Family> Families => Set<Family>();
    public DbSet<FamilyMember> FamilyMembers => Set<FamilyMember>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Event> Events => Set<Event>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
        });

        // Family
        modelBuilder.Entity<Family>(entity =>
        {
            entity.HasIndex(f => f.InviteCode).IsUnique();
        });

        // FamilyMember
        modelBuilder.Entity<FamilyMember>(entity =>
        {
            entity.HasIndex(fm => new { fm.FamilyId, fm.UserId }).IsUnique();

            entity.HasOne(fm => fm.Family)
                  .WithMany(f => f.Members)
                  .HasForeignKey(fm => fm.FamilyId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(fm => fm.User)
                  .WithMany(u => u.FamilyMembers)
                  .HasForeignKey(fm => fm.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Product
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasOne(p => p.Family)
                  .WithMany(f => f.CustomProducts)
                  .HasForeignKey(p => p.FamilyId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // CartItem
        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.HasOne(c => c.Family)
                  .WithMany(f => f.CartItems)
                  .HasForeignKey(c => c.FamilyId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.Product)
                  .WithMany()
                  .HasForeignKey(c => c.ProductId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(c => c.TakenByUser)
                  .WithMany()
                  .HasForeignKey(c => c.TakenByUserId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(c => c.Event)
                  .WithMany(e => e.CartItems)
                  .HasForeignKey(c => c.EventId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Event
        modelBuilder.Entity<Event>(entity =>
        {
            entity.HasOne(e => e.Family)
                  .WithMany(f => f.Events)
                  .HasForeignKey(e => e.FamilyId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
