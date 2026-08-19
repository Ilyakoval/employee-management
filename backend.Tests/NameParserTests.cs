using EmployeeManagement.Api.Services;

namespace EmployeeManagement.Api.Tests;

public class NameParserTests
{
    [Theory]
    [InlineData("John Smith", "John", "Smith")]
    [InlineData("John Paul de la Rama", "John", "Paul de la Rama")]
    [InlineData("Madonna", "Madonna", "")]
    [InlineData("  Anna   Lee  ", "Anna", "Lee")]
    [InlineData("", "", "")]
    [InlineData(null, "", "")]
    public void Split_FollowsFirstSpaceConvention(string? fullName, string first, string last)
    {
        var (firstName, lastName) = NameParser.Split(fullName);

        Assert.Equal(first, firstName);
        Assert.Equal(last, lastName.Trim());
    }

    [Theory]
    [InlineData("John", "Smith", "John Smith")]
    [InlineData(" John ", " Paul de la Rama ", "John Paul de la Rama")]
    [InlineData("Madonna", "", "Madonna")]
    public void Combine_TrimsAndJoins(string first, string last, string expected)
    {
        Assert.Equal(expected, NameParser.Combine(first, last));
    }

    [Theory]
    [InlineData("John Smith")]
    [InlineData("John Paul de la Rama")]
    public void SplitThenCombine_RoundTrips(string fullName)
    {
        var (first, last) = NameParser.Split(fullName);

        Assert.Equal(fullName, NameParser.Combine(first, last));
    }
}
