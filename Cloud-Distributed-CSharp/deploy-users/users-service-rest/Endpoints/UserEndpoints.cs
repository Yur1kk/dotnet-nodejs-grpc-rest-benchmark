using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UsersRest.Data;
using UsersRest.Models;

namespace UsersRest.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        var grp = app.MapGroup("/users");

        // GET /users?page=1&limit=100
        grp.MapGet("/", async (
            [FromQuery] int page, 
            [FromQuery] int limit,
            AppDbContext db) =>
        {
            page = page < 1 ? 1 : page;
            limit = limit < 1 ? 10 : limit > 1000 ? 1000 : limit;
            var skip = (page - 1) * limit;

            // var total = await db.Users.CountAsync();
            var total = 1000;
            var users = await db.Users
                .OrderByDescending(u => u.CreatedAt)
                .Skip(skip).Take(limit)
                .AsNoTracking()
                .ToListAsync();

            return Results.Ok(new
            {
                data = users,
                meta = new { total, page, limit, totalPages = (int)Math.Ceiling((double)total / limit) }
            });
        });

        // GET /users/search?role=user&name=...&email=...
        grp.MapGet("/search", async (
            [FromQuery] string? name,
            [FromQuery] string? email,
            [FromQuery] string? role,
            AppDbContext db) =>
        {
            var q = db.Users.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(name))
                q = q.Where(u => EF.Functions.ILike(u.Name, $"%{name}%"));
            if (!string.IsNullOrEmpty(email))
                q = q.Where(u => EF.Functions.ILike(u.Email, $"%{email}%"));
            if (!string.IsNullOrEmpty(role))
                q = q.Where(u => u.Role == role);

            var users = await q.Take(50).ToListAsync();
            return Results.Ok(new { data = users });
        });

        // GET /users/:id
        grp.MapGet("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
            return user is null ? Results.NotFound() : Results.Ok(user);
        });

        // POST /users
        grp.MapPost("/", async (CreateUserDto dto, AppDbContext db) =>
        {
            if (await db.Users.AnyAsync(u => u.Email == dto.Email))
                return Results.Conflict(new { message = $"Email {dto.Email} already exists" });

            var user = new User
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Email = dto.Email,
                Age = dto.Age,
                Role = dto.Role ?? "user",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
            return Results.Created($"/users/{user.Id}", user);
        });

        // PUT /users/:id
        grp.MapPut("/{id:guid}", async (Guid id, UpdateUserDto dto, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user is null) return Results.NotFound();

            if (dto.Name is not null) user.Name = dto.Name;
            if (dto.Email is not null) user.Email = dto.Email;
            if (dto.Age.HasValue) user.Age = dto.Age.Value;
            if (dto.Role is not null) user.Role = dto.Role;
            user.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(user);
        });

        // DELETE /users/:id
        grp.MapDelete("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user is null) return Results.NotFound();
            db.Users.Remove(user);
            await db.SaveChangesAsync();
            return Results.Ok(user);
        });
    }
}

public record CreateUserDto(string Name, string Email, int Age, string? Role);
public record UpdateUserDto(string? Name, string? Email, int? Age, string? Role);
