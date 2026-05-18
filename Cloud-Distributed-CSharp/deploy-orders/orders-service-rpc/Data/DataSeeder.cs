using Bogus;
using Microsoft.EntityFrameworkCore;
using OrdersRpc.Data;
using OrdersRpc.Models;

namespace OrdersRpc.Data;

public static class DataSeeder
{
    private const int OrderCount = 20_000;

    public static async Task SeedAsync(AppDbContext db, ILogger logger)
    {
        var schema = db.Model.GetDefaultSchema() ?? "orders_rpc_cs";
        // Explicitly create schema and table — EnsureCreatedAsync skips if ANY table exists globally
        await db.Database.ExecuteSqlRawAsync($@"
            CREATE SCHEMA IF NOT EXISTS ""{schema}"";
            CREATE TABLE IF NOT EXISTS ""{schema}"".orders (
                id UUID PRIMARY KEY,
                user_id TEXT NOT NULL,
                product TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price DOUBLE PRECISION NOT NULL,
                status TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_{schema}_orders_status ON ""{schema}"".orders (status);
            CREATE INDEX IF NOT EXISTS ix_{schema}_orders_created ON ""{schema}"".orders (created_at);
        ");

        var count = await db.Orders.CountAsync();
        if (count > 0) { logger.LogInformation("Already seeded: {Count} orders in '{Schema}'", count, schema); return; }

        logger.LogInformation("Seeding {Count} orders into '{Schema}'...", OrderCount, schema);

        var products = new[] { "Laptop","Phone","Tablet","Monitor","Keyboard","Mouse","Headphones","Camera","Watch","Speaker" };
        var statuses = new[] { "pending","processing","completed","cancelled" };

        var faker = new Faker<Order>()
            .RuleFor(o => o.Id, _ => Guid.NewGuid())
            .RuleFor(o => o.UserId, f => Guid.NewGuid().ToString())
            .RuleFor(o => o.Product, f => f.PickRandom(products))
            .RuleFor(o => o.Quantity, f => f.Random.Int(1, 10))
            .RuleFor(o => o.Price, f => Math.Round(f.Random.Double(9.99, 999.99), 2))
            .RuleFor(o => o.Status, f => f.PickRandom(statuses))
            .RuleFor(o => o.CreatedAt, f => f.Date.Recent(365).ToUniversalTime())
            .RuleFor(o => o.UpdatedAt, (_, o) => o.CreatedAt);

        const int batchSize = 500;
        for (int i = 0; i < OrderCount; i += batchSize)
        {
            var batch = faker.Generate(Math.Min(batchSize, OrderCount - i));
            await db.Orders.AddRangeAsync(batch);
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            logger.LogInformation("  Seeded {Done}/{Total}", Math.Min(i + batchSize, OrderCount), OrderCount);
        }
        logger.LogInformation("Done! {Count} orders in '{Schema}'", OrderCount, schema);
    }
}