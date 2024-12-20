import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import zlib from "zlib";
import {
  parseTreeObject,
  readObjectwithType,
  writeObject,
} from "../hashobject";
import { dataBuffer, getFiles } from "../../utils";
import { Entry, IndexItem, TreeItem } from "../../utils/types";
import { hashOfTree } from "./createCommit";
import IndexTree from "./object";
import { createTreeObject, storeTreeObject, treeFilesHandler } from "./utils";

const GIT_DIR = path.resolve("./.git");
const OBJECTS_DIR = path.join(GIT_DIR, "objects");
const ROOT_DIR = path.resolve("./");
const HEAD_FILE = path.join(GIT_DIR, "HEAD");

export const createTree = (directory: string = ROOT_DIR): string => {
  const entries: Buffer[] = [];

  // Read the directory and process each entry
  const items = fs.readdirSync(directory, { withFileTypes: true });
  for (const item of items) {
    const itemPath = path.join(directory, item.name);
    if (item.isFile()) {
      // Read the file contents
      const content = fs.readFileSync(itemPath, "utf-8");

      // Write the object to the objects directory
      const hash = writeObject(content);

      const mode = "100644"; // Regular file
      const entry = `${mode} ${item.name}\0${Buffer.from(hash, "hex")}`;
      entries.push(Buffer.from(entry, "binary"));
    } else if (item.isDirectory()) {
      // Recursively create the tree for the subdirectory
      const subtreeHash = createTree(itemPath);
      const mode = "40000"; // Directory
      const entry = `${mode} ${item.name}\0${Buffer.from(subtreeHash, "hex")}`;
      entries.push(Buffer.from(entry, "binary"));
    }
  }

  // Sort the entries by name
  // entries.sort((a, b) => a.compare(b));

  // Combine the entries into a single buffer
  const treeBuffer = Buffer.concat(entries);

  // add the tree header
  const header = Buffer.from(`tree ${treeBuffer.length}\0`);
  const storeBuffer = Buffer.concat([header, treeBuffer]);

  //   compute the hash of the tree
  const hash = crypto.createHash("sha1").update(storeBuffer).digest("hex");

  // write the tree object to the .git/objects directory
  const hashDir = hash.substring(0, 2);
  const hashFile = hash.substring(2);

  const compressedBuffer = zlib.deflateSync(storeBuffer);

  const dirPath = path.join(OBJECTS_DIR, hashDir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, hashFile);
  fs.writeFileSync(filePath, compressedBuffer);

  return hash;
};

// Function to create the tree object for the first commit
export const firstCommitTree = (dir: string, lines: string[]): string => {
  let entries: Buffer[] = [];
  // Inside index file we have : index += `${hash} ${file} ${fileSize} ${lastModified}\n`;
  for (let line of lines) {
    const [hash, file, size, modified] = line.split(" ");
    // check if the file is/was of this folder only like dir1/file.txt but not dir1/dir2/file.txt
    // split the file and join except the last element
    const filePath = file.split("/").slice(0, -1).join("/");
    if (filePath === dir) {
      const entry = dataBuffer(path.basename(file), hash, "100644");
      entries.push(entry);
      continue;
    }

    // We go for subdirectories as well and recursively call the function
    // here the file contains the path of the file like dir1/dir2/file.txt

    const subDir = file.split("/")[0];
    if (!subDir || subDir === dir || subDir === "" || subDir === ".") {
      continue;
    }
    const subLines = lines.filter((line) => line.startsWith(subDir));
    const subtreeHash = firstCommitTree(path.join(dir, subDir), subLines);
    const entry = dataBuffer(subDir, subtreeHash, "40000");
    entries.push(entry);
  }

  // Sort the entries by name
  // entries.sort((a, b) => a.compare(b));

  // Combine the entries into a single buffer
  const treeBuffer = Buffer.concat(entries);

  // add the tree header
  const header = Buffer.from(`tree ${treeBuffer.length}\0`);
  const storeBuffer = Buffer.concat([header, treeBuffer]);

  //   compute the hash of the tree
  const hash = crypto.createHash("sha1").update(storeBuffer).digest("hex");

  // write the tree object to the .git/objects directory
  const hashDir = hash.substring(0, 2);
  const hashFile = hash.substring(2);

  const compressedBuffer = zlib.deflateSync(storeBuffer);

  const dirPath = path.join(OBJECTS_DIR, hashDir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, hashFile);
  fs.writeFileSync(filePath, compressedBuffer);

  return hash;
};

const compareCommitTreeandIndex = (
  treeHash: string,
  treeOfIndex: IndexTree
): string => {
  const treedecompressedBuffer: Buffer = readObjectwithType(treeHash);
  const treeData: TreeItem = parseTreeObject(treedecompressedBuffer);
  let treeEntries: Entry[] = treeData.entries;

  const indexFiles: IndexItem[] = treeOfIndex.files;
  const indexDirs: IndexTree[] = treeOfIndex.dirs;

  // Check if the files in the index are present in the tree object and have the same hash
  let entriesWithModifiedFiles: Buffer[] = []; // this will contain the files and dirs which are modified and old files/dirs
  treeFilesHandler(indexFiles, treeEntries, entriesWithModifiedFiles); // this will modify the treeEntries and add the modified files to entriesWithModifiedFiles

  // Check if the directories in the index are present in the tree object
  for (const indexDir of indexDirs) {
    const treeDir = treeEntries.find(
      (entry) =>
        entry.filePath === indexDir.currentDir && entry.mode === "40000"
    );
    if (!treeDir) {
      // directory is not present in the tree object
      entriesWithModifiedFiles.push(
        dataBuffer(indexDir.currentDir, indexDir.createHash(indexDir), "40000")
      );
    } else {
      // directory is present in the tree object
      const subtreeHash = compareCommitTreeandIndex(treeDir.hash, indexDir);

      if (subtreeHash !== treeDir.hash) {
        entriesWithModifiedFiles.push(
          dataBuffer(indexDir.currentDir, subtreeHash, "40000")
        );
      }
      treeEntries = treeEntries.filter(
        (entry) => entry.filePath !== indexDir.currentDir
      );
    }
  }

  treeEntries.forEach((entry) => {
    entriesWithModifiedFiles.push(
      dataBuffer(entry.filePath, entry.hash, entry.mode)
    );
  });

  const treeBufferObject: Buffer = createTreeObject(entriesWithModifiedFiles);
  const treeHashObject: string = storeTreeObject(treeBufferObject);

  return treeHashObject;
};

// Function to create the tree object from the index file
export const createTreeFromIndex = (lastCommitHash: string): string => {
  const indexFile = path.join(GIT_DIR, "index");
  if (!fs.existsSync(indexFile) || !fs.readFileSync(indexFile)) {
    console.log("Index file does not exist");
    process.exit(1);
  }
  const treeHash: string = hashOfTree(lastCommitHash);

  // Inside index file we have : index += `${hash} ${file} ${fileSize} ${lastModified}\n`;
  const lines: IndexItem[] = fs
    .readFileSync(indexFile, "utf-8")
    .split("\n")
    .map((line) => {
      const [hash, file, size, modified] = line.split(" ");
      return {
        hash,
        file,
        size: parseInt(size),
        modified: parseFloat(modified),
      };
    });
  const treeOfIndex: IndexTree = new IndexTree(lines, "");
  const treeHashObject: string = compareCommitTreeandIndex(
    treeHash,
    treeOfIndex
  );

  return treeHashObject;
};
