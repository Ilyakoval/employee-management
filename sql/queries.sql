-- SQL Tasks for TestDB
-- Schema: Department (ID, Name), Employee (ID, DepartmentID, ManagerID, Name, Salary)

USE TestDB;
GO

--------------------------------------------------------------------------------
-- 1. Show all employees whose salary is higher than their manager's salary
--------------------------------------------------------------------------------
SELECT e.ID,
       e.Name       AS Employee,
       e.Salary,
       m.Name       AS Manager,
       m.Salary     AS ManagerSalary
FROM Employee e
JOIN Employee m ON m.ID = e.ManagerID
WHERE e.Salary > m.Salary
ORDER BY e.ID;
GO

--------------------------------------------------------------------------------
-- 2. Show the employee with the highest salary in each department
--    (RANK keeps all employees tied for the top salary)
--------------------------------------------------------------------------------
WITH Ranked AS (
    SELECT e.ID,
           e.Name,
           e.Salary,
           e.DepartmentID,
           RANK() OVER (PARTITION BY e.DepartmentID ORDER BY e.Salary DESC) AS SalaryRank
    FROM Employee e
)
SELECT d.Name  AS Department,
       r.Name  AS Employee,
       r.Salary
FROM Ranked r
JOIN Department d ON d.ID = r.DepartmentID
WHERE r.SalaryRank = 1
ORDER BY d.Name;
GO

--------------------------------------------------------------------------------
-- 3. Show departments with more than 50 employees
--------------------------------------------------------------------------------
SELECT d.Name       AS Department,
       COUNT(*)     AS EmployeeCount
FROM Employee e
JOIN Department d ON d.ID = e.DepartmentID
GROUP BY d.ID, d.Name
HAVING COUNT(*) > 50
ORDER BY EmployeeCount DESC;
GO

--------------------------------------------------------------------------------
-- 4. Show all employees whose manager is in a different department
--------------------------------------------------------------------------------
SELECT e.ID,
       e.Name   AS Employee,
       de.Name  AS EmployeeDepartment,
       m.Name   AS Manager,
       dm.Name  AS ManagerDepartment
FROM Employee e
JOIN Employee m    ON m.ID = e.ManagerID
JOIN Department de ON de.ID = e.DepartmentID
JOIN Department dm ON dm.ID = m.DepartmentID
WHERE e.DepartmentID <> m.DepartmentID
ORDER BY e.ID;
GO

--------------------------------------------------------------------------------
-- 5. Show the department with the highest sum of salaries of all its employees
--    (WITH TIES keeps every department tied for the top total)
--------------------------------------------------------------------------------
SELECT TOP (1) WITH TIES
       d.Name          AS Department,
       SUM(e.Salary)   AS TotalSalary
FROM Employee e
JOIN Department d ON d.ID = e.DepartmentID
GROUP BY d.ID, d.Name
ORDER BY SUM(e.Salary) DESC;
GO
