using Gastos.Api;

namespace Gastos.Api.Tests;

public class ExpenseValidationTests
{
    private static readonly DateOnly Today = new(2026, 11, 4);

    private static Dictionary<string, string[]> Run(decimal? amount = 10, string? date = "2026-11-04",
        string? category = "otros", string? note = null) =>
        ExpenseValidation.Validate(new CreateExpenseRequest(amount, date, category, note), Today, out _);

    [Theory]
    [InlineData("0.01")]
    [InlineData("99999999.99")]
    [InlineData("12500.50")]
    public void ValidAmounts_HaveNoErrors(string amount) =>
        Assert.Empty(Run(amount: decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture)));

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("0.001")]
    [InlineData("10.123")]
    [InlineData("100000000")]
    public void InvalidAmounts_ReportAmount(string amount) =>
        Assert.Equal(["amount"], Run(amount: decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture)).Keys);

    [Fact]
    public void MissingFields_ReportEachRequiredField() =>
        Assert.Equal(["amount", "categoryId", "date"], Run(null, null, null).Keys.Order());

    [Fact]
    public void TodayIsValid_TomorrowIsNot()
    {
        Assert.Empty(Run(date: "2026-11-04"));
        Assert.Equal(["date"], Run(date: "2026-11-05").Keys);
    }

    [Theory]
    [InlineData("2026-02-30")]
    [InlineData("ayer")]
    [InlineData("2026-1-5")]
    public void InvalidDates_ReportDate(string date) => Assert.Equal(["date"], Run(date: date).Keys);

    [Fact]
    public void UnknownCategory_ReportsCategoryId() => Assert.Equal(["categoryId"], Run(category: "nada").Keys);

    [Fact]
    public void NoteLimit_200IsValid_201Is_NotValid()
    {
        Assert.Empty(Run(note: new string('x', 200)));
        Assert.Equal(["note"], Run(note: new string('x', 201)).Keys);
    }

    [Fact]
    public void NoteOfOnlySpaces_IsValidUpTo200_AndInvalidAt201()
    {
        Assert.Empty(Run(note: new string(' ', 200)));
        Assert.Equal(["note"], Run(note: new string(' ', 201)).Keys);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData(" a ", " a ")]
    public void NormalizeNote_OnlyEmptyOrWhitespaceBecomesNull(string? note, string? expected) =>
        Assert.Equal(expected, ExpenseValidation.NormalizeNote(note));

    [Theory]
    [InlineData("2026-11", true)]
    [InlineData("2026-13", false)]
    [InlineData("2026-00", false)]
    [InlineData("2026-1", false)]
    [InlineData("202611", false)]
    [InlineData("2026-11-01", false)]
    [InlineData(null, false)]
    public void TryParseMonth_AcceptsOnlyYyyyMm(string? month, bool expected) =>
        Assert.Equal(expected, ExpenseValidation.TryParseMonth(month, out _));
}
