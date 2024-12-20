export interface DirItem {
  name: string;
  type: string;
}

// extend DirItem to include the file hash
export interface TreeDir extends DirItem {
  hash: string;
}

export type IndexItem = {
  hash: string;
  file: string;
  size: number;
  modified: number;
};

export type Entry = { mode: string; filePath: string; hash: string };

export type TreeItem = {
  header: string;
  entries: Entry[];
};
