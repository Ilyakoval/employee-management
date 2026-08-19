using EmployeeManagement.Api.Data;
using EmployeeManagement.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagement.Api.Controllers;

/// <summary>
/// The five SQL tasks from the assignment, exposed as live endpoints.
/// The raw T-SQL versions live in sql/queries.sql; these are the same
/// queries expressed in LINQ so they stay testable on SQLite.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReportsController(AppDbContext db) : ControllerBase
{
    /// <summary>Task 1: employees whose salary is higher than their manager's.</summary>
    [HttpGet("salary-above-manager")]
    public async Task<ActionResult<IEnumerable<SalaryAboveManagerDto>>> SalaryAboveManager()
    {
        var rows = await db.Employees.AsNoTracking()
            .Where(e => e.Manager != null && e.Salary > e.Manager!.Salary)
            .OrderBy(e => e.ID)
            .Select(e => new SalaryAboveManagerDto(
                e.ID,
                e.Name ?? string.Empty,
                e.Salary ?? 0,
                e.Manager!.Name ?? string.Empty,
                e.Manager!.Salary ?? 0))
            .ToListAsync();

        return Ok(rows);
    }

    /// <summary>Task 2: the employee with the highest salary in each department (ties included).</summary>
    [HttpGet("top-earners")]
    public async Task<ActionResult<IEnumerable<TopEarnerDto>>> TopEarners()
    {
        var rows = await db.Employees.AsNoTracking()
            .Where(e => e.Department != null &&
                        e.Salary == db.Employees
                            .Where(x => x.DepartmentID == e.DepartmentID)
                            .Max(x => x.Salary))
            .OrderBy(e => e.Department!.Name)
            .Select(e => new TopEarnerDto(
                e.Department!.Name ?? string.Empty,
                e.Name ?? string.Empty,
                e.Salary ?? 0))
            .ToListAsync();

        return Ok(rows);
    }

    /// <summary>Task 3: departments with more than <paramref name="minEmployees"/> employees.</summary>
    [HttpGet("large-departments")]
    public async Task<ActionResult<IEnumerable<DepartmentCountDto>>> LargeDepartments(
        [FromQuery] int minEmployees = 50)
    {
        var rows = await db.Employees.AsNoTracking()
            .Where(e => e.Department != null)
            .GroupBy(e => e.Department!.Name)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .Where(x => x.Count > minEmployees)
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        return Ok(rows.Select(x => new DepartmentCountDto(x.Name ?? string.Empty, x.Count)));
    }

    /// <summary>Task 4: employees whose manager is in a different department.</summary>
    [HttpGet("cross-department-managers")]
    public async Task<ActionResult<IEnumerable<CrossDepartmentManagerDto>>> CrossDepartmentManagers()
    {
        var rows = await db.Employees.AsNoTracking()
            .Where(e => e.Manager != null && e.DepartmentID != e.Manager!.DepartmentID)
            .OrderBy(e => e.ID)
            .Select(e => new CrossDepartmentManagerDto(
                e.ID,
                e.Name ?? string.Empty,
                e.Department!.Name ?? string.Empty,
                e.Manager!.Name ?? string.Empty,
                e.Manager!.Department!.Name ?? string.Empty))
            .ToListAsync();

        return Ok(rows);
    }

    /// <summary>Task 5: salary totals per department, highest first (the top row is the answer).</summary>
    [HttpGet("department-salary-totals")]
    public async Task<ActionResult<IEnumerable<DepartmentSalaryDto>>> DepartmentSalaryTotals()
    {
        var rows = await db.Employees.AsNoTracking()
            .Where(e => e.Department != null)
            .GroupBy(e => e.Department!.Name)
            .Select(g => new { Name = g.Key, Total = g.Sum(x => x.Salary) })
            .OrderByDescending(x => x.Total)
            .ToListAsync();

        return Ok(rows.Select(x => new DepartmentSalaryDto(x.Name ?? string.Empty, x.Total ?? 0)));
    }
}
