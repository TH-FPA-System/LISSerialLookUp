// TrackHistory entity
public class TrackHistory
{
    public int Id { get; set; }                // Primary key
    public string Part { get; set; }           // part number
    public string Serial { get; set; }         // serial number
    public string Task { get; set; }           // task ID
    public string Store_Location { get; set; } // store/workcell
    public string Status { get; set; }         // P/R/D
    public DateTime Last_Maint { get; set; }   // timestamp
    public string Last_Maint_Logon { get; set; } // operator/logon
}