import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import zlib from "zlib";

const GIT_DIR = path.resolve("./.git");

import { dataBuffer } from "../../utils";
import { Entry, IndexItem } from "../../utils/types";

export const treeFilesHandler = (
  indexFiles: IndexItem[],
  treeEntries: Entry[],
  entriesWithModifiedFiles: Buffer[]
): void => {
  for (const indexFile of indexFiles) {
    const treeEntry = treeEntries.find(
      (entry) => entry.filePath === indexFile.file && entry.mode === "100644"
    );
    if (!treeEntry) {
      // file is not present in the tree object
      entriesWithModifiedFiles.push(
        dataBuffer(indexFile.file, indexFile.hash, "100644")
      );
      // remove the file from treeEntries
    } else {
      if (treeEntry.hash !== indexFile.hash) {
        // file is present in the tree object but the hash is different
        entriesWithModifiedFiles.push(
          dataBuffer(indexFile.file, indexFile.hash, "100644")
        );
      }
      treeEntries = treeEntries.filter(
        (entry) => entry.filePath !== indexFile.file
      );
    }
  }

  //   return treeEntries;
};

// Function to create the tree object from the index file
export const createTreeObject = (entries: Buffer[]): Buffer => {
  // // Combine the entries into a single buffer
  const tree: Buffer = Buffer.concat(entries);
  // add the tree header
  const header = `tree ${tree.length}\0`;
  const headerBuffer = Buffer.from(header);
  return Buffer.concat([headerBuffer, tree]);
};

// Function to store the tree object in the .git/objects directory
export const storeTreeObject = (treeBuffer: Buffer): string => {
  // compute the hash of the tree
  const hash = crypto.createHash("sha1").update(treeBuffer).digest("hex");

  // write the tree object to the .git/objects directory
  const hashDir = hash.substring(0, 2);
  const hashFile = hash.substring(2);

  const compressedBuffer = zlib.deflateSync(treeBuffer);

  const dirPath = path.join(GIT_DIR, "objects", hashDir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, hashFile);
  fs.writeFileSync(filePath, compressedBuffer);

  return hash;
};
