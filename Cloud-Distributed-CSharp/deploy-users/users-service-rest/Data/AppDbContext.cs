using Microsoft.EntityFrameworkCore;
using UsersRest.Models;

namespace UsersRest.Data;

public class DbSchemaConfig
{
    public string Schema { get; set; } = "users_rest_cs";
}

public class AppDbContext : DbContext
{
    private readonly DbSchemaConfig _cfg;

    public AppDbContext(DbContextOptions<AppDbContext> options, DbSchemaConfig cfg) : base(options)
    {
        _cfg = cfg;
    }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.HasDefaultSchema(_cfg.Schema);
        m.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(u => u.Id);
            e.Property(u => u.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            e.Property(u => u.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            e.Property(u => u.Email).HasColumnName("email").HasMaxLength(200).IsRequired();
            e.Property(u => u.Age).HasColumnName("age");
            e.Property(u => u.Role).HasColumnName("role").HasMaxLength(50).HasDefaultValue("user");
            e.Property(u => u.CreatedAt).HasColumnName("created_at");
            e.Property(u => u.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(u => u.Email).IsUnique();
            e.HasIndex(u => u.Role);
            e.HasIndex(u => u.CreatedAt);
        });
        base.OnModelCreating(m);
    }
}