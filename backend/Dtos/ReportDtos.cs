namespace EmployeeManagement.Api.Dtos;

/// <summary>Task 1: employees whose salary is higher than their manager's.</summary>
public record SalaryAboveManagerDto(
    int Id,
    string Employee,
    decimal Salary,
    string Manager,
    decimal ManagerSalary);

/// <summary>Task 2: the employee with the highest salary in each department.</summary>
public record TopEarnerDto(string Department, string Employee, decimal Salary);

/// <summary>Task 3: departments with more than N employees.</summary>
public record DepartmentCountDto(string Department, int EmployeeCount);

/// <summary>Task 4: employees whose manager is in a different department.</summary>
public record CrossDepartmentManagerDto(
    int Id,
    string Employee,
    string EmployeeDepartment,
    string Manager,
    string ManagerDepartment);

/// <summary>Task 5: salary totals per department (the top one is the answer).</summary>
public record DepartmentSalaryDto(string Department, decimal TotalSalary);
