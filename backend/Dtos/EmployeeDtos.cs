using System.ComponentModel.DataAnnotations;

namespace EmployeeManagement.Api.Dtos;

public record EmployeeDto(
    int Id,
    string FirstName,
    string LastName,
    int? DepartmentId,
    string? DepartmentName,
    int? ManagerId,
    string? ManagerName,
    decimal? Salary);

public class EmployeeUpsertDto
{
    [Required, StringLength(49, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [Required, StringLength(50, MinimumLength = 1)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    public int? DepartmentId { get; set; }

    public int? ManagerId { get; set; }

    [Required, Range(0, 9_999_999_999_999.99)]
    public decimal? Salary { get; set; }
}

public record DepartmentDto(int Id, string Name);

public record EmployeeLookupDto(int Id, string FullName);
