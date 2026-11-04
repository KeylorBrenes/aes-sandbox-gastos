using Gastos.Api;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<GastosDbContext>(o =>
    o.UseSqlite(builder.Configuration.GetConnectionString("Gastos")));
var app = builder.Build();

using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<GastosDbContext>().Database.Migrate();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapExpenseEndpoints();

app.Run();

public partial class Program;
