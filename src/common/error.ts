import { Position } from "./ast";

export function createErrorContext(source: string, position: Position, contextLines: number = 5) {
  const { line, column } = position;
  const lines = source.split('\n').map((line, i) => `${i + 1}\t${line}`);
  lines[line - 1] += `\n\t${' '.repeat(column)}^`
  const start = Math.max(line - 1 - contextLines, 0);
  const end = Math.min(line + contextLines, lines.length);

  return lines.slice(start, end).join('\n');
}