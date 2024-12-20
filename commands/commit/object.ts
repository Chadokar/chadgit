import crypto from "crypto";
import path from "path";
import { IndexItem } from "../../utils/types";
import { dataBuffer } from "../../utils";
import { createTreeObject, storeTreeObject } from "./utils";

class IndexTree {
  files: IndexItem[];
  dirs: IndexTree[];
  currentDir: string;
  constructor(parameters: IndexItem[], currentDir: string) {
    this.files = [];
    this.dirs = [];
    this.currentDir = currentDir;
    parameters.forEach((item) => {
      const dir = item.file.split("/");
      if (dir.length === 1) {
        this.files.push(item);
      } else {
        this.handleDir(dir, item, parameters);
      }
    });
  }

  handleDir(dir: string[], item: IndexItem, parameters: IndexItem[]): void {
    const dirName = dir[0];
    const dirIndex = this.dirs.findIndex((dir) => dir.currentDir === dirName);
    if (dirIndex === -1) {
      this.dirs.push(
        new IndexTree(
          parameters
            .filter((item) => item.file.startsWith(dirName + "/"))
            .map((item) => {
              const file = item.file.split("/").slice(1).join("/");
              return { ...item, file };
            }),
          dirName
        )
      );
    }
  }

  createHash(directory: IndexTree = this): string {
    let entries: Buffer[] = [];
    directory.files.forEach((file) => {
      const entry = dataBuffer(file.file, file.hash, "100644");
      entries.push(entry);
    });

    directory.dirs.forEach((dir) => {
      const entry = dataBuffer(dir.currentDir, dir.createHash(dir), "40000");
      entries.push(entry);
    });
    const treeBuffer: Buffer = createTreeObject(entries);
    const hash: string = storeTreeObject(treeBuffer);
    return hash;
  }
}

export default IndexTree;
