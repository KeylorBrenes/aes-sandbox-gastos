namespace Gastos.Api;

public class Expense
{
    public int Id { get; set; }
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public string CategoryId { get; set; } = "";
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}

public record Category(string Id, string Name);

public static class Categories
{
    public static readonly IReadOnlyList<Category> All =
    [
        new("alimentacion", "Alimentación"),
        new("transporte", "Transporte"),
        new("vivienda", "Vivienda"),
        new("servicios", "Servicios"),
        new("salud", "Salud"),
        new("ocio", "Ocio"),
        new("otros", "Otros"),
    ];

    public static bool Exists(string id) => All.Any(c => c.Id == id);
}
