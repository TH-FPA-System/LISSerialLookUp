using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;

[ApiController]
[Route("api/[controller]")]
public class FactoryLineController : ControllerBase
{
    private readonly Func<IDbConnection> _dbFactory;

    public FactoryLineController(Func<IDbConnection> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    [HttpGet("{line}")]
    public async Task<IActionResult> GetFactoryLine(string line, [FromQuery] string serial)
    {
        if (string.IsNullOrWhiteSpace(line))
            return BadRequest("Factory line is required.");

        // Result object
        var result = new
        {
            line = line,
            nodes = new List<object>(),
            history = new List<object>()
        };

        // --- 1. Load line layout ---
        using (var conn = (SqlConnection)_dbFactory())
        {
            await conn.OpenAsync();

            using var cmdLayout = conn.CreateCommand();
            cmdLayout.CommandText = @"
                SELECT FactoryLineID, CLASS_PRODUCT, STORE_LOCATION, SEQ_LV_NO, PositionX, PositionY, LabelText
                FROM LISLineInfo
                WHERE CLASS_PRODUCT = @line
                ORDER BY SEQ_LV_NO
            ";
            cmdLayout.Parameters.AddWithValue("@line", line);

            using var reader = await cmdLayout.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.nodes.Add(new
                {
                    store = reader["STORE_LOCATION"].ToString(),
                    seqLvNo = Convert.ToInt32(reader["SEQ_LV_NO"]),
                    positionX = Convert.ToInt32(reader["PositionX"]),
                    positionY = Convert.ToInt32(reader["PositionY"]),
                    label = reader["LabelText"].ToString()
                });
            }
        }

        // --- 2. Load serial tracking history ---
        if (!string.IsNullOrWhiteSpace(serial))
        {
            using (var conn = (SqlConnection)_dbFactory())
            {
                await conn.OpenAsync();

                using var cmdHist = conn.CreateCommand();
                cmdHist.CommandText = @"
                    SELECT part, serial, task, store_location, status, last_maint, last_maint_logon
                    FROM track_history
                    WHERE serial = @serial
                    ORDER BY last_maint
                ";
                cmdHist.Parameters.AddWithValue("@serial", serial);

                using var reader = await cmdHist.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    result.history.Add(new
                    {
                        part = reader["part"].ToString(),
                        serial = reader["serial"].ToString(),
                        task = reader["task"].ToString(),
                        store_location = reader["store_location"].ToString(),
                        status = reader["status"].ToString(),
                        last_maint = reader["last_maint"].ToString(),
                        last_maint_logon = reader["last_maint_logon"].ToString()
                    });
                }
            }
        }

        return Ok(result);
    }
}
