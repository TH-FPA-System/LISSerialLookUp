using Microsoft.AspNetCore.Mvc;
using System.Data;
using Microsoft.Data.SqlClient;

[ApiController]
[Route("api/[controller]")]
public class FactoryLineController : ControllerBase
{
    private readonly Func<IDbConnection> _dbConnection;

    public FactoryLineController(Func<IDbConnection> dbConnection)
    {
        _dbConnection = dbConnection;
    }

    [HttpGet("{line}")]
    public IActionResult GetLineLayout(string line)
    {
        if (string.IsNullOrWhiteSpace(line))
            return BadRequest("Line parameter is required.");

        using var conn = _dbConnection();
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT STORE_LOCATION, SEQ_LV_NO, PositionX, PositionY, LabelText
            FROM LISLineInfo
            WHERE CLASS_PRODUCT = @line
            ORDER BY SEQ_LV_NO
        ";

        var param = cmd.CreateParameter();
        param.ParameterName = "@line";
        param.Value = line;
        cmd.Parameters.Add(param);

        var nodes = new List<object>();
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            nodes.Add(new
            {
                Store = reader["STORE_LOCATION"].ToString(),
                SeqLvNo = Convert.ToInt32(reader["SEQ_LV_NO"]),
                PositionX = Convert.ToInt32(reader["PositionX"]),
                PositionY = Convert.ToInt32(reader["PositionY"]),
                Label = reader["LabelText"].ToString()
            });
        }

        if (!nodes.Any())
            return NotFound();

        return Ok(new { Line = line, Nodes = nodes });
    }
}
