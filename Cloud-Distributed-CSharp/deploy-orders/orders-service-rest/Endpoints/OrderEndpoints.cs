using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrdersRest.Data;
using OrdersRest.Models;

namespace OrdersRest.Endpoints;

public static class OrderEndpoints
{
    public static void MapOrderEndpoints(this WebApplication app)
    {
        var grp = app.MapGroup("/orders");

        // GET /orders?page=1&limit=100
        grp.MapGet("/", async (
            [FromQuery] int page,
            [FromQuery] int limit,
            AppDbContext db) =>
        {
            page = page < 1 ? 1 : page;
            limit = limit < 1 ? 10 : limit > 1000 ? 1000 : limit;
            var skip = (page - 1) * limit;

            // var total = await db.Orders.CountAsync();
            var total = 1000;
            var orders = await db.Orders
                .OrderByDescending(o => o.CreatedAt)
                .Skip(skip).Take(limit)
                .AsNoTracking()
                .ToListAsync();

            return Results.Ok(new
            {
                data = orders,
                meta = new { total, page, limit, totalPages = (int)Math.Ceiling((double)total / limit) }
            });
        });

        // GET /orders/:id
        grp.MapGet("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id);
            return order is null ? Results.NotFound() : Results.Ok(order);
        });

        // POST /orders
        grp.MapPost("/", async (CreateOrderDto dto, AppDbContext db) =>
        {
            var order = new Order
            {
                Id = Guid.NewGuid(),
                UserId = dto.UserId,
                Product = dto.Product,
                Quantity = dto.Quantity,
                Price = dto.Price,
                Status = dto.Status ?? "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Orders.Add(order);
            await db.SaveChangesAsync();
            return Results.Created($"/orders/{order.Id}", order);
        });

        // PUT /orders/:id
        grp.MapPut("/{id:guid}", async (Guid id, UpdateOrderDto dto, AppDbContext db) =>
        {
            var order = await db.Orders.FindAsync(id);
            if (order is null) return Results.NotFound();

            if (dto.Product is not null) order.Product = dto.Product;
            if (dto.Quantity.HasValue) order.Quantity = dto.Quantity.Value;
            if (dto.Price.HasValue) order.Price = dto.Price.Value;
            if (dto.Status is not null) order.Status = dto.Status;
            order.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(order);
        });

        // DELETE /orders/:id
        grp.MapDelete("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var order = await db.Orders.FindAsync(id);
            if (order is null) return Results.NotFound();
            db.Orders.Remove(order);
            await db.SaveChangesAsync();
            return Results.Ok(order);
        });
    }
}

public record CreateOrderDto(string UserId, string Product, int Quantity, double Price, string? Status);
public record UpdateOrderDto(string? Product, int? Quantity, double? Price, string? Status);
