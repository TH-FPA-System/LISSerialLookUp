using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class ProductController : ControllerBase
{
    private readonly IProductRepository _repo;

    public ProductController(IProductRepository repo)
    {
        _repo = repo;
    }

    [HttpGet("{serial}")]
    public async Task<IActionResult> GetBySerial(string serial)
    {
        if (string.IsNullOrWhiteSpace(serial))
            return BadRequest("serial is required");

        var result = await _repo.GetProductAggregateAsync(serial);

        //// Save to JSON file
        //var filePath = "debug_result.json";
        //System.IO.File.WriteAllText(filePath, 
        //    System.Text.Json.JsonSerializer.Serialize(result, new System.Text.Json.JsonSerializerOptions { WriteIndented = true })
        //);
        //For Debug
        //var filePath = "debug_result.json";
        //var json = System.IO.File.ReadAllText(filePath);
        //var result = System.Text.Json.JsonSerializer.Deserialize<ProductAggregateDto>(json);


        return result is not null ? Ok(result) : NotFound();
    }
}
