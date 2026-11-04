using Microsoft.EntityFrameworkCore;

namespace Gastos.Api;

public class GastosDbContext(DbContextOptions<GastosDbContext> options) : DbContext(options)
{
    public DbSet<Expense> Expenses => Set<Expense>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Expense>(e =>
        {
            e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            e.Property(x => x.CategoryId).HasMaxLength(50).IsRequired();
            e.Property(x => x.Note).HasMaxLength(200);
            e.HasIndex(x => x.Date);
        });
    }
}
