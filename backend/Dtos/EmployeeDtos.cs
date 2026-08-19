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
    // Employee.Name is nvarchar(100) and stores "FirstName LastName",
    // so both parts plus the separating space must fit into 100 characters.
    public const int FirstNameMaxLength = 49;
    public const int LastNameMaxLength = 50;

    [Required, StringLength(FirstNameMaxLength, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [Required, StringLength(LastNameMaxLength, MinimumLength = 1)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    public int? DepartmentId { get; set; }

    public int? ManagerId { get; set; }

    // Salary is decimal(18,2): up to 16 integer digits.
    [Required, Range(0, 9_999_999_999_999_999.99)]
    public decimal? Salary { get; set; }
}

public record DepartmentDto(int Id, string Name);
