---
name: dotnet-coding-standards
description: |
  Enforces consistent .NET and C# coding standards across projects.
  Use this skill when generating, refactoring, or reviewing C# code,
  ASP.NET APIs, services, background jobs, or libraries.
  Applies clean code principles, SOLID design, async best practices,
  naming conventions, and enterprise-ready patterns.
---

# .NET Coding Style & Standards

This skill defines **opinionated, production-grade coding standards**
for C# and .NET projects.  
Claude should **always follow these rules** when writing or reviewing code.

---

## 1. General Principles

- Prefer **readability over cleverness**
- Follow **SOLID principles**
- Keep methods **small and focused**
- Avoid premature optimization
- Fail fast with meaningful errors
- Prefer **explicit over implicit**

---

## 2. Naming Conventions

### Classes, Structs, Records, Enums
- Use **PascalCase**
- Use **nouns** for entities
- Use **suffixes** where appropriate

```csharp
public class UserService
public record JobApplicationDto
public enum ApplicationStatus

Interfaces

Prefix with I

public interface IUserRepository

Methods

PascalCase

Use verbs

Async methods must end with Async

Task<UserDto> GetUserByIdAsync(Guid userId);

Variables & Parameters

camelCase

Avoid abbreviations

var applicationCount = 0;

Constants

PascalCase

public const int MaxRetryCount = 3;

3. File & Folder Structure

One public class per file

File name must match the class name

Group by feature, not by technical layer where possible

Preferred

Jobs/
 ├── CreateJob/
 │   ├── CreateJobCommand.cs
 │   ├── CreateJobHandler.cs
 │   └── CreateJobValidator.cs

4. Code Formatting

Use explicit access modifiers

Use braces {} always

One statement per line

Avoid deeply nested code

if (isValid)
{
    Process();
}

5. Async / Await Rules

Never block async code

Avoid .Result and .Wait()

Always propagate async all the way up

Use CancellationToken for public async APIs

public async Task ProcessAsync(
    Guid jobId,
    CancellationToken cancellationToken)
{
    await _repository.SaveAsync(jobId, cancellationToken);
}

6. Dependency Injection

Constructor injection only

No service locator

Depend on abstractions, not implementations

public class JobService
{
    private readonly IJobRepository _jobRepository;

    public JobService(IJobRepository jobRepository)
    {
        _jobRepository = jobRepository;
    }
}

7. Error Handling

Do not swallow exceptions

Throw domain-specific exceptions

Use global exception handling middleware

Avoid try-catch unless you can handle the error meaningfully

throw new JobNotFoundException(jobId);

8. Logging Standards

Use structured logging

Do not log sensitive data

Log at correct levels

Level	When to Use
Information	Normal flow
Warning	Recoverable issues
Error	Failed operations
Critical	App-level failures
_logger.LogInformation(
    "Job {JobId} created successfully",
    jobId);

9. API Design (ASP.NET)

Use RESTful naming

Use ActionResult<T>

Return correct HTTP status codes

[HttpGet("{id:guid}")]
public async Task<ActionResult<JobDto>> Get(Guid id)
{
    var job = await _service.GetAsync(id);
    return Ok(job);
}

10. DTOs & Mapping

Never expose entities directly

Use DTOs for API boundaries

Mapping should be explicit (AutoMapper optional)

public sealed class JobDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
}

11. Entity Framework Guidelines

Use AsNoTracking() for read-only queries

Avoid lazy loading

Explicitly configure relationships

Avoid heavy logic inside LINQ queries

await _context.Jobs
    .AsNoTracking()
    .Where(j => j.IsActive)
    .ToListAsync();

12. Unit Testing Standards

Use xUnit / NUnit

Follow Arrange–Act–Assert

Test behavior, not implementation

Mock external dependencies

[Fact]
public async Task GetJobAsync_ShouldReturnJob_WhenJobExists()
{
    // Arrange

    // Act

    // Assert
}

13. Code Smells to Avoid

God classes

Magic numbers

Deep nesting

Static state

Overloaded constructors

Mixing business logic with infrastructure

14. Security Best Practices

Never trust user input

Validate at boundaries

Use parameterized queries

Do not log secrets

Use SecureString or secret stores where applicable

15. When Claude Should Apply This Skill

Claude should automatically apply this skill when:

Writing new C# or .NET code

Refactoring existing code

Reviewing PRs

Creating APIs or services

Generating examples or templates

If conflicting instructions exist, this skill takes priority.


---

## ✅ What This Skill Gives You

- Consistent **enterprise-grade C# output**
- Cleaner PRs & reviews
- Fewer async & DI mistakes
- Claude behaves like a **senior .NET architect**

---