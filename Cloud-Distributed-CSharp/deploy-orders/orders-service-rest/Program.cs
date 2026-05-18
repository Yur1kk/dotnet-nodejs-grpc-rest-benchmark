using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using OrdersRest.Data;
using OrdersRest.Endpoints;

// ── Performance tuning ──────────────────────────────────────────────────────
ThreadPool.SetMinThreads(200, 200);
ThreadPool.SetMaxThreads(1000, 1000);

var builder = WebApplication.CreateBuilder(args);
builder.Logging.SetMinimumLevel(LogLevel.Information);

var schema = Env("DB_SCHEMA", "orders_rest_cs");
var httpPort = int.Parse(Env("PORT", "3014"));
var connStr = $"Host={Env("DB_HOST","postgres")};Port={Env("DB_PORT","5432")};" +
              $"Database={Env("DB_NAME","diploma_db")};Username={Env("DB_USER","diploma")};" +
              $"Password={Env("DB_PASS","diploma_pass")};" +
              $"Maximum Pool Size=300;Minimum Pool Size=50;Command Timeout=60;";

builder.Services.AddSingleton(new DbSchemaConfig { Schema = schema });
builder.Services.AddDbContextPool<AppDbContext>(
    (sp, opts) => opts.UseNpgsql(connStr),
    poolSize: 256);

builder.WebHost.ConfigureKestrel(o =>
{
    o.ListenAnyIP(httpPort, l => l.Protocols = HttpProtocols.Http1AndHttp2);
    o.Limits.MaxConcurrentConnections = null;
    o.Limits.MaxConcurrentUpgradedConnections = null;
    o.Limits.MaxRequestBodySize = 10 * 1024 * 1024;
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await DataSeeder.SeedAsync(db, logger);
}

app.MapOrderEndpoints();
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "orders-rest-cs" }));

app.MapPost("/internal/reset", async (AppDbContext db, ILogger<Program> logger) =>
{
    await DataSeeder.ResetAsync(db, logger);
    return Results.Ok(new { status = "reset_complete", service = "orders-rest" });
});

app.Run();

static string Env(string key, string fallback) =>
    Environment.GetEnvironmentVariable(key) ?? fallback;
