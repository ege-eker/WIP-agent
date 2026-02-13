import React from 'react';
import { FolderOpen } from 'lucide-react';
import { openFolder } from '../services/api.service';

/**
 * Regex to detect file/folder paths in text.
 * Matches patterns like:
 *   - Relative: Hukuk/sözleşme.pdf, Belgeler/rapor.docx, ./foo/bar.txt
 *   - Absolute: C:\Users\foo\bar.pdf, D:/documents/file.doc
 *   - With spaces: Engineering/İşkur Gazete İlanı.doc
 * Supports backslashes, any Unicode letters/marks (handles NFC & NFD), parentheses, and spaces.
 *
 * Key design: spaces are NOT in the base char class (prevents bleeding into surrounding text).
 * Instead, spaces are allowed only BETWEEN char-groups within a segment: CHAR+(\s+CHAR+)*
 * For bare relative paths (no drive letter, no ./ prefix), the FIRST directory segment
 * does NOT allow spaces — this prevents "random words DirName/file.ext" bleeding.
 * File extension is mandatory so the match ends cleanly at .ext boundary.
 */

// Base chars: any letter, digit, combining mark, hyphen, underscore, parentheses (NO dot, NO space)
// Uses Unicode property escapes (\p{L}, \p{N}, \p{M}) to handle ALL Unicode scripts and NFC/NFD forms
const C = '[\\p{L}\\p{N}\\p{M}\\-_()]';
// Directory segment: C + dots allowed, spaces allowed between char-groups (e.g. "ARAÇ TAKİBİ")
const DIR_SEG = `(?:${C}|\\.)+(?:\\s+(?:${C}|\\.)+)*`;
// Strict dir segment: NO spaces (used as first segment of bare relative paths to prevent bleeding)
const DIR_SEG_STRICT = `(?:${C}|\\.)+`;
// Filename segment: dots allowed, spaces allowed between char-groups
const FILE_SEG = `(?:${C}|\\.)+(?:\\s+(?:${C}|\\.)+)*`;

const PATH_REGEX = new RegExp(
  `(?:` +
    `[A-Za-z]:[\\\\/](?:${DIR_SEG}[\\\\/])*` +            // absolute: drive letter anchors, spaces OK everywhere
  `|` +
    `\\.{0,2}[\\\\/](?:${DIR_SEG}[\\\\/])*` +             // ./ or ../ anchors, spaces OK everywhere
  `|` +
    `${DIR_SEG_STRICT}[\\\\/](?:${DIR_SEG}[\\\\/])*` +    // bare relative: first seg strict (no spaces), rest OK
  `)` +
  `${FILE_SEG}\\.\\w{1,10}`,                              // filename.ext (extension required)
  'gu'
);

function handlePathClick(filePath: string) {
  openFolder(filePath).catch((err) => {
    console.error('Failed to open folder:', err);
  });
}

export function PathLink({ path }: { path: string }) {
  return (
    <span
      role="button"
      tabIndex={0}
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline cursor-pointer hover:bg-blue-50 rounded px-0.5"
      onClick={(e) => {
        e.stopPropagation();
        handlePathClick(path);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePathClick(path);
        }
      }}
      title={`Open in Explorer: ${path}`}
    >
      <FolderOpen className="w-3 h-3 inline-block flex-shrink-0" />
      {path}
    </span>
  );
}

export function linkifyPaths(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Reset regex state
  PATH_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PATH_REGEX.exec(text)) !== null) {
    const matchedPath = match[0];

    // Must contain at least one slash or backslash to be a path
    if (!matchedPath.includes('/') && !matchedPath.includes('\\')) continue;

    // Push text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push(<PathLink key={`path-${match.index}`} path={matchedPath} />);
    lastIndex = match.index + matchedPath.length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
