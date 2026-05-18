using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using OrdersRpc.Data;
using OrdersRpc.Services;

// ── Performance tuning ──────────────────────────────────────────────────────
ThreadPool.SetMinThreads(200, 200);
ThreadPool.SetMaxThreads(1000, 1000);

var builder = WebApplication.CreateBuilder(args);
builder.Logging.SetMinimumLevel(LogLevel.Warning);

var schema = Env("DB_SCHEMA", "orders_rpc_cs");
var grpcPort = int.Parse(Env("GRPC_PORT", "5015"));
var connStr = $"Host={Env("DB_HOST","postgres")};Port={Env("DB_PORT","5432")};" +
              $"Database={Env("DB_NAME","diploma_db")};Username={Env("DB_USER","diploma")};" +
              $"Password={Env("DB_PASS","diploma_pass")};" +
              $"Maximum Pool Size=300;Minimum Pool Size=50;Command Timeout=60;";

builder.Services.AddSingleton(new DbSchemaConfig { Schema = schema });
builder.Services.AddPooledDbContextFactory<AppDbContext>(
    opts => opts.UseNpgsql(connStr),
    poolSize: 512);

builder.Services.AddGrpc(o =>
{
    o.MaxReceiveMessageSize = 16 * 1024 * 1024;
    o.MaxSendMessageSize = 16 * 1024 * 1024;
    o.EnableDetailedErrors = false;
});

builder.WebHost.ConfigureKestrel(o =>
{
    o.ListenAnyIP(grpcPort, l => l.Protocols = HttpProtocols.Http2);
    o.Limits.MaxConcurrentConnections = 10000;
    o.Limits.Http2.MaxStreamsPerConnection = 5000;
    o.Limits.Http2.InitialConnectionWindowSize = 2 * 1024 * 1024; // 2 MB
    o.Limits.Http2.InitialStreamWindowSize = 1024 * 1024;        // 1 MB
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<AppDbContext>>();
    await using var db = await dbFactory.CreateDbContextAsync();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await DataSeeder.SeedAsync(db, logger);
}

app.MapGrpcService<OrdersGrpcService>();
app.MapGet("/", () => "gRPC Orders Service (C#) — use a gRPC client");

app.Run();

static string Env(string key, string fallback) =>
    Environment.GetEnvironmentVariable(key) ?? fallback;
