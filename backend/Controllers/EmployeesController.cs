using EmployeeManagement.Api.Data;
using EmployeeManagement.Api.Dtos;
using EmployeeManagement.Api.Models;
using EmployeeManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EmployeeDto>>> GetAll()
    {
        var employees = await db.Employees
            .AsNoTracking()
            .Include(e => e.Department)
            .Include(e => e.Manager)
            .OrderBy(e => e.ID)
            .ToListAsync();

        return Ok(employees.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EmployeeDto>> GetById(int id)
    {
        var employee = await db.Employees
            .AsNoTracking()
            .Include(e => e.Department)
            .Include(e => e.Manager)
            .FirstOrDefaultAsync(e => e.ID == id);

        return employee is null ? NotFound() : Ok(ToDto(employee));
    }

    [HttpPost]
    public async Task<ActionResult<EmployeeDto>> Create(EmployeeUpsertDto dto)
    {
        var error = await ValidateReferencesAsync(dto, employeeId: null);
        if (error is not null)
            return error;

        var employee = new Employee
        {
            Name = NameParser.Combine(dto.FirstName, dto.LastName),
            DepartmentID = dto.DepartmentId,
            ManagerID = dto.ManagerId,
            Salary = dto.Salary
        };

        db.Employees.Add(employee);
        await db.SaveChangesAsync();
        await db.Entry(employee).Reference(e => e.Department).LoadAsync();
        await db.Entry(employee).Reference(e => e.Manager).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = employee.ID }, ToDto(employee));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<EmployeeDto>> Update(int id, EmployeeUpsertDto dto)
    {
        var employee = await db.Employees.FirstOrDefaultAsync(e => e.ID == id);
        if (employee is null)
            return NotFound(new ProblemDetails { Title = "Employee not found." });

        var error = await ValidateReferencesAsync(dto, employeeId: id);
        if (error is not null)
            return error;

        employee.Name = NameParser.Combine(dto.FirstName, dto.LastName);
        employee.DepartmentID = dto.DepartmentId;
        employee.ManagerID = dto.ManagerId;
        employee.Salary = dto.Salary;

        await db.SaveChangesAsync();
        await db.Entry(employee).Reference(e => e.Department).LoadAsync();
        await db.Entry(employee).Reference(e => e.Manager).LoadAsync();

        return Ok(ToDto(employee));
    }

    /// <summary>
    /// Deletes an employee. A manager cannot be deleted while he still has
    /// subordinates — pass <paramref name="reassignTo"/> (an employee id or
    /// "none") to move his reports to a new manager in the same transaction.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] string? reassignTo = null)
    {
        // TestDB has no FK from ManagerID, so the subordinate check, the
        // reassignment and the delete must happen atomically — a serializable
        // transaction prevents a concurrent request from assigning this
        // employee as someone's manager between the check and the delete.
        await using var transaction =
            await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);

        var employee = await db.Employees.FirstOrDefaultAsync(e => e.ID == id);
        if (employee is null)
            return NotFound(new ProblemDetails { Title = "Employee not found." });

        var subordinates = await db.Employees
            .Where(e => e.ManagerID == id && e.ID != id)
            .ToListAsync();

        if (subordinates.Count > 0)
        {
            if (reassignTo is null)
            {
                var problem = new ProblemDetails
                {
                    Title = "This employee is a manager of other employees and cannot be deleted."
                };
                problem.Extensions["subordinateCount"] = subordinates.Count;
                return Conflict(problem);
            }

            int? newManagerId;
            if (reassignTo == "none")
            {
                newManagerId = null;
            }
            else if (int.TryParse(reassignTo, out var targetId))
            {
                if (targetId == id)
                    return BadRequest(new ProblemDetails
                        { Title = "Subordinates cannot be reassigned to the employee being deleted." });
                if (!await db.Employees.AnyAsync(e => e.ID == targetId))
                    return BadRequest(new ProblemDetails
                        { Title = "The reassignment target does not exist." });
                newManagerId = targetId;
            }
            else
            {
                return BadRequest(new ProblemDetails
                    { Title = "reassignTo must be an employee id or 'none'." });
            }

            // If the new manager was himself a subordinate of the deleted one,
            // he becomes a top-level manager instead of reporting to himself.
            foreach (var subordinate in subordinates)
                subordinate.ManagerID = subordinate.ID == newManagerId ? null : newManagerId;
        }

        db.Employees.Remove(employee);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return NoContent();
    }

    private async Task<ActionResult?> ValidateReferencesAsync(EmployeeUpsertDto dto, int? employeeId)
    {
        if (dto.ManagerId is not null && dto.ManagerId == employeeId)
            return BadRequest(new ProblemDetails { Title = "An employee cannot be a manager of himself." });

        if (!await db.Departments.AnyAsync(d => d.ID == dto.DepartmentId))
            return BadRequest(new ProblemDetails { Title = "The selected department does not exist." });

        if (dto.ManagerId is not null && !await db.Employees.AnyAsync(e => e.ID == dto.ManagerId))
            return BadRequest(new ProblemDetails { Title = "The selected manager does not exist." });

        return null;
    }

    private static EmployeeDto ToDto(Employee e)
    {
        var (firstName, lastName) = NameParser.Split(e.Name);
        return new EmployeeDto(
            e.ID,
            firstName,
            lastName,
            e.DepartmentID,
            e.Department?.Name,
            e.ManagerID,
            e.Manager?.Name,
            e.Salary);
    }
}
