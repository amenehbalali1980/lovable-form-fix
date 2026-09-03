const FLAG_KEY = "py_needs_backup";
const LAST_KEY = "py_last_backup_at";

export function markNeedsBackup() {
  try {
    localStorage.setItem(FLAG_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearNeedsBackup() {
  try {
    localStorage.setItem(FLAG_KEY, "0");
    localStorage.setItem(LAST_KEY, new Date().toISOString());
  } catch {
    // ignore
  }
}

export function needsBackup(): boolean {
  try {
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function getLastBackupAt(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}