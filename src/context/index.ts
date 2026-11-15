import { createContext } from 'react';

export interface Folder {
  id: string;
  name: string;
}

export interface LoginUri {
  match: number | null;
  uri: string;
}

export interface Login {
  username?: string;
  password?: string;
  totp?: string;
  uris?: LoginUri[];
}

export interface CustomField {
  name?: string;
  value?: string;
}

export interface VaultItem {
  fields?: CustomField[];
  folderId?: string | null;
  login?: Login;
  name: string;
  notes?: string | null;
  type: number; // 1 = login
}

export interface VaultData {
  folders: Folder[];
  items: VaultItem[];
}

export interface FileInfo {
  name: string;
  size: number;
  lastModified?: number;
}

/** Which parts of an item are printed, e.g. { logos: true, password: false } */
export type DataToPrint = Record<string, boolean>;

/** The part of the context that is plain state (what `initialContext` resets to) */
export interface AppState {
  data: VaultData;
  dataToPrint: DataToPrint;
  error: string | null;
  file: FileInfo;
  foldersToPrint: string[];
}

export type SetContext = (newContext: Partial<AppState>, callback?: () => void) => void;

/** What components receive from the Provider */
export interface AppContext extends AppState {
  setContext: SetContext;
}

// Deliberately has no `setContext`, so resetting with `{ ...initialContext }`
// (see Header.resetState) never overwrites the real setContext.
export const initialContext: AppState = {
  data: {
    folders: [],
    items: []
  },
  dataToPrint: {
    logos: true,
    username: true,
    password: true,
    totp: true,
    uris: true,
    notes: true,
    fields: true,
    qrcodes: true
  },
  error: null,
  file: {
    name: '',
    size: 0
  },
  foldersToPrint: []
};

const Context = createContext<AppContext>({
  ...initialContext,
  setContext: () => {}
});

export default Context;
