using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Gastos.Api;

public record ExpenseDto(int Id, decimal Amount, DateOnly Date, string CategoryId, string? Note, DateTime CreatedAt)
{
    public static ExpenseDto From(Expense e) => new(e.Id, e.Amount, e.Date, e.CategoryId, e.Note, e.CreatedAt);
}

public static class ExpenseEndpoints
{
    public static void MapExpenseEndpoints(this WebApplication app)
    {
        app.MapGet("/api/categories", () => Categories.All);

        var group = app.MapGroup("/api/expenses");

        group.MapPost("/", async (JsonElement body, GastosDbContext db) =>
        {
            var today = DateOnly.FromDateTime(DateTime.Now);
            var typeErrors = new Dictionary<string, string[]>();
            var request = ExpenseRequestParser.Parse(body, typeErrors);
            var errors = ExpenseValidation.Validate(request, today, out var date);
            foreach (var (k, v) in typeErrors) errors[k] = v;
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var expense = new Expense
            {
                Amount = request.Amount!.Value,
                Date = date,
                CategoryId = request.CategoryId!,
                Note = string.IsNullOrEmpty(request.Note) ? null : request.Note,
                CreatedAt = DateTime.UtcNow,
            };
            db.Expenses.Add(expense);
            await db.SaveChangesAsync();
            return Results.Created($"/api/expenses/{expense.Id}", ExpenseDto.From(expense));
        });

        group.MapGet("/", async (string? month, GastosDbContext db) =>
        {
            DateOnly first;
            if (month is null)
                first = new DateOnly(DateTime.Now.Year, DateTime.Now.Month, 1);
            else if (!ExpenseValidation.TryParseMonth(month, out first))
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["month"] = ["El mes debe tener el formato AAAA-MM."],
                });

            var next = first.AddMonths(1);
            var rows = await db.Expenses.Where(e => e.Date >= first && e.Date < next).ToListAsync();
            var items = rows.OrderByDescending(e => e.Date).ThenByDescending(e => e.CreatedAt)
                .Select(ExpenseDto.From).ToList();
            return Results.Ok(new { month = first.ToString("yyyy-MM"), items, total = items.Sum(i => i.Amount) });
        });
    }
}
