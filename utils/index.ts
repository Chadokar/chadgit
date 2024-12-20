// write in typescript
import * as fs from "fs";
import path from "path";
import { DirItem } from "./types";

// get files inside the directory only
export const getFiles = (dir: string) => {
  const files: DirItem[] = fs
    .readdirSync(dir, { withFileTypes: true })
    .map((file, index) => {
      if (file.isFile()) {
        return { name: file.name, type: "file" };
      } else {
        return { name: file.name, type: "dir" };
      }
    })
    .filter(
      (file) =>
        file.name !== ".DS_Store" &&
        file.name !== "package-lock.json" &&
        file.name !== "node_modules" &&
        file.name !== ".git"
    );

  return files;
};

// walkSync function to get List of all files and files inside subdirectories
export const walkSync = (dir: string): string[] => {
  const allFiles: string[] = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });

  files.forEach((file) => {
    if (
      file.isDirectory() &&
      file.name !== "node_modules" &&
      file.name !== ".git"
    ) {
      allFiles.push(...walkSync(`${dir}/${file.name}`));
    }
    if (
      file.isFile() &&
      file.name !== ".DS_Store" &&
      file.name !== "package-lock.json"
    ) {
      allFiles.push(`${dir}/${file.name}`);
    }
  });

  return allFiles;
};

// List of all files in the project excluding node_modules and .git with their relative paths from the root directory.
// Returns an array of strings. Each string has content : "<relative-path>/<file-name>"
export const allFiles = (): string[] => {
  const allFiles: string[] = [];

  allFiles.push(...walkSync("."));
  // remove the root directory from the path
  allFiles.map((file, index) => {
    allFiles[index] = file.substring(2);
  });

  return allFiles;
};

export const dataBuffer = (file: string, hash: string, mode: string) => {
  const entryMeta = `${mode} ${file}\0`;
  const entry = Buffer.concat([
    Buffer.from(entryMeta, "binary"),
    Buffer.from(hash, "hex"),
  ]);
  return entry;
};
