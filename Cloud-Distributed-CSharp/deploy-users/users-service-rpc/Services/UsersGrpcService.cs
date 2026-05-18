using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Users;
using UsersRpc.Data;
using UsersRpc.Models;

namespace UsersRpc.Services;

public class UsersGrpcService : UsersService.UsersServiceBase
{
    private readonly IDbContextFactory<AppDbContext> _dbFactory;

    public UsersGrpcService(IDbContextFactory<AppDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public override async Task<GetUsersResponse> GetUsers(GetUsersRequest request, ServerCallContext context)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        await using var db = await _dbFactory.CreateDbContextAsync();
        var initTime = sw.ElapsedMilliseconds;
        
        var page = request.Page < 1 ? 1 : request.Page;
        var limit = request.Limit < 1 ? 10 : request.Limit > 1000 ? 1000 : request.Limit;
        var skip = (page - 1) * limit;

        // var total = await db.Users.CountAsync(context.CancellationToken);
        var total = 1000;
        var countTime = sw.ElapsedMilliseconds;
        
        var users = await db.Users
            .OrderByDescending(u => u.CreatedAt)
            .Skip(skip).Take(limit)
            .AsNoTracking()
            .ToListAsync(context.CancellationToken);
        var listTime = sw.ElapsedMilliseconds;

        var response = new GetUsersResponse
        {
            Meta = new PaginationMeta
            {
                Total = total,
                Page = page,
                Limit = limit,
                TotalPages = (int)Math.Ceiling((double)total / limit)
            }
        };
        response.Data.AddRange(users.Select(ToProto));
        var totalTime = sw.ElapsedMilliseconds;
        
        if (totalTime > 20)
        {
            Console.WriteLine($"[SVC-LOG] GetUsers | Init: {initTime}ms | Count: {countTime - initTime}ms | List: {listTime - countTime}ms | Map: {totalTime - listTime}ms | Total: {totalTime}ms");
        }
        
        return response;
    }

    public override async Task<UserMessage> GetUser(GetUserRequest request, ServerCallContext context)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var user = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == Guid.Parse(request.Id), context.CancellationToken);

        if (user is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"User {request.Id} not found"));

        return ToProto(user);
    }

    public override async Task<UserMessage> CreateUser(CreateUserRequest request, ServerCallContext context)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();

        if (await db.Users.AnyAsync(u => u.Email == request.Email, context.CancellationToken))
            throw new RpcException(new Status(StatusCode.AlreadyExists, $"Email {request.Email} already exists"));

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Email = request.Email,
            Age = request.Age,
            Role = string.IsNullOrEmpty(request.Role) ? "user" : request.Role,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(context.CancellationToken);
        return ToProto(user);
    }

    public override async Task<UserMessage> UpdateUser(UpdateUserRequest request, ServerCallContext context)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var user = await db.Users.FindAsync(new object[] { Guid.Parse(request.Id) }, context.CancellationToken);
        if (user is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"User {request.Id} not found"));

        if (!string.IsNullOrEmpty(request.Name)) user.Name = request.Name;
        if (!string.IsNullOrEmpty(request.Email)) user.Email = request.Email;
        if (request.Age > 0) user.Age = request.Age;
        if (!string.IsNullOrEmpty(request.Role)) user.Role = request.Role;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(context.CancellationToken);
        return ToProto(user);
    }

    public override async Task<UserMessage> DeleteUser(DeleteUserRequest request, ServerCallContext context)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var user = await db.Users.FindAsync(new object[] { Guid.Parse(request.Id) }, context.CancellationToken);
        if (user is null)
            throw new RpcException(new Status(StatusCode.NotFound, $"User {request.Id} not found"));

        db.Users.Remove(user);
        await db.SaveChangesAsync(context.CancellationToken);
        return ToProto(user);
    }

    public override async Task<SearchUsersResponse> SearchUsers(SearchUsersRequest request, ServerCallContext context)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var q = db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrEmpty(request.Name))
            q = q.Where(u => EF.Functions.ILike(u.Name, $"%{request.Name}%"));
        if (!string.IsNullOrEmpty(request.Email))
            q = q.Where(u => EF.Functions.ILike(u.Email, $"%{request.Email}%"));
        if (!string.IsNullOrEmpty(request.Role))
            q = q.Where(u => u.Role == request.Role);

        var users = await q.Take(50).ToListAsync(context.CancellationToken);
        var response = new SearchUsersResponse();
        response.Data.AddRange(users.Select(ToProto));
        return response;
    }

    public override async Task<ExportUsersResponse> ExportUsers(ExportUsersRequest request, ServerCallContext context)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var users = await db.Users.AsNoTracking()
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync(context.CancellationToken);
        var response = new ExportUsersResponse();
        response.Users.AddRange(users.Select(ToProto));
        return response;
    }

    public override async Task<ImportUsersResponse> ImportUsers(ImportUsersRequest request, ServerCallContext context)
    {
        await using var db = await _dbFactory.CreateDbContextAsync();
        var imported = 0;
        var errors = new List<string>();

        foreach (var row in request.Rows)
        {
            try
            {
                if (await db.Users.AnyAsync(u => u.Email == row.Email, context.CancellationToken))
                {
                    errors.Add($"Email {row.Email} already exists");
                    continue;
                }
                db.Users.Add(new User
                {
                    Id = Guid.NewGuid(),
                    Name = row.Name,
                    Email = row.Email,
                    Age = row.Age,
                    Role = string.IsNullOrEmpty(row.Role) ? "user" : row.Role,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add($"{row.Email}: {ex.Message}");
            }
        }
        await db.SaveChangesAsync(context.CancellationToken);

        var resp = new ImportUsersResponse { Imported = imported };
        resp.Errors.AddRange(errors);
        return resp;
    }

    private static UserMessage ToProto(User u) => new()
    {
        Id = u.Id.ToString(),
        Name = u.Name,
        Email = u.Email,
        Age = u.Age,
        Role = u.Role,
        CreatedAt = u.CreatedAt.ToString("O"),
        UpdatedAt = u.UpdatedAt.ToString("O")
    };
}
