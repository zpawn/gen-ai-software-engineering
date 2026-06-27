# Codex / OpenAI Instructions

You are operating as Codex or ChatGPT (with Advanced Data Analysis / Code Interpreter).

**CRITICAL INSTRUCTION:** Your primary knowledge base schema, rules, and paths are defined in `AGENTS.md`. You **must** read `AGENTS.md` to understand how to operate wiki.

Agent-specific tips:
- You will likely use Python scripts (e.g., via Jupyter notebook environment) to read and manipulate the markdown files.
- Write Python functions to parse the YAML frontmatter or headers of index and log files if needed.
- Always append to logs accurately using standard file I/O `open(..., 'a')`.
