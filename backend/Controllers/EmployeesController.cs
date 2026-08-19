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

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        // TestDB has no FK from ManagerID, so the "is a manager" check and the
        // delete must happen atomically — a serializable transaction prevents a
        // concurrent request from assigning this employee as someone's manager
        // between the check and the delete.
        await using var transaction =
            await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);

        var employee = await db.Employees.FirstOrDefaultAsync(e => e.ID == id);
        if (employee is null)
            return NotFound(new ProblemDetails { Title = "Employee not found." });

        var isManager = await db.Employees.AnyAsync(e => e.ManagerID == id && e.ID != id);
        if (isManager)
        {
            return Conflict(new ProblemDetails
            {
                Title = "This employee is a manager of other employees and cannot be deleted."
            });
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
