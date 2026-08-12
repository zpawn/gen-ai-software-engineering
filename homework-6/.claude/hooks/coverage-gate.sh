#!/bin/sh

# Claude Code PreToolUse hook. The numeric 80% threshold will be enforced by
# the project's future test:coverage configuration. This hook blocks git push
# when that command fails, but remains inactive before the TypeScript project
# and its coverage script exist.

set -u

hook_input=$(cat)
tool_command=""

if command -v jq >/dev/null 2>&1; then
  tool_command=$(printf '%s' "$hook_input" | jq -r '.tool_input.command // ""')
elif command -v node >/dev/null 2>&1; then
  tool_command=$(printf '%s' "$hook_input" | node -e '
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => { input += chunk; });
    process.stdin.on("end", () => {
      try {
        const payload = JSON.parse(input);
        process.stdout.write(payload?.tool_input?.command ?? "");
      } catch {
        process.stdout.write("");
      }
    });
  ')
fi

# Run the gate whenever a Bash command contains a git invocation whose
# subcommand is push. Searching the complete command also covers forms such
# as `cd app && git push`, `git -C app push`, and command lists.
if ! printf '%s\n' "$tool_command" | grep -Eq 'git([[:space:]]+[^[:space:];&|()]+)*[[:space:]]+push([[:space:];&|()]|$)'; then
  exit 0
fi

project_dir=${CLAUDE_PROJECT_DIR:-$(pwd)}
package_json="$project_dir/package.json"

if [ ! -f "$package_json" ]; then
  echo "Coverage gate inactive: package.json has not been created yet." >&2
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Coverage gate blocked push: Node.js is required to inspect package.json." >&2
  exit 2
fi

if ! node -e '
  const packageJson = require(process.argv[1]);
  process.exit(packageJson.scripts?.["test:coverage"] ? 0 : 1);
' "$package_json"; then
  echo "Coverage gate inactive: npm script test:coverage is not configured yet." >&2
  exit 0
fi

echo "Coverage gate: running npm run test:coverage before git push..." >&2

if ! (cd "$project_dir" && npm run test:coverage); then
  echo "Coverage gate blocked push: tests or the configured coverage threshold failed." >&2
  exit 2
fi

echo "Coverage gate passed." >&2
exit 0
