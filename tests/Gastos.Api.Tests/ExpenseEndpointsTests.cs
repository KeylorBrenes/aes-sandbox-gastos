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

    [Theory]
    [InlineData("   ", null)]
    [InlineData("", null)]
    [InlineData("  hola  ", "  hola  ")]
    public async Task Post_Note_WhitespaceBecomesNull_TextIsKeptAsIs(string note, string? expected)
    {
        var res = await _client.PostAsJsonAsync("/api/expenses", new { amount = 1, date = "2010-06-01", categoryId = "otros", note });

        var saved = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("note");
        Assert.Equal(expected, saved.ValueKind == JsonValueKind.Null ? null : saved.GetString());
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

public class ExpenseTypeAndUtcTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Post_NonNumericAmount_Returns400ProblemJsonWithAmountError()
    {
        var res = await _client.PostAsync("/api/expenses", new StringContent(
            """{"amount":"abc","date":"2026-11-04","categoryId":"otros"}""", System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
        var errors = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        Assert.Equal(["amount"], errors.EnumerateObject().Select(p => p.Name));
    }

    [Fact]
    public async Task CreatedAt_IsUtcWithZ_InPostAndGet()
    {
        var post = await _client.PostAsJsonAsync("/api/expenses", new { amount = 1, date = "2012-05-05", categoryId = "otros" });
        var created = (await post.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("createdAt").GetString();
        var list = await _client.GetFromJsonAsync<JsonElement>("/api/expenses?month=2012-05");
        var listed = list.GetProperty("items")[0].GetProperty("createdAt").GetString();

        Assert.EndsWith("Z", created);
        Assert.EndsWith("Z", listed);
    }
}

public class ExpenseItemEndpointsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private async Task<JsonElement> CreateAsync(object body)
    {
        var res = await _client.PostAsJsonAsync("/api/expenses", body);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static async Task AssertNotFoundProblem(HttpResponseMessage res)
    {
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
        Assert.Equal(404, (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Get_Existing_Returns200WithSameFormatAsCreation()
    {
        var created = await CreateAsync(new { amount = 12.5, date = "2013-01-02", categoryId = "ocio", note = "cine" });

        var res = await _client.GetAsync($"/api/expenses/{created.GetProperty("id").GetInt32()}");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(created.ToString(), (await res.Content.ReadFromJsonAsync<JsonElement>()).ToString());
    }

    [Theory]
    [InlineData("999999")]
    [InlineData("abc")]
    [InlineData("0")]
    [InlineData("-1")]
    public async Task GetPutDelete_UnknownOrNonNumericId_Return404Problem(string id)
    {
        var valid = JsonContent.Create(new { amount = 1, date = "2013-01-02", categoryId = "otros" });
        var invalid = JsonContent.Create(new { amount = -1 });

        await AssertNotFoundProblem(await _client.GetAsync($"/api/expenses/{id}"));
        await AssertNotFoundProblem(await _client.PutAsync($"/api/expenses/{id}", valid));
        await AssertNotFoundProblem(await _client.PutAsync($"/api/expenses/{id}", invalid));
        await AssertNotFoundProblem(await _client.DeleteAsync($"/api/expenses/{id}"));
    }

    [Fact]
    public async Task Put_Valid_Returns200_KeepsIdAndCreatedAt_AndMovesBetweenMonths()
    {
        var created = await CreateAsync(new { amount = 10, date = "2014-02-10", categoryId = "otros", note = "x" });
        var id = created.GetProperty("id").GetInt32();

        var res = await _client.PutAsJsonAsync($"/api/expenses/{id}", new { amount = 20.25, date = "2014-03-05", categoryId = "salud" });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var updated = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(id, updated.GetProperty("id").GetInt32());
        Assert.Equal(created.GetProperty("createdAt").GetString(), updated.GetProperty("createdAt").GetString());
        Assert.Equal(20.25m, updated.GetProperty("amount").GetDecimal());
        Assert.Equal("salud", updated.GetProperty("categoryId").GetString());
        Assert.Equal(JsonValueKind.Null, updated.GetProperty("note").ValueKind);
        var get = await _client.GetFromJsonAsync<JsonElement>($"/api/expenses/{id}");
        Assert.Equal(updated.ToString(), get.ToString());

        var old = await _client.GetFromJsonAsync<JsonElement>("/api/expenses?month=2014-02");
        var @new = await _client.GetFromJsonAsync<JsonElement>("/api/expenses?month=2014-03");
        Assert.Equal(0, old.GetProperty("items").GetArrayLength());
        Assert.Equal(0m, old.GetProperty("total").GetDecimal());
        Assert.Equal(20.25m, @new.GetProperty("total").GetDecimal());
    }

    [Fact]
    public async Task Put_Invalid_Returns400WithFieldErrors_AndDoesNotChangeExpense()
    {
        var created = await CreateAsync(new { amount = 10, date = "2015-02-10", categoryId = "otros", note = "x" });
        var id = created.GetProperty("id").GetInt32();

        var res = await _client.PutAsJsonAsync($"/api/expenses/{id}", new { amount = 0, date = "2999-01-01", categoryId = "nada", note = new string('x', 201) });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
        var errors = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        Assert.Equal(["amount", "categoryId", "date", "note"], errors.EnumerateObject().Select(p => p.Name).Order());
        var get = await _client.GetFromJsonAsync<JsonElement>($"/api/expenses/{id}");
        Assert.Equal(created.ToString(), get.ToString());
    }

    [Fact]
    public async Task Put_NoteRules_MissingOrBlankIsNull_TextIsKept_201SpacesIs400()
    {
        var id = (await CreateAsync(new { amount = 1, date = "2016-02-10", categoryId = "otros", note = "x" })).GetProperty("id").GetInt32();
        var url = $"/api/expenses/{id}";

        var blank = await _client.PutAsJsonAsync(url, new { amount = 1, date = "2016-02-10", categoryId = "otros", note = "   " });
        Assert.Equal(JsonValueKind.Null, (await blank.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("note").ValueKind);

        var text = await _client.PutAsJsonAsync(url, new { amount = 1, date = "2016-02-10", categoryId = "otros", note = " hola " });
        Assert.Equal(" hola ", (await text.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("note").GetString());

        var missing = await _client.PutAsJsonAsync(url, new { amount = 1, date = "2016-02-10", categoryId = "otros" });
        Assert.Equal(JsonValueKind.Null, (await missing.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("note").ValueKind);

        var tooLong = await _client.PutAsJsonAsync(url, new { amount = 1, date = "2016-02-10", categoryId = "otros", note = new string(' ', 201) });
        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
        Assert.Equal(["note"], (await tooLong.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors").EnumerateObject().Select(p => p.Name));
    }

    [Fact]
    public async Task Delete_Existing_Returns204_ThenGetIs404_SecondDeleteIs404_AndTotalDrops()
    {
        var id = (await CreateAsync(new { amount = 7, date = "2017-02-10", categoryId = "otros" })).GetProperty("id").GetInt32();
        await CreateAsync(new { amount = 3, date = "2017-02-11", categoryId = "otros" });

        var res = await _client.DeleteAsync($"/api/expenses/{id}");

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        Assert.Empty(await res.Content.ReadAsByteArrayAsync());
        await AssertNotFoundProblem(await _client.GetAsync($"/api/expenses/{id}"));
        await AssertNotFoundProblem(await _client.DeleteAsync($"/api/expenses/{id}"));
        var list = await _client.GetFromJsonAsync<JsonElement>("/api/expenses?month=2017-02");
        Assert.Equal(1, list.GetProperty("items").GetArrayLength());
        Assert.Equal(3m, list.GetProperty("total").GetDecimal());
    }
}
