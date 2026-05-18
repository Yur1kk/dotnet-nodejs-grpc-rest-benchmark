using Grpc.Net.Client;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Orders;
using Users;

// ── Performance ─────────────────────────────────────────────────────────────
ThreadPool.SetMinThreads(200, 200);
ThreadPool.SetMaxThreads(1000, 1000);

var builder = WebApplication.CreateBuilder(args);
builder.Logging.SetMinimumLevel(LogLevel.Information);

var httpPort = int.Parse(Env("PORT", "3011"));
var usersAddr = Env("USERS_SERVICE_GRPC_URL", "http://users-service-rpc-cs:5013");
var ordersAddr = Env("ORDERS_SERVICE_GRPC_URL", "http://orders-service-rpc-cs:5015");

// Native gRPC client via IHttpClientFactory (Channel pooling built-in)
builder.Services.AddGrpcClient<UsersService.UsersServiceClient>(o => o.Address = new Uri(usersAddr))
    .ConfigureChannel(c =>
    {
        c.MaxRetryAttempts = 3;
        c.MaxReceiveMessageSize = 16 * 1024 * 1024;
        c.MaxSendMessageSize = 16 * 1024 * 1024;
    });

builder.Services.AddGrpcClient<OrdersService.OrdersServiceClient>(o => o.Address = new Uri(ordersAddr))
    .ConfigureChannel(c =>
    {
        c.MaxRetryAttempts = 3;
        c.MaxReceiveMessageSize = 16 * 1024 * 1024;
        c.MaxSendMessageSize = 16 * 1024 * 1024;
    });

builder.WebHost.ConfigureKestrel(o =>
{
    o.ListenAnyIP(httpPort, l => l.Protocols = HttpProtocols.Http1AndHttp2);
    o.Limits.MaxConcurrentConnections = null;
    o.Limits.MaxConcurrentUpgradedConnections = null;
    o.Limits.MaxRequestBodySize = 10 * 1024 * 1024;
});

var app = builder.Build();

// ── /api/users ────────────────────────────────────────────────────────────────
var usersGrp = app.MapGroup("/api/users");

usersGrp.MapGet("/", async (int page, int limit, UsersService.UsersServiceClient client) =>
{
    var resp = await client.GetUsersAsync(new GetUsersRequest { Page = page < 1 ? 1 : page, Limit = limit < 1 ? 10 : limit });
    return Results.Ok(new
    {
        data = resp.Data.Select(u => new { u.Id, u.Name, u.Email, u.Age, u.Role, u.CreatedAt, u.UpdatedAt }),
        meta = new { resp.Meta.Total, resp.Meta.Page, resp.Meta.Limit, resp.Meta.TotalPages }
    });
});

usersGrp.MapGet("/search", async (string? name, string? email, string? role, UsersService.UsersServiceClient client) =>
{
    var resp = await client.SearchUsersAsync(new SearchUsersRequest
    {
        Name = name ?? "",
        Email = email ?? "",
        Role = role ?? ""
    });
    return Results.Ok(new { data = resp.Data.Select(u => new { u.Id, u.Name, u.Email, u.Age, u.Role }) });
});

usersGrp.MapGet("/{id}", async (string id, UsersService.UsersServiceClient client) =>
{
    try
    {
        var user = await client.GetUserAsync(new GetUserRequest { Id = id });
        return Results.Ok(new { user.Id, user.Name, user.Email, user.Age, user.Role, user.CreatedAt, user.UpdatedAt });
    }
    catch (Grpc.Core.RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.NotFound)
    {
        return Results.NotFound();
    }
});

usersGrp.MapPost("/", async (CreateUserRequest req, UsersService.UsersServiceClient client) =>
{
    try
    {
        var user = await client.CreateUserAsync(req);
        return Results.Created($"/api/users/{user.Id}", new { user.Id, user.Name, user.Email, user.Age, user.Role });
    }
    catch (Grpc.Core.RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.AlreadyExists)
    {
        return Results.Conflict(new { message = ex.Status.Detail });
    }
});

usersGrp.MapDelete("/{id}", async (string id, UsersService.UsersServiceClient client) =>
{
    try
    {
        var user = await client.DeleteUserAsync(new DeleteUserRequest { Id = id });
        return Results.Ok(new { user.Id, user.Name, user.Email });
    }
    catch (Grpc.Core.RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.NotFound)
    {
        return Results.NotFound();
    }
});

// ── /api/orders ───────────────────────────────────────────────────────────────
var ordersGrp = app.MapGroup("/api/orders");

ordersGrp.MapGet("/", async (int page, int limit, OrdersService.OrdersServiceClient client) =>
{
    var resp = await client.GetOrdersAsync(new GetOrdersRequest { Page = page < 1 ? 1 : page, Limit = limit < 1 ? 10 : limit });
    return Results.Ok(new
    {
        data = resp.Data.Select(o => new { o.Id, o.UserId, o.Product, o.Quantity, o.Price, o.Status, o.CreatedAt }),
        meta = new { resp.Meta.Total, resp.Meta.Page, resp.Meta.Limit, resp.Meta.TotalPages }
    });
});

ordersGrp.MapGet("/{id}", async (string id, OrdersService.OrdersServiceClient client) =>
{
    try
    {
        var order = await client.GetOrderAsync(new GetOrderRequest { Id = id });
        return Results.Ok(new { order.Id, order.UserId, order.Product, order.Quantity, order.Price, order.Status });
    }
    catch (Grpc.Core.RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.NotFound)
    {
        return Results.NotFound();
    }
});

ordersGrp.MapPost("/", async (CreateOrderRequest req, OrdersService.OrdersServiceClient client) =>
{
    var order = await client.CreateOrderAsync(req);
    return Results.Created($"/api/orders/{order.Id}", new { order.Id, order.UserId, order.Product, order.Status });
});

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "rpc-gateway-cs" }));

app.Run();

static string Env(string key, string fallback) =>
    Environment.GetEnvironmentVariable(key) ?? fallback;
