using EmployeeManagement.Api.Controllers;
using EmployeeManagement.Api.Data;
using EmployeeManagement.Api.Dtos;
using EmployeeManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagement.Api.Tests;

public sealed class ReportsControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly ReportsController _controller;

    public ReportsControllerTests()
    {
        (_connection, _db) = TestDb.Create();

        _db.Departments.AddRange(
            new Department { ID = 1, Name = "Finance" },
            new Department { ID = 2, Name = "HR" });
        _db.Employees.AddRange(
            // Finance: Alice (5000, no manager), Bob (6000, managed by Alice — earns more),
            //          Eve (6000, managed by Alice — ties with Bob for top salary)
            new Employee { ID = 1, Name = "Alice Boss", DepartmentID = 1, ManagerID = null, Salary = 5000m },
            new Employee { ID = 2, Name = "Bob Worker", DepartmentID = 1, ManagerID = 1, Salary = 6000m },
            new Employee { ID = 3, Name = "Eve Equal", DepartmentID = 1, ManagerID = 1, Salary = 6000m },
            // HR: Carol (2000) managed by Alice from Finance (cross-department)
            new Employee { ID = 4, Name = "Carol Cross", DepartmentID = 2, ManagerID = 1, Salary = 2000m });
        _db.SaveChanges();

        _controller = new ReportsController(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private static List<T> Rows<T>(ActionResult<IEnumerable<T>> result) =>
        Assert.IsAssignableFrom<IEnumerable<T>>(
            Assert.IsType<OkObjectResult>(result.Result).Value).ToList();

    [Fact]
    public async Task SalaryAboveManager_FindsOnlyEmployeesEarningMore()
    {
        var rows = Rows(await _controller.SalaryAboveManager());

        Assert.Equal([2, 3], rows.Select(r => r.Id).Order());
        Assert.All(rows, r => Assert.True(r.Salary > r.ManagerSalary));
    }

    [Fact]
    public async Task TopEarners_ReturnsHighestPerDepartment_IncludingTies()
    {
        var rows = Rows(await _controller.TopEarners());

        var finance = rows.Where(r => r.Department == "Finance").Select(r => r.Employee).Order().ToList();
        Assert.Equal(["Bob Worker", "Eve Equal"], finance); // tie kept
        Assert.Equal("Carol Cross", rows.Single(r => r.Department == "HR").Employee);
    }

    [Fact]
    public async Task LargeDepartments_RespectsThreshold()
    {
        Assert.Empty(Rows(await _controller.LargeDepartments(minEmployees: 50)));

        var rows = Rows(await _controller.LargeDepartments(minEmployees: 2));
        Assert.Equal("Finance", Assert.Single(rows).Department);
        Assert.Equal(3, rows[0].EmployeeCount);
    }

    [Fact]
    public async Task CrossDepartmentManagers_FindsEmployeesWithManagerElsewhere()
    {
        var rows = Rows(await _controller.CrossDepartmentManagers());

        var row = Assert.Single(rows);
        Assert.Equal("Carol Cross", row.Employee);
        Assert.Equal("HR", row.EmployeeDepartment);
        Assert.Equal("Finance", row.ManagerDepartment);
    }

    [Fact]
    public async Task DepartmentSalaryTotals_OrdersHighestFirst()
    {
        var rows = Rows(await _controller.DepartmentSalaryTotals());

        Assert.Equal(2, rows.Count);
        Assert.Equal("Finance", rows[0].Department);
        Assert.Equal(17000m, rows[0].TotalSalary);
        Assert.Equal(2000m, rows[1].TotalSalary);
    }
}
