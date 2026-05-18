using Bogus;
using Microsoft.EntityFrameworkCore;
using UsersRest.Data;
using UsersRest.Models;

namespace UsersRest.Data;

public static class DataSeeder
{
    private const int UserCount = 10_000;

    public static async Task SeedAsync(AppDbContext db, ILogger logger)
    {
        var schema = db.Model.GetDefaultSchema() ?? "users_rest_cs";

        // Create schema
        await db.Database.ExecuteSqlRawAsync($@"CREATE SCHEMA IF NOT EXISTS ""{schema}"";");

        // Create table using EF column names (not EnsureCreated which checks globally)
        await db.Database.ExecuteSqlRawAsync($@"
            CREATE TABLE IF NOT EXISTS ""{schema}"".users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                email VARCHAR(200) NOT NULL UNIQUE,
                age INTEGER NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS ix_{schema}_users_role ON ""{schema}"".users (role);
            CREATE INDEX IF NOT EXISTS ix_{schema}_users_created ON ""{schema}"".users (created_at);
        ");

        var count = await db.Users.CountAsync();
        if (count > 0) { logger.LogInformation("Already seeded: {Count} users in '{Schema}'", count, schema); return; }

        logger.LogInformation("Seeding {Count} users into '{Schema}'...", UserCount, schema);

        var idx = 0;
        var faker = new Faker<User>()
            .RuleFor(u => u.Id, _ => Guid.NewGuid())
            .RuleFor(u => u.Name, f => f.Name.FullName())
            .RuleFor(u => u.Email, (f, u) => $"u{Interlocked.Increment(ref idx)}@{f.Internet.DomainName()}")
            .RuleFor(u => u.Age, f => f.Random.Int(18, 80))
            .RuleFor(u => u.Role, f => f.PickRandom("user", "user", "user", "admin"))
            .RuleFor(u => u.CreatedAt, f => f.Date.Recent(365).ToUniversalTime())
            .RuleFor(u => u.UpdatedAt, (_, u) => u.CreatedAt);

        const int batchSize = 500;
        for (int i = 0; i < UserCount; i += batchSize)
        {
            var batch = faker.Generate(Math.Min(batchSize, UserCount - i));
            await db.Users.AddRangeAsync(batch);
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            logger.LogInformation("  Seeded {Done}/{Total}", Math.Min(i + batchSize, UserCount), UserCount);
        }
        logger.LogInformation("Done! {Count} users in '{Schema}'", UserCount, schema);
    }

    public static async Task ResetAsync(AppDbContext db, ILogger logger)
    {
        var schema = db.Model.GetDefaultSchema() ?? "users_rest_cs";
        logger.LogWarning("RESETTING DATABASE in '{Schema}'...", schema);
        
        await db.Database.ExecuteSqlRawAsync($"TRUNCATE TABLE \"{schema}\".users RESTART IDENTITY CASCADE;");
        
        await SeedAsync(db, logger);
    }
}