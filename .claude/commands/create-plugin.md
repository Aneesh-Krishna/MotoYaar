---
name: create-plugin
description: Create a new Claude Code plugin with proper structure and schema
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: [plugin-name] [description]
---

# Create Claude Plugin

Create a new Claude Code plugin with the following specifications:

**Plugin Name:** $1
**Description:** $ARGUMENTS

## Instructions

You are tasked with creating a complete Claude Code plugin. Follow these steps:

### 1. Determine Plugin Details

If the user provided a plugin name and description, use them.
If not, ask for:
- Plugin name (use kebab-case)
- Brief description of what the plugin does
- Author name
- What components are needed (skills, agents, commands)

### 2. Apply the claude-plugin-creator Skill

Use the `claude-plugin-creator` skill to ensure all schema requirements are met.

### 3. Create the Plugin Structure

Create the following directory structure:
```
<plugin-name>/
├── .claude-plugin/
│   ├── marketplace.json
│   └── plugin.json
├── commands/          (if needed)
├── agents/            (if needed)
└── skills/            (if needed)
```

### 4. Generate Required Files

Create all necessary files with valid content:

**marketplace.json** - The marketplace registry with plugin entry
**plugin.json** - The plugin manifest with correct field formats
**AGENT.md** files - For any agents (in agents/<name>/AGENT.md)
**SKILL.md** files - For any skills (in skills/<name>/SKILL.md)
**Command .md** files - For any commands (in commands/)

### 5. Validate the Plugin

Ensure:
- All JSON is valid
- Required fields are present
- Field formats are correct (commands=string, agents=array)
- Tools in AGENT.md use comma-separated string format
- Skills are NOT listed in plugin.json

### 6. Show Next Steps

After creation, provide:
- How to test: `claude --plugin-dir ./<plugin-name>`
- How to add marketplace: `/plugin marketplace add ./<plugin-name>`
- How to install: `/plugin install <plugin-name>@<marketplace-name>`

## Important Schema Reminders

- `commands` in plugin.json is a DIRECTORY PATH string
- `agents` in plugin.json is an ARRAY of file paths
- `tools` in AGENT.md is a COMMA-SEPARATED string
- Skills are auto-discovered - do NOT add them to plugin.json
- All names must be kebab-case
