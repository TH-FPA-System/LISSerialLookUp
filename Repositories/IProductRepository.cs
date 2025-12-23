public interface IProductRepository
{
    Task<ProductDetails?> GetProductDetailsBySerialAsync(string serial);
    Task<List<TrackingInfo>> GetTrackingInfoAsync(string serial);
    Task<List<TestingInfo>> GetTestingInfoAsync(string serial);
    Task<List<PackingError>> GetPackingErrorsAsync(string serial);
    Task<List<ReworkRecord>> GetReworkRecordsAsync(string serial);
    Task<ProductAggregateDto?> GetProductAggregateAsync(string serial); // Add aggregate if needed
}
