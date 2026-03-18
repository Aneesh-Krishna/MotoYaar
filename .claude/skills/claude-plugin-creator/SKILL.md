---
name: claude-plugin-creator
description: |
  Provides comprehensive guidance for creating Claude Code plugins.
  Use this skill when designing plugin architecture, creating marketplace.json
  or plugin.json files, structuring plugin directories, or deciding what
  components (skills, agents, commands) a plugin should include.
  Ensures correct schema adherence and best practices.
---

# Claude Plugin Creator Skill

This skill instructs Claude to be an expert in **Claude Code plugin architecture**
and the correct schema for all plugin components.

---

## 1. Plugin Structure Fundamentals

Claude must understand and enforce the correct plugin directory structure:

```
my-plugin/
├── .claude-plugin/
│   ├── marketplace.json    # Marketplace registry (required)
│   └── plugin.json         # Plugin manifest (required)
├── commands/               # Slash commands (optional)
│   └── my-command.md
├── agents/                 # Custom subagents (optional)
│   └── my-agent/
│       └── AGENT.md
├── skills/                 # Auto-discovered skills (optional)
│   └── my-skill/
│       └── SKILL.md
└── hooks/                  # Hook configurations (optional)
```

---

## 2. marketplace.json Schema Rules

Claude MUST enforce these rules for marketplace.json:

### Required Fields
- `name`: kebab-case string
- `owner.name`: string
- `plugins[].name`: kebab-case string
- `plugins[].description`: string
- `plugins[].source`: path to plugin directory

### Optional Fields
- `owner.email`
- `metadata.description`
- `metadata.version`
- `plugins[].version`
- `plugins[].category`: development|productivity|learning|security
- `plugins[].author.name`
- `plugins[].author.email`

### Prohibited Fields
- `skills` array in plugin entries
- `commands` array in plugin entries
- `agents` array in plugin entries
- `strict` field

---

## 3. plugin.json Schema Rules

Claude MUST enforce these rules for plugin.json:

### Required Fields
- `name`: kebab-case string

### Optional Fields
- `description`: string
- `version`: semver string
- `author.name` and `author.email`
- `homepage`: URL
- `repository`: URL
- `license`: SPDX identifier
- `keywords`: string array
- `commands`: **directory path string** (e.g., `"./commands/"`)
- `agents`: **array of file paths** (e.g., `["./agents/my-agent/AGENT.md"]`)
- `hooks`: string or object
- `mcpServers`: object
- `lspServers`: object

### Prohibited Fields
- `skills` array — skills are auto-discovered from `skills/` directory

### Critical Format Rules
- `commands` MUST be a directory path string, NOT an array
- `agents` MUST be an array of file paths, NOT a directory path

---

## 4. AGENT.md Schema Rules

Claude MUST enforce these rules for agent files:

### Required Fields
- `name`: kebab-case string
- `description`: string explaining when to delegate to this agent

### Optional Fields
- `tools`: **comma-separated string** (e.g., `"Read, Glob, Grep"`)
- `model`: sonnet|opus|haiku|inherit
- `permissionMode`: default|acceptEdits|dontAsk|bypassPermissions|plan
- `skills`: string
- `hooks`: object

### Critical Format Rules
- `tools` MUST be a comma-separated string, NOT a YAML array

---

## 5. Command File Schema Rules

Claude MUST enforce these rules for command markdown files:

### Frontmatter Fields
- `name`: command name (defaults to filename)
- `description`: brief description
- `allowed-tools`: comma-separated tool list
- `argument-hint`: expected arguments for autocomplete
- `model`: sonnet|opus|haiku
- `context`: set to `fork` for sub-agent context
- `agent`: agent type when `context: fork`

### Body
- Use `$ARGUMENTS` for all arguments
- Use `$1`, `$2` for individual positional arguments

---

## 6. SKILL.md Schema Rules

### Location
Skills are auto-discovered from `skills/<skill-name>/SKILL.md`

### Frontmatter
- `name`: kebab-case string (required)
- `description`: multi-line description of when to apply (required)

### Content Guidelines
- Define behavioral constraints, not workflows
- Keep skills stateless
- Use declarative "Claude must/should" language
- Focus on principles, not procedures

---

## 7. Plugin Design Decisions

Claude must help users decide what components to include:

### Use a Skill when:
- Behavior should apply implicitly across tasks
- Rules should be inherited by multiple agents
- Governance or consistency matters
- Behavior is foundational or safety-related

### Use an Agent when:
- Explicit invocation is needed
- A deterministic workflow is required
- Tool execution sequences are involved
- The task is procedural

### Use a Command when:
- Users need a quick slash-command shortcut
- Arguments should be passed directly
- Simple, focused functionality is needed

---

## 8. Common Mistakes to Prevent

Claude MUST catch and correct these errors:

| Error | Correction |
|-------|------------|
| `skills` array in plugin.json | Remove it — skills are auto-discovered |
| `agents: "./agents/"` | Change to array: `["./agents/x/AGENT.md"]` |
| `commands: ["./commands/x.md"]` | Change to string: `"./commands/"` |
| `tools:` as YAML array | Change to: `tools: Tool1, Tool2` |
| Missing agent `name` | Add required name field |
| Missing agent `description` | Add required description field |

---

## 9. Validation Checklist

When creating or reviewing a plugin, Claude must verify:

- [ ] Directory structure follows the standard layout
- [ ] `.claude-plugin/` folder exists with both JSON files
- [ ] marketplace.json has valid syntax and required fields
- [ ] plugin.json has valid syntax and correct field formats
- [ ] All AGENT.md files have name and description
- [ ] All AGENT.md files use comma-separated string for tools
- [ ] All SKILL.md files exist in proper skill directories
- [ ] All command files have valid YAML frontmatter

---

## 10. When to Apply This Skill

Apply this skill automatically when the user:

- Asks to create a Claude plugin
- Needs help with marketplace.json or plugin.json
- Is structuring a plugin directory
- Reviews or debugs plugin configuration
- Decides between skills, agents, or commands
- Wants to understand Claude Code plugin architecture

This skill takes priority over general development skills when plugin creation is involved.

---

## End of Skill
