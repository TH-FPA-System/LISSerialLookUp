using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    { }

    // Line layout table
    public DbSet<LISLineInfo> LISLineInfo { get; set; }

    // Serial tracking history
    public DbSet<TrackHistory> TrackHistory { get; set; }
}
