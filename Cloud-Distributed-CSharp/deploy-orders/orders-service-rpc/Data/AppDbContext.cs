using Microsoft.EntityFrameworkCore;
using OrdersRpc.Models;

namespace OrdersRpc.Data;

public class DbSchemaConfig
{
    public string Schema { get; set; } = "orders_rpc_cs";
}

public class AppDbContext : DbContext
{
    private readonly DbSchemaConfig _cfg;

    public AppDbContext(DbContextOptions<AppDbContext> options, DbSchemaConfig cfg) : base(options)
    {
        _cfg = cfg;
    }

    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.HasDefaultSchema(_cfg.Schema);
        m.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.HasKey(o => o.Id);
            e.Property(o => o.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            e.Property(o => o.UserId).HasColumnName("user_id").HasMaxLength(200).IsRequired();
            e.Property(o => o.Product).HasColumnName("product").HasMaxLength(200).IsRequired();
            e.Property(o => o.Quantity).HasColumnName("quantity");
            e.Property(o => o.Price).HasColumnName("price");
            e.Property(o => o.Status).HasColumnName("status").HasMaxLength(50).HasDefaultValue("pending");
            e.Property(o => o.CreatedAt).HasColumnName("created_at");
            e.Property(o => o.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(o => o.UserId);
            e.HasIndex(o => o.Status);
            e.HasIndex(o => o.CreatedAt);
        });
        base.OnModelCreating(m);
    }
}