using Microsoft.AspNetCore.Server.Kestrel.Core;

// ── Performance ─────────────────────────────────────────────────────────────
ThreadPool.SetMinThreads(200, 200);
ThreadPool.SetMaxThreads(1000, 1000);

var builder = WebApplication.CreateBuilder(args);
builder.Logging.SetMinimumLevel(LogLevel.Warning);

var httpPort = int.Parse(Env("PORT", "3010"));
var usersUrl = Env("USERS_SERVICE_URL", "http://users-service-rest-cs:3012");
var ordersUrl = Env("ORDERS_SERVICE_URL", "http://orders-service-rest-cs:3014");

// Optimized HttpClient with connection pooling
builder.Services.AddHttpClient("users", c =>
{
    c.BaseAddress = new Uri(usersUrl);
    c.Timeout = TimeSpan.FromSeconds(30);
    c.DefaultRequestHeaders.Add("Accept", "application/json");
}).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(5),
    PooledConnectionIdleTimeout = TimeSpan.FromMinutes(2),
    MaxConnectionsPerServer = int.MaxValue,
    EnableMultipleHttp2Connections = true,
    KeepAlivePingDelay = TimeSpan.FromSeconds(30),
    KeepAlivePingTimeout = TimeSpan.FromSeconds(10),
});

builder.Services.AddHttpClient("orders", c =>
{
    c.BaseAddress = new Uri(ordersUrl);
    c.Timeout = TimeSpan.FromSeconds(30);
    c.DefaultRequestHeaders.Add("Accept", "application/json");
}).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(5),
    PooledConnectionIdleTimeout = TimeSpan.FromMinutes(2),
    MaxConnectionsPerServer = int.MaxValue,
    EnableMultipleHttp2Connections = true,
});

builder.WebHost.ConfigureKestrel(o =>
{
    o.ListenAnyIP(httpPort, l => l.Protocols = HttpProtocols.Http1AndHttp2);
    o.Limits.MaxConcurrentConnections = null;
    o.Limits.MaxConcurrentUpgradedConnections = null;
    o.Limits.MaxRequestBodySize = 10 * 1024 * 1024;
});

var app = builder.Build();

// ── /users proxy ─────────────────────────────────────────────────────────────
var usersGrp = app.MapGroup("/api/users");

usersGrp.MapGet("/", async (HttpRequest req, IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("users");
    var qs = req.QueryString.Value ?? "";
    var resp = await client.GetAsync($"/users{qs}");
    var body = await resp.Content.ReadAsStringAsync();
    return Results.Content(body, "application/json", System.Text.Encoding.UTF8, (int)resp.StatusCode);
});

usersGrp.MapGet("/search", async (HttpRequest req, IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("users");
    var qs = req.QueryString.Value ?? "";
    var resp = await client.GetAsync($"/users/search{qs}");
    var body = await resp.Content.ReadAsStringAsync();
    return Results.Content(body, "application/json", System.Text.Encoding.UTF8, (int)resp.StatusCode);
});

usersGrp.MapGet("/{id}", async (string id, IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("users");
    var resp = await client.GetAsync($"/users/{id}");
    var body = await resp.Content.ReadAsStringAsync();
    return Results.Content(body, "application/json", System.Text.Encoding.UTF8, (int)resp.StatusCode);
});

usersGrp.MapPost("/", async (HttpRequest req, IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("users");
    var content = new StreamContent(req.Body);
    content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
    var resp = await client.PostAsync("/users", content);
    var body = await resp.Content.ReadAsStringAsync();
    return Results.Content(body, "application/json", System.Text.Encoding.UTF8, (int)resp.StatusCode);
});

usersGrp.MapPut("/{id}", async (string id, HttpRequest req, IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("users");
    var content = new StreamContent(req.Body);
    content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
    var resp = await client.PutAsync($"/users/{id}", content);
    var body = await resp.Content.ReadAsStringAsync();
    return Results.Content(body, "application/json", System.Text.Encoding.UTF8, (int)resp.StatusCode);
});

usersGrp.MapDelete("/{id}", async (string id, IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("users");
    var resp = await client.DeleteAsync($"/users/{id}");
    var body = await resp.Content.ReadAsStringAsync();
    return Results.Content(body, "application/json", System.Text.Encoding.UTF8, (int)resp.StatusCode);
});

// ── /orders proxy ─────────────────────────────────────────────────────────────
var ordersGrp = app.MapGroup("/api/orders");

ordersGrp.MapGet("/", async (HttpRequest req, IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("orders");
    var qs = req.QueryString.Value ?? "";
    var resp = await client.GetAsync($"/orders{qs}");
    var body = await resp.Content.ReadAsStringAsync();
    return Results.Content(body, "application/json", System.Text.Encoding.UTF8, (int)resp.StatusCode);
});

ordersGrp.MapGet("/{id}", async (string id, IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("orders");
    var resp = await client.GetAsync($"/orders/{id}");
    var body = await resp.Content.ReadAsStringAsync();
    return Results.Content(body, "application/json", System.Text.Encoding.UTF8, (int)resp.StatusCode);
});

ordersGrp.MapPost("/", async (HttpRequest req, IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("orders");
    var content = new StreamContent(req.Body);
    content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
    var resp = await client.PostAsync("/orders", content);
    var body = await resp.Content.ReadAsStringAsync();
    return Results.Content(body, "application/json", System.Text.Encoding.UTF8, (int)resp.StatusCode);
});

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "rest-gateway-cs" }));

app.Run();

static string Env(string key, string fallback) =>
    Environment.GetEnvironmentVariable(key) ?? fallback;
