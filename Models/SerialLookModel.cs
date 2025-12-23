// Models/ProductDetails.cs
public class ProductDetails
{
    public string SerialFPA { get; set; } = string.Empty;
    public string? SerialGEA { get; set; }
    public string? SerialHAIER { get; set; }
    public string Part { get; set; } = string.Empty;
    public string? PartIssue { get; set; }
    public DateTime? SerialIssueDate { get; set; }
    public string? VAI_FoamCode { get; set; }

    public string? Status { get; set; }
}
public class TrackingInfo
{
    public int workcell { get; set; }
    public int task { get; set; }
    public string? store_location { get; set; }
    public string? status { get; set; }
    public string? grade { get; set; }
    public DateTime? last_maint { get; set; }
    public string? last_maint_logon { get; set; }
    public int zone { get; set; }
    public string? store { get; set; }
    public string? update_reference { get; set; }

    // New fields based on your SQL
    public string? serial { get; set; }           // maps to serial column (GEA, HAIER, or track_history)
    public string? reject_reason { get; set; }   // maps to ci.last_maint_logon

    // Optional: if you want order_no from serial_track_sod
    public string? order_no { get; set; }        // maps to stod.order_no
}


public class TestingInfo
{
    public int Task { get; set; }
    public int Run { get; set; }
    public DateTime? DateTested { get; set; }
    public string? TestPart { get; set; }
    public string? Description { get; set; }
    public string? TaskReference { get; set; }
    public string? TestResult { get; set; }
    public string? TestFault { get; set; }
    public string? TestStatus { get; set; }
    public string? TaskStatus { get; set; }
    public string? TaskDescription { get; set; }
}



public class PackingError
{
    public string? ReturnCode { get; set; }
    public string? DescriptionCode { get; set; }
    public string? Computer { get; set; }
    public DateTime? DateTested { get; set; }
    public string? Status { get; set; }
}

public class ReworkRecord
{
    public string? Serial { get; set; }
    public string? Part { get; set; }
    public DateTime? DateRecorded { get; set; }
    public string? AreaRecorded { get; set; }
    public string? RwkRepairCode { get; set; }
    public string? RwkRepairCodeDesc { get; set; }
    public string? RepairArea { get; set; }
    public string? RwkFaultCode { get; set; }
    public string? RwkFaultCodeDesc { get; set; }
    public string? Mold { get; set; }
}
public class ProductAggregateDto
{
    public ProductDetails ProductDetails { get; set; } = new ProductDetails();
    public IEnumerable<TrackingInfo> Tracking { get; set; } = Array.Empty<TrackingInfo>();
    public IEnumerable<TestingInfo> Testing { get; set; } = Array.Empty<TestingInfo>();
    public IEnumerable<PackingError> PackingErrors { get; set; } = Array.Empty<PackingError>();
    public IEnumerable<ReworkRecord> ReworkRecords { get; set; } = Array.Empty<ReworkRecord>();
}
