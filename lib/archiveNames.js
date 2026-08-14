// This should be renamed normalizeDirName

export function normalizeArchiveDirectoryName(name) {
  return (name ?? 'youtube_archive')
    .replace(/\./g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'youtube_archive';
}
