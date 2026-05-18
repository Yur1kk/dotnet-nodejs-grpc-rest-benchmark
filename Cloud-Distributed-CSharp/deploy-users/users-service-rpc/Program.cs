using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using UsersRpc.Data;
using UsersRpc.Services;

// ── Performance tuning ──────────────────────────────────────────────────────
ThreadPool.SetMinThreads(200, 200);
ThreadPool.SetMaxThreads(1000, 1000);

var builder = WebApplication.CreateBuilder(args);
builder.Logging.SetMinimumLevel(LogLevel.Warning);

// ── Config from ENV ──────────────────────────────────────────────────────────
var schema = Env("DB_SCHEMA", "users_rpc_cs");
var grpcPort = int.Parse(Env("GRPC_PORT", "5013"));
var connStr = $"Host={Env("DB_HOST","postgres")};Port={Env("DB_PORT","5432")};" +
              $"Database={Env("DB_NAME","diploma_db")};Username={Env("DB_USER","diploma")};" +
              $"Password={Env("DB_PASS","diploma_pass")};" +
              $"Maximum Pool Size=300;Minimum Pool Size=50;Command Timeout=60;";

// ── DI ───────────────────────────────────────────────────────────────────────
builder.Services.AddSingleton(new DbSchemaConfig { Schema = schema });

// Use AddPooledDbContextFactory for high-performance concurrent gRPC calls
builder.Services.AddPooledDbContextFactory<AppDbContext>(opts =>
    opts.UseNpgsql(connStr),
    poolSize: 512);

builder.Services.AddGrpc(o =>
{
    o.MaxReceiveMessageSize = 16 * 1024 * 1024; // 16 MB
    o.MaxSendMessageSize = 16 * 1024 * 1024;
    o.EnableDetailedErrors = false;
});

// ── Kestrel: HTTP/2 only for gRPC ────────────────────────────────────────────
builder.WebHost.ConfigureKestrel(o =>
{
    o.ListenAnyIP(grpcPort, l => l.Protocols = HttpProtocols.Http2);
    o.Limits.MaxConcurrentConnections = 10000;
    o.Limits.Http2.MaxStreamsPerConnection = 5000;
    o.Limits.Http2.InitialConnectionWindowSize = 2 * 1024 * 1024; // 2 MB
    o.Limits.Http2.InitialStreamWindowSize = 1024 * 1024;        // 1 MB
});

var app = builder.Build();

// ── DB init ──────────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AppDbContext>>();
    await using var db = await dbFactory.CreateDbContextAsync();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await DataSeeder.SeedAsync(db, logger);
}

app.MapGrpcService<UsersGrpcService>();
app.MapGet("/", () => "gRPC Users Service (C#) — use a gRPC client");

app.Run();

static string Env(string key, string fallback) =>
    Environment.GetEnvironmentVariable(key) ?? fallback;
