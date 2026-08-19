using EmployeeManagement.Api.Data;
using EmployeeManagement.Api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagement.Api.Tests;

/// <summary>
/// Creates an in-memory SQLite AppDbContext for tests. SQLite stores decimals
/// as TEXT and cannot aggregate them (SUM/MAX crash or compare lexically), so
/// the test context maps Salary to double — production SQL Server mapping in
/// AppDbContext stays decimal(18,2).
/// </summary>
public static class TestDb
{
    public static (SqliteConnection Connection, AppDbContext Db) Create()
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        var db = new SqliteAppDbContext(
            new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);
        db.Database.EnsureCreated();
        return (connection, db);
    }

    private sealed class SqliteAppDbContext(DbContextOptions<AppDbContext> options)
        : AppDbContext(options)
    {
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Employee>()
                .Property(e => e.Salary)
                .HasConversion<double>();
        }
    }
}
