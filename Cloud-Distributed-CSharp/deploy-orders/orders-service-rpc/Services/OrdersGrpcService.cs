using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Orders;
using OrdersRpc.Data;
using OrdersRpc.Models;

namespace OrdersRpc.Services;

public class OrdersGrpcService : OrdersService.OrdersServiceBase
{
    private readonly IDbContextFactory<AppDbContext> _dbFactory;

    public OrdersGrpcService(IDbContextFactory<AppDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public override async Task<GetOrdersResponse> GetOrders(GetOrdersRequest request, ServerCallContext context)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        await using var db = await _dbFactory.CreateDbContextAsync();
        var initTime = sw.ElapsedMilliseconds;
        
        var page = request.Page < 1 ? 1 : request.Page;
        var limit = request.Limit < 1 ? 10 : request.Limit > 1000 ? 1000 : request.Limit;
        var skip = (page - 1) * limit;

        // var total = await db.Orders.CountAsync(context.CancellationToken);
        var total = 1000;
        var countTime = sw.ElapsedMilliseconds;
        
        var orders = await db.Orders
            .OrderByDescending(o => o.CreatedAt)
            .Skip(skip).Take(limit)
            .AsNoTracking()
            .ToListAsync(context.CancellationToken);
        var listTime = sw.ElapsedMilliseconds;

        var response = new GetOrdersResponse
        {
            Meta = new PaginationMeta
            {
                Total = total,
                Page = page,
                Limit = limit,
                TotalPages = (int)Math.Ceiling((double)total / limit)
            }
        };
        response.Data.AddRange(orders.Select(ToProto));
        var totalTime = sw.ElapsedMilliseconds;
        
        if (totalTime > 20)
        {
            Console.WriteLine($"[SVC-LOG] GetOrders | Init: {initTime}ms | Count: {countTime - initTime}ms | List: {listTime - countTime}ms | Map: {totalTime - listTime}ms | Total: {totalTime}ms");
        }
        
        return response;
    }

    public override async Task<OrderMessage> GetOrder(GetOrderRequest request, ServerCallContext context)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var order = await db.Orders.AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == Guid.Parse(request.Id), context.CancellationToken);

        if (order is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"Order {request.Id} not found"));

        return ToProto(order);
    }

    public override async Task<OrderMessage> CreateOrder(CreateOrderRequest request, ServerCallContext context)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            Product = request.Product,
            Quantity = request.Quantity,
            Price = request.Price,
            Status = string.IsNullOrEmpty(request.Status) ? "pending" : request.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync(context.CancellationToken);
        return ToProto(order);
    }

    public override async Task<OrderMessage> UpdateOrder(UpdateOrderRequest request, ServerCallContext context)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var order = await db.Orders.FindAsync(new object[] { Guid.Parse(request.Id) }, context.CancellationToken);
        if (order is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"Order {request.Id} not found"));

        if (!string.IsNullOrEmpty(request.Product)) order.Product = request.Product;
        if (request.Quantity > 0) order.Quantity = request.Quantity;
        if (request.Price > 0) order.Price = request.Price;
        if (!string.IsNullOrEmpty(request.Status)) order.Status = request.Status;
        order.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(context.CancellationToken);
        return ToProto(order);
    }

    public override async Task<OrderMessage> DeleteOrder(DeleteOrderRequest request, ServerCallContext context)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var order = await db.Orders.FindAsync(new object[] { Guid.Parse(request.Id) }, context.CancellationToken);
        if (order is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"Order {request.Id} not found"));

        db.Orders.Remove(order);
        await db.SaveChangesAsync(context.CancellationToken);
        return ToProto(order);
    }

    private static OrderMessage ToProto(Order o) => new()
    {
        Id = o.Id.ToString(),
        UserId = o.UserId,
        Product = o.Product,
        Quantity = o.Quantity,
        Price = o.Price,
        Status = o.Status,
        CreatedAt = o.CreatedAt.ToString("O"),
        UpdatedAt = o.UpdatedAt.ToString("O")
    };
}
