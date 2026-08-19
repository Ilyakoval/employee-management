namespace EmployeeManagement.Api.Models;

public class Employee
{
    public int ID { get; set; }
    public int? DepartmentID { get; set; }
    public int? ManagerID { get; set; }
    public string? Name { get; set; }
    public decimal? Salary { get; set; }

    public Department? Department { get; set; }
    public Employee? Manager { get; set; }
}
