using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Gastos.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _db = Path.Combine(Path.GetTempPath(), $"gastos-test-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.UseSetting("ConnectionStrings:Gastos", $"Data Source={_db}");

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        foreach (var f in Directory.GetFiles(Path.GetTempPath(), Path.GetFileName(_db) + "*")) File.Delete(f);
    }
}

public class ExpenseEndpointsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Categories_ReturnsSevenInOrder()
    {
        var cats = await _client.GetFromJsonAsync<JsonElement>("/api/categories");
        Assert.Equal(7, cats.GetArrayLength());
        Assert.Equal("alimentacion", cats[0].GetProperty("id").GetString());
        Assert.Equal("Alimentación", cats[0].GetProperty("name").GetString());
        Assert.Equal("otros", cats[6].GetProperty("id").GetString());
    }

    [Fact]
    public async Task Post_Valid_Returns201WithLocation_AndAppearsInMonthWithExactTotal()
    {
        var a = await _client.PostAsJsonAsync("/api/expenses", new { amount = 0.1, date = "2010-03-10", categoryId = "salud", note = "" });
        await _client.PostAsJsonAsync("/api/expenses", new { amount = 0.2, date = "2010-03-11", categoryId = "salud" });
        await _client.PostAsJsonAsync("/api/expenses", new { amount = 5, date = "2010-04-01", categoryId = "salud" });

        Assert.Equal(HttpStatusCode.Created, a.StatusCode);
        var created = await a.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal($"/api/expenses/{created.GetProperty("id").GetInt32()}", a.Headers.Location?.OriginalString);
        Assert.Equal(JsonValueKind.Null, created.GetProperty("note").ValueKind);

        var list = await _client.GetFromJsonAsync<JsonElement>("/api/expenses?month=2010-03");
        Assert.Equal(2, list.GetProperty("items").GetArrayLength());
        Assert.Equal("2010-03-11", list.GetProperty("items")[0].GetProperty("date").GetString());
        Assert.Equal(0.3m, list.GetProperty("total").GetDecimal());
    }

    [Fact]
    public async Task Post_Invalid_Returns400ProblemJson_AndCreatesNothing()
    {
        var res = await _client.PostAsJsonAsync("/api/expenses", new { amount = -1, date = "2011-01-01", categoryId = "x" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
        var errors = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        Assert.Equal(["amount", "categoryId"], errors.EnumerateObject().Select(p => p.Name).Order());
        var list = await _client.GetFromJsonAsync<JsonElement>("/api/expenses?month=2011-01");
        Assert.Equal(0, list.GetProperty("items").GetArrayLength());
        Assert.Equal(0m, list.GetProperty("total").GetDecimal());
    }

    [Fact]
    public async Task Get_InvalidMonth_Returns400WithMonthError()
    {
        var res = await _client.GetAsync("/api/expenses?month=2026-13");

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var errors = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        Assert.Equal(["month"], errors.EnumerateObject().Select(p => p.Name));
    }

    [Fact]
    public async Task Get_WithoutMonth_ReturnsCurrentMonth()
    {
        var list = await _client.GetFromJsonAsync<JsonElement>("/api/expenses");
        Assert.Equal(DateTime.Now.ToString("yyyy-MM"), list.GetProperty("month").GetString());
    }
}
