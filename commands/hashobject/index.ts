// write in typescript

// create hash object function

import crypto from "crypto";
import * as fs from "fs";
import zlib from "zlib";
import * as path from "path";
import { TreeItem } from "../../utils/types";

const GIT_DIR = path.resolve("./.git");
const OBJECTS_DIR = path.join(GIT_DIR, "objects");

// create writeObject function to write the object to the objects directory and return the hash
export function writeObject(data: string): string {
  const content: string = data;
  console.log("content", content);
  const contentBuffer: Buffer = Buffer.from(content);
  //   const contentBuffer: Buffer = Buffer.from(content, "utf-8");
  const header: Buffer = Buffer.from(`blob ${contentBuffer.length}\0`);
  const storeBuffer: Buffer = Buffer.concat([
    // Buffer.from(header, "utf-8"),
    header,
    contentBuffer,
  ]);
  const hash: string = crypto
    .createHash("sha1")
    .update(storeBuffer)
    .digest("hex");

  const hashDir: string = hash.substring(0, 2);
  const hashFile: string = hash.substring(2);

  const compressedBuffer: Buffer = zlib.deflateSync(storeBuffer);

  const dirPath: string = path.join(OBJECTS_DIR, hashDir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath: string = path.join(dirPath, hashFile);
  fs.writeFileSync(filePath, compressedBuffer);

  return hash;
}

export const readObjectwithType = (hash: string): Buffer => {
  const hashDir = hash.substring(0, 2);
  const hashFile = hash.substring(2);
  // create the file path
  const filePath = path.join(OBJECTS_DIR, hashDir, hashFile);

  if (!fs.existsSync(filePath)) {
    console.log("fatal: Hash not found");
    process.exit(1);
  }

  // read the compressed buffer from the file
  const compressedBuffer: Buffer = fs.readFileSync(filePath);

  // decompress the buffer using zlib
  const decompressedBuffer: Buffer = zlib.unzipSync(compressedBuffer);
  return decompressedBuffer;
};

// read the object from the objects directory
export const readObject = (hash: string): string => {
  // get the decompressed buffer using the readObjectwithType function
  const decompressedBuffer: Buffer = readObjectwithType(hash);

  // find the index of the null byte
  const nullByteIndex = decompressedBuffer.indexOf(0);

  // get the blob content from the decompressed buffer and return it
  const blobContent: string = decompressedBuffer
    .slice(nullByteIndex + 1)
    .toString();

  return blobContent;
};

// Function to parse and display the tree object
export function parseTreeObject(treeBuffer: Buffer): TreeItem {
  const headerEnd = treeBuffer.indexOf(0); // Locate the end of the header
  const header = treeBuffer.slice(0, headerEnd).toString("utf8");
  // console.log("Tree Header:", header);

  const entries: { mode: string; filePath: string; hash: string }[] = [];

  let offset = headerEnd + 1; // Start after the header
  while (offset < treeBuffer.length) {
    // Find the next null byte marking the end of the entry
    const nextNull = treeBuffer.indexOf(0, offset);
    if (nextNull === -1) break; // If no null byte is found, stop parsing

    const entry = treeBuffer.slice(offset, nextNull).toString("utf8"); // Decode entry metadata
    const hash = treeBuffer.slice(nextNull + 1, nextNull + 21); // 20 bytes for SHA-1 hash
    // console.log(`Entry: ${entry}, Hash: ${hash.toString("hex")}`);
    entries.push({
      mode: entry.split(" ")[0],
      filePath: entry.split(" ")[1],
      hash: hash.toString("hex"),
    });

    offset = nextNull + 21; // Move to the next entry
  }
  return { header, entries };
}
