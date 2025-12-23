using Microsoft.Data.SqlClient;
using System.Data;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();

// Register Func<IDbConnection>
builder.Services.AddScoped<Func<IDbConnection>>(_ =>
    () => new SqlConnection(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register repository
builder.Services.AddScoped<IProductRepository, ProductRepository>();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Product API",
        Version = "v1",
        Description = "API for fetching product details, tracking, testing, packing errors, and rework records."
    });
});

var app = builder.Build();

// Development tools
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Product API V1");
        c.RoutePrefix = "swagger"; // Swagger UI at /swagger
    });
}

// Serve static files from wwwroot
app.UseStaticFiles();

// Custom route to serve SerialLookUp.html at /SerialLookUp
app.MapGet("/SerialLookUp", async context =>
{
    var filePath = Path.Combine(app.Environment.WebRootPath, "SerialLookUp.html");
    if (File.Exists(filePath))
    {
        context.Response.ContentType = "text/html";
        await context.Response.SendFileAsync(filePath);
    }
    else
    {
        context.Response.StatusCode = 404;
        await context.Response.WriteAsync("SerialLookUp.html not found.");
    }
});

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
