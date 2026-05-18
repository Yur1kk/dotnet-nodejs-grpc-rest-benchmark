using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using UsersRest.Data;
using UsersRest.Endpoints;

// ── Performance tuning ──────────────────────────────────────────────────────
ThreadPool.SetMinThreads(200, 200);
ThreadPool.SetMaxThreads(1000, 1000);

var builder = WebApplication.CreateBuilder(args);
builder.Logging.SetMinimumLevel(LogLevel.Information);

// ── Config from ENV ──────────────────────────────────────────────────────────
var schema = Env("DB_SCHEMA", "users_rest_cs");
var httpPort = int.Parse(Env("PORT", "3012"));
var connStr = $"Host={Env("DB_HOST","postgres")};Port={Env("DB_PORT","5432")};" +
              $"Database={Env("DB_NAME","diploma_db")};Username={Env("DB_USER","diploma")};" +
              $"Password={Env("DB_PASS","diploma_pass")};" +
              $"Maximum Pool Size=300;Minimum Pool Size=50;Command Timeout=60;";

// ── DI ───────────────────────────────────────────────────────────────────────
builder.Services.AddSingleton(new DbSchemaConfig { Schema = schema });
builder.Services.AddDbContextPool<AppDbContext>(
    (sp, opts) => opts.UseNpgsql(connStr),
    poolSize: 256);

// ── Kestrel ──────────────────────────────────────────────────────────────────
builder.WebHost.ConfigureKestrel(o =>
{
    o.ListenAnyIP(httpPort, l => l.Protocols = HttpProtocols.Http1AndHttp2);
    o.Limits.MaxConcurrentConnections = null;
    o.Limits.MaxConcurrentUpgradedConnections = null;
    o.Limits.MaxRequestBodySize = 10 * 1024 * 1024;
    o.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
    o.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
});

var app = builder.Build();

// ── DB init ──────────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await DataSeeder.SeedAsync(db, logger);
}

app.MapUserEndpoints();
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "users-rest-cs" }));

app.MapPost("/internal/reset", async (AppDbContext db, ILogger<Program> logger) =>
{
    await DataSeeder.ResetAsync(db, logger);
    return Results.Ok(new { status = "reset_complete", service = "users-rest" });
});

app.Run();

static string Env(string key, string fallback) =>
    Environment.GetEnvironmentVariable(key) ?? fallback;
