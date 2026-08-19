using EmployeeManagement.Api.Controllers;
using EmployeeManagement.Api.Data;
using EmployeeManagement.Api.Dtos;
using EmployeeManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagement.Api.Tests;

/// <summary>
/// Controller tests against an in-memory SQLite database, which — unlike the
/// EF InMemory provider — supports transactions and relational semantics.
/// </summary>
public sealed class EmployeesControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly EmployeesController _controller;

    public EmployeesControllerTests()
    {
        (_connection, _db) = TestDb.Create();

        _db.Departments.AddRange(
            new Department { ID = 1, Name = "Finance" },
            new Department { ID = 2, Name = "HR" });
        _db.Employees.AddRange(
            new Employee { ID = 1, Name = "Alice Boss", DepartmentID = 1, ManagerID = null, Salary = 5000m },
            new Employee { ID = 2, Name = "Bob Worker", DepartmentID = 1, ManagerID = 1, Salary = 3000m },
            new Employee { ID = 3, Name = "Carol Solo", DepartmentID = 2, ManagerID = 1, Salary = 2000m });
        _db.SaveChanges();

        _controller = new EmployeesController(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public async Task GetAll_ReturnsEmployeesWithDepartmentAndManagerNames()
    {
        var result = await _controller.GetAll();

        var employees = Assert.IsAssignableFrom<IEnumerable<EmployeeDto>>(
            Assert.IsType<OkObjectResult>(result.Result).Value).ToList();
        Assert.Equal(3, employees.Count);
        var bob = employees.Single(e => e.Id == 2);
        Assert.Equal("Bob", bob.FirstName);
        Assert.Equal("Worker", bob.LastName);
        Assert.Equal("Finance", bob.DepartmentName);
        Assert.Equal("Alice Boss", bob.ManagerName);
    }

    [Fact]
    public async Task Create_CombinesNameAndPersists()
    {
        var result = await _controller.Create(new EmployeeUpsertDto
        {
            FirstName = "John",
            LastName = "Paul de la Rama",
            DepartmentId = 2,
            ManagerId = 1,
            Salary = 1500m
        });

        var dto = Assert.IsType<EmployeeDto>(
            Assert.IsType<CreatedAtActionResult>(result.Result).Value);
        var stored = await _db.Employees.AsNoTracking().SingleAsync(e => e.ID == dto.Id);
        Assert.Equal("John Paul de la Rama", stored.Name);
        Assert.Equal("HR", dto.DepartmentName);
    }

    [Fact]
    public async Task Create_UnknownDepartment_ReturnsBadRequest()
    {
        var result = await _controller.Create(new EmployeeUpsertDto
        {
            FirstName = "X",
            LastName = "Y",
            DepartmentId = 99,
            Salary = 1m
        });

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Contains("department", Assert.IsType<ProblemDetails>(bad.Value).Title, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Create_UnknownManager_ReturnsBadRequest()
    {
        var result = await _controller.Create(new EmployeeUpsertDto
        {
            FirstName = "X",
            LastName = "Y",
            DepartmentId = 1,
            ManagerId = 99,
            Salary = 1m
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Update_SelfAsManager_ReturnsBadRequest()
    {
        var result = await _controller.Update(2, new EmployeeUpsertDto
        {
            FirstName = "Bob",
            LastName = "Worker",
            DepartmentId = 1,
            ManagerId = 2,
            Salary = 3000m
        });

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Contains("himself", Assert.IsType<ProblemDetails>(bad.Value).Title);
    }

    [Fact]
    public async Task Update_ChangesAllEditableFields()
    {
        var result = await _controller.Update(3, new EmployeeUpsertDto
        {
            FirstName = "Caroline",
            LastName = "Sologub",
            DepartmentId = 1,
            ManagerId = 2,
            Salary = 2500m
        });

        Assert.IsType<OkObjectResult>(result.Result);
        var stored = await _db.Employees.AsNoTracking().SingleAsync(e => e.ID == 3);
        Assert.Equal("Caroline Sologub", stored.Name);
        Assert.Equal(1, stored.DepartmentID);
        Assert.Equal(2, stored.ManagerID);
        Assert.Equal(2500m, stored.Salary);
    }

    [Fact]
    public async Task Update_MissingEmployee_ReturnsNotFound()
    {
        var result = await _controller.Update(99, new EmployeeUpsertDto
        {
            FirstName = "X",
            LastName = "Y",
            DepartmentId = 1,
            Salary = 1m
        });

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Delete_Manager_ReturnsConflictAndKeepsEmployee()
    {
        var result = await _controller.Delete(1);

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.Contains("cannot be deleted", Assert.IsType<ProblemDetails>(conflict.Value).Title);
        Assert.NotNull(await _db.Employees.FindAsync(1));
    }

    [Fact]
    public async Task Delete_NonManager_RemovesEmployee()
    {
        var result = await _controller.Delete(3);

        Assert.IsType<NoContentResult>(result);
        Assert.Null(await _db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.ID == 3));
    }

    [Fact]
    public async Task Delete_MissingEmployee_ReturnsNotFound()
    {
        Assert.IsType<NotFoundObjectResult>(await _controller.Delete(99));
    }

    [Fact]
    public async Task Delete_Manager_ReportsSubordinateCountInConflict()
    {
        var conflict = Assert.IsType<ConflictObjectResult>(await _controller.Delete(1));

        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(2, problem.Extensions["subordinateCount"]);
    }

    [Fact]
    public async Task Delete_ManagerWithReassign_MovesSubordinatesAndDeletes()
    {
        var result = await _controller.Delete(1, reassignTo: "2");

        Assert.IsType<NoContentResult>(result);
        Assert.Null(await _db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.ID == 1));
        Assert.Equal(2, (await _db.Employees.AsNoTracking().SingleAsync(e => e.ID == 3)).ManagerID);
        // Bob (id 2) reported to Alice and became the new manager himself:
        // he must end up top-level, not reporting to himself.
        Assert.Null((await _db.Employees.AsNoTracking().SingleAsync(e => e.ID == 2)).ManagerID);
    }

    [Fact]
    public async Task Delete_ManagerWithReassignNone_ClearsManager()
    {
        var result = await _controller.Delete(1, reassignTo: "none");

        Assert.IsType<NoContentResult>(result);
        Assert.Null((await _db.Employees.AsNoTracking().SingleAsync(e => e.ID == 2)).ManagerID);
        Assert.Null((await _db.Employees.AsNoTracking().SingleAsync(e => e.ID == 3)).ManagerID);
    }

    [Fact]
    public async Task Delete_ReassignToSelf_ReturnsBadRequest()
    {
        var bad = Assert.IsType<BadRequestObjectResult>(await _controller.Delete(1, reassignTo: "1"));
        Assert.Contains("being deleted", Assert.IsType<ProblemDetails>(bad.Value).Title);
        Assert.NotNull(await _db.Employees.FindAsync(1));
    }

    [Fact]
    public async Task Delete_ReassignToMissingEmployee_ReturnsBadRequest()
    {
        Assert.IsType<BadRequestObjectResult>(await _controller.Delete(1, reassignTo: "99"));
    }
}
