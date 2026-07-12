export const VISIT_COMPLETION_SESSION_KEY = "memorip:visit-completion-context";
export const VISIT_PRESET_CHILDREN_SESSION_KEY = "memorip:visit-preset-children";
export const VISIT_EDIT_SESSION_KEY = "memorip:visit-edit-context";

export type VisitCompletionSession = {
  visitId: string;
  entryMethod: "standard" | "photo_publish";
  returnFacility?: string;
  batchIds?: string[];
};

export type VisitEditSession = {
  visitId: string;
  batchIds?: string[];
};

function writeSession(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is an enhancement. The destination page handles missing context.
  }
}

function readSession<T>(key: string): T | null {
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export function storeVisitCompletion(context: VisitCompletionSession): void {
  writeSession(VISIT_COMPLETION_SESSION_KEY, context);
}

export function readVisitCompletion(): VisitCompletionSession | null {
  return readSession<VisitCompletionSession>(VISIT_COMPLETION_SESSION_KEY);
}

export function storeVisitPresetChildren(childIds: string[]): void {
  writeSession(VISIT_PRESET_CHILDREN_SESSION_KEY, childIds);
}

export function takeVisitPresetChildren(): string[] | null {
  const value = readSession<unknown>(VISIT_PRESET_CHILDREN_SESSION_KEY);
  try {
    window.sessionStorage.removeItem(VISIT_PRESET_CHILDREN_SESSION_KEY);
  } catch {
    // Ignore unavailable storage.
  }
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;
}

export function storeVisitEdit(context: VisitEditSession): void {
  writeSession(VISIT_EDIT_SESSION_KEY, context);
}

export function readVisitEdit(): VisitEditSession | null {
  return readSession<VisitEditSession>(VISIT_EDIT_SESSION_KEY);
}
