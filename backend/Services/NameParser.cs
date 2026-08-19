namespace EmployeeManagement.Api.Services;

/// <summary>
/// TestDB stores the employee's full name in a single Name column.
/// Convention: the first word is the first name, the rest is the surname
/// (e.g. "John Paul de la Rama" -> "John" + "Paul de la Rama").
/// </summary>
public static class NameParser
{
    public static (string FirstName, string LastName) Split(string? fullName)
    {
        var trimmed = (fullName ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return (string.Empty, string.Empty);

        var spaceIndex = trimmed.IndexOf(' ');
        return spaceIndex < 0
            ? (trimmed, string.Empty)
            : (trimmed[..spaceIndex], trimmed[(spaceIndex + 1)..].Trim());
    }

    public static string Combine(string firstName, string lastName)
        => $"{firstName.Trim()} {lastName.Trim()}".Trim();
}
