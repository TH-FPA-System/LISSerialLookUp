public class LISLineInfo
{
    public int FactoryLineID { get; set; }      // PK
    public string CLASS_PRODUCT { get; set; }   // e.g., DISHDRAWER
    public string STORE_LOCATION { get; set; }
    public int SEQ_LV_NO { get; set; }
    public int PositionX { get; set; }
    public int PositionY { get; set; }
    public string LabelText { get; set; }
}
