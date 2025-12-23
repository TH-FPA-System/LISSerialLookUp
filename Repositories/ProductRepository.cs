using Dapper;
using System.Data;

public class ProductRepository : IProductRepository
{
    private readonly Func<IDbConnection> _createConnection;

    public ProductRepository(Func<IDbConnection> createConnection)
    {
        _createConnection = createConnection;
    }

    private IDbConnection CreateConnection() => _createConnection();

    public async Task<ProductAggregateDto?> GetProductAggregateAsync(string serial)
    {
        //EUV481439
        var productDetails = await GetProductDetailsBySerialAsync(serial);
        if (productDetails == null) return null;

        return new ProductAggregateDto
        {
            ProductDetails = productDetails,
            Tracking = await GetTrackingInfoAsync(serial),
            Testing = await GetTestingInfoAsync(serial),
            PackingErrors = await GetPackingErrorsAsync(serial),
            ReworkRecords = await GetReworkRecordsAsync(serial)
        };
    }

    public async Task<ProductDetails?> GetProductDetailsBySerialAsync(string serial)
    {
        const string sql = @"
;WITH VAI AS (
    SELECT
        ps.part,
        REPLICATE('0', 4 - LEN(ppdVAI.property_value)) + ppdVAI.property_value AS vai_code
    FROM dbo.part_structure ps
    JOIN dbo.part p ON ps.component = p.part AND p.class = 'VAI MODEL GROUP'
    JOIN dbo.part_property_data ppdVAI ON p.part = ppdVAI.part AND ppdVAI.property = 'MODEL GROUP'
    WHERE ps.task = 2200
),
Serials AS (
    SELECT
        st.serial_FPA AS SerialFPA,
        st.serial_GEA AS SerialGEA,
        '-' AS SerialHAIER,
        st.part,
        st.part_issue,
        st.serial_issue_date,
        st.status
    FROM Thailis.dbo.GEA_serial_track st
    WHERE @serial IN (st.serial_FPA, st.serial_GEA)
    
    UNION ALL

    SELECT
        st.serial_FPA AS SerialFPA,
        '-' AS SerialGEA,
        st.serial_HAIER AS SerialHAIER,
        st.part,
        st.part_issue,
        st.serial_issue_date,
        st.status
    FROM Thailis.dbo.HAIER_serial_track st
    WHERE @serial IN (st.serial_FPA, st.serial_HAIER)
    
    UNION ALL

    SELECT
        st.serial AS SerialFPA,
        '-' AS SerialGEA,
        '-' AS SerialHAIER,
        st.part,
        st.part_issue,
        st.serial_issue_date,
        st.status
    FROM Thailis.dbo.serial_track st
    WHERE st.serial = @serial
)
SELECT TOP 1
    s.SerialFPA,
    s.SerialGEA,
    s.SerialHAIER,
    p.part + ' ' + p.description AS Part,
    s.part_issue AS PartIssue,
    s.serial_issue_date AS SerialIssueDate,
    ISNULL(vai.vai_code, '-') AS VAI_FoamCode,
    s.status
FROM Serials s
JOIN Thailis.dbo.part p ON p.part = s.part
LEFT JOIN VAI vai ON p.part = vai.part;
";


        using var conn = CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<ProductDetails>(sql, new { serial });
    }


    public async Task<List<TrackingInfo>> GetTrackingInfoAsync(string serial)
    {
        const string sql = @"
DECLARE @Serial VARCHAR(50) = @serial;

IF EXISTS (SELECT 1 FROM Thailis.dbo.GEA_serial_track WHERE serial_GEA = @Serial)
BEGIN
    SELECT th.workcell,
           th.task,
           th.store_location,
           th.status,
           th.grade,
           th.zone,
           th.store,
           th.last_maint,
           th.last_maint_logon,
           th.update_reference,
           ci.last_maint_logon AS reject_reason,
           stod.order_no
    FROM track_history AS th
    INNER JOIN Thailis.dbo.GEA_serial_track AS ge 
        ON th.serial = ge.serial_FPA
    LEFT JOIN component_inventory AS ci 
        ON th.store = ci.part AND ci.store_location = 'RJREASON'
    LEFT JOIN serial_track_sod AS stod 
        ON th.serial = stod.serial
    WHERE ge.serial_GEA = @Serial
    ORDER BY th.last_maint;
END
ELSE IF EXISTS (SELECT 1 FROM Thailis.dbo.Haier_serial_track WHERE serial_HAIER = @Serial)
BEGIN
    SELECT th.workcell,
           th.task,
           th.store_location,
           th.status,
           th.grade,
           th.zone,
           th.store,
           th.last_maint,
           th.last_maint_logon,
           th.update_reference,
           ci.last_maint_logon AS reject_reason,
           stod.order_no
    FROM track_history AS th
    INNER JOIN Thailis.dbo.Haier_serial_track AS ha 
        ON th.serial = ha.serial_FPA
    LEFT JOIN component_inventory AS ci 
        ON th.store = ci.part AND ci.store_location = 'RJREASON'
    LEFT JOIN serial_track_sod AS stod 
        ON th.serial = stod.serial
    WHERE ha.serial_HAIER = @Serial
    ORDER BY th.last_maint;
END
ELSE
BEGIN
    SELECT th.workcell,
           th.task,
           th.store_location,
           th.status,
           th.grade,
           th.zone,
           th.store,
           th.last_maint,
           th.last_maint_logon,
           th.update_reference,
           ci.last_maint_logon AS reject_reason,
           stod.order_no
    FROM track_history AS th
    LEFT JOIN component_inventory AS ci 
        ON th.store = ci.part AND ci.store_location = 'RJREASON'
    LEFT JOIN serial_track_sod AS stod 
        ON th.serial = stod.serial
    WHERE th.serial = @Serial
    ORDER BY th.last_maint;
END";

        using var conn = CreateConnection();
        return (await conn.QueryAsync<TrackingInfo>(sql, new { serial })).ToList();
    }



    public async Task<List<TestingInfo>> GetTestingInfoAsync(string serial)
    {
        const string sql = @"
-- 1. Direct serial in test_result
SELECT 
    tr.task AS Task,
    tr.run_number AS Run,
    tr.date_tested AS DateTested,
    tr.test_part AS TestPart,
    p.description AS Description,
    tr.task_reference AS TaskReference,
    tr.test_result AS TestResult,
    tr.test_fault AS TestFault,
    tr.test_status AS TestStatus,
    ISNULL(ts.task_status, 'F') AS TaskStatus,
    tkd.description AS TaskDescription
FROM Thailis.dbo.test_result tr
INNER JOIN Thailis.dbo.part p 
    ON p.part = tr.test_part
LEFT JOIN Thailis.dbo.task_result ts 
    ON ts.serial = tr.serial AND ts.task = tr.task AND ts.run_number = tr.run_number
LEFT JOIN Thailis.dbo.task tkd 
    ON tkd.task = tr.task
WHERE tr.serial = @serial

UNION ALL

-- 2. Serial found via GEA table
SELECT 
    tr.task AS Task,
    tr.run_number AS Run,
    tr.date_tested AS DateTested,
    tr.test_part AS TestPart,
    p.description AS Description,
    tr.task_reference AS TaskReference,
    tr.test_result AS TestResult,
    tr.test_fault AS TestFault,
    tr.test_status AS TestStatus,
    ISNULL(ts.task_status, 'F') AS TaskStatus,
    tkd.description AS TaskDescription
FROM Thailis.dbo.GEA_serial_track ge
INNER JOIN Thailis.dbo.test_result tr
    ON tr.serial = ge.serial_FPA
INNER JOIN Thailis.dbo.part p 
    ON p.part = tr.test_part
LEFT JOIN Thailis.dbo.task_result ts 
    ON ts.serial = tr.serial AND ts.task = tr.task AND ts.run_number = tr.run_number
LEFT JOIN Thailis.dbo.task tkd 
    ON tkd.task = tr.task
WHERE ge.serial_GEA = @serial

UNION ALL

-- 3. Serial found via Haier table
SELECT 
    tr.task AS Task,
    tr.run_number AS Run,
    tr.date_tested AS DateTested,
    tr.test_part AS TestPart,
    p.description AS Description,
    tr.task_reference AS TaskReference,
    tr.test_result AS TestResult,
    tr.test_fault AS TestFault,
    tr.test_status AS TestStatus,
    ISNULL(ts.task_status, 'F') AS TaskStatus,
    tkd.description AS TaskDescription
FROM Thailis.dbo.Haier_serial_track ha
INNER JOIN Thailis.dbo.test_result tr
    ON tr.serial = ha.serial_FPA
INNER JOIN Thailis.dbo.part p 
    ON p.part = tr.test_part
LEFT JOIN Thailis.dbo.task_result ts 
    ON ts.serial = tr.serial AND ts.task = tr.task AND ts.run_number = tr.run_number
LEFT JOIN Thailis.dbo.task tkd 
    ON tkd.task = tr.task
WHERE ha.serial_HAIER = @serial

ORDER BY DateTested;
";


        using var conn = CreateConnection();
        return (await conn.QueryAsync<TestingInfo>(sql, new { serial })).ToList();
    }



    public async Task<List<PackingError>> GetPackingErrorsAsync(string serial)
    {
        const string sql = @"
SELECT 
    ped.part,
    p.[description] AS PartDesc,
    p.class,
    ped.serial,
    ped.return_code AS ReturnCode,
    ped.description_code AS DescriptionCode,
    ped.computer AS Computer,
    ped.date_tested AS DateTested,
    srt.status AS Status
FROM packing_error_data ped
INNER JOIN part p ON ped.part = p.part
INNER JOIN serial_track srt ON srt.serial = ped.serial
WHERE srt.serial = @serial
ORDER BY ped.date_tested;";

        using var conn = CreateConnection();
        return (await conn.QueryAsync<PackingError>(sql, new { serial })).ToList();
    }


    public async Task<List<ReworkRecord>> GetReworkRecordsAsync(string serial)
    {
        const string sql = @"
SELECT 
    rw.serial AS Serial,
    rw.part AS Part,
    rw.date_recorded AS DateRecorded,
    rw.area_recorded AS AreaRecorded,
    rw.rwk_repair_code AS RwkRepairCode,
    rp.[description] AS RwkRepairCodeDesc,
    rw.repair_area AS RepairArea,
    rw.rwk_fault_code AS RwkFaultCode,
    fc.[description] AS RwkFaultCodeDesc,
    rw.operator_id AS Mold
FROM dbo.rework_nt rw
LEFT JOIN dbo.rework_repair_codes_nt rp 
    ON rw.rwk_repair_code = rp.rwk_repair_code
LEFT JOIN dbo.rework_fault_codes_nt fc 
    ON rw.rwk_fault_code = fc.rwk_fault_code AND rw.class = fc.class
WHERE rw.serial = @serial
ORDER BY rw.date_recorded DESC;";

        using var conn = CreateConnection();
        return (await conn.QueryAsync<ReworkRecord>(sql, new { serial })).ToList();
    }

}
