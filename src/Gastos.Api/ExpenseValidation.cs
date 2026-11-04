using System.Globalization;

namespace Gastos.Api;

public record CreateExpenseRequest(decimal? Amount, string? Date, string? CategoryId, string? Note);

public static class ExpenseValidation
{
    public const decimal MaxAmount = 99_999_999.99m;
    public const int MaxNoteLength = 200;

    /// Valida la creación y devuelve los errores por campo (vacío si es válida).
    public static Dictionary<string, string[]> Validate(CreateExpenseRequest r, DateOnly today, out DateOnly date)
    {
        var errors = new Dictionary<string, string[]>();
        date = default;

        if (r.Amount is null)
            errors["amount"] = ["El monto es obligatorio."];
        else if (r.Amount <= 0 || r.Amount > MaxAmount)
            errors["amount"] = [$"El monto debe estar entre 0,01 y {MaxAmount.ToString("N2", CultureInfo.GetCultureInfo("es-CR"))}."];
        else if (decimal.Round(r.Amount.Value, 2) != r.Amount)
            errors["amount"] = ["El monto admite hasta 2 decimales."];

        if (string.IsNullOrWhiteSpace(r.Date))
            errors["date"] = ["La fecha es obligatoria."];
        else if (!DateOnly.TryParseExact(r.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
            errors["date"] = ["La fecha debe tener el formato AAAA-MM-DD y ser válida."];
        else if (date > today)
            errors["date"] = ["La fecha no puede ser futura."];

        if (string.IsNullOrWhiteSpace(r.CategoryId))
            errors["categoryId"] = ["La categoría es obligatoria."];
        else if (!Categories.Exists(r.CategoryId))
            errors["categoryId"] = ["La categoría no existe."];

        if (r.Note is { Length: > MaxNoteLength })
            errors["note"] = [$"La nota admite hasta {MaxNoteLength} caracteres."];

        return errors;
    }

    public static bool TryParseMonth(string? month, out DateOnly first) =>
        DateOnly.TryParseExact(month is { Length: 7 } ? month + "-01" : "", "yyyy-MM-dd",
            CultureInfo.InvariantCulture, DateTimeStyles.None, out first);
}
