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
            var (request, date, errors) = ValidateBody(body);
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var expense = new Expense
            {
                Amount = request.Amount!.Value,
                Date = date,
                CategoryId = request.CategoryId!,
                Note = ExpenseValidation.NormalizeNote(request.Note),
                CreatedAt = DateTime.UtcNow,
            };
            db.Expenses.Add(expense);
            await db.SaveChangesAsync();
            return Results.Created($"/api/expenses/{expense.Id}", ExpenseDto.From(expense));
        });

        group.MapGet("/{id}", async (string id, GastosDbContext db) =>
            await Find(id, db) is { } expense ? Results.Ok(ExpenseDto.From(expense)) : NotFound());

        group.MapPut("/{id}", async (string id, JsonElement body, GastosDbContext db) =>
        {
            if (await Find(id, db) is not { } expense) return NotFound();

            var (request, date, errors) = ValidateBody(body);
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            expense.Amount = request.Amount!.Value;
            expense.Date = date;
            expense.CategoryId = request.CategoryId!;
            expense.Note = ExpenseValidation.NormalizeNote(request.Note);
            await db.SaveChangesAsync();
            return Results.Ok(ExpenseDto.From(expense));
        });

        group.MapDelete("/{id}", async (string id, GastosDbContext db) =>
        {
            if (await Find(id, db) is not { } expense) return NotFound();
            db.Expenses.Remove(expense);
            await db.SaveChangesAsync();
            return Results.NoContent();
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

    private static (CreateExpenseRequest Request, DateOnly Date, Dictionary<string, string[]> Errors) ValidateBody(JsonElement body)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var typeErrors = new Dictionary<string, string[]>();
        var request = ExpenseRequestParser.Parse(body, typeErrors);
        var errors = ExpenseValidation.Validate(request, today, out var date);
        foreach (var (k, v) in typeErrors) errors[k] = v;
        return (request, date, errors);
    }

    /// Un id no numérico, 0 o negativo se trata como inexistente.
    private static async Task<Expense?> Find(string id, GastosDbContext db) =>
        int.TryParse(id, System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out var n) && n > 0
            ? await db.Expenses.FindAsync(n)
            : null;

    private static IResult NotFound() => Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Gasto no encontrado");
}
