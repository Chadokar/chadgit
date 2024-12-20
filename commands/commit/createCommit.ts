// create the commit and save the commit hash in the branch file

import * as fs from "fs";
import { createTreeFromIndex, firstCommitTree } from "./createTree";
import { getCurrentBranch, getLastCommitHash, saveCommit } from "../branch";
import * as crypto from "crypto";
import * as path from "path";
import * as zlib from "zlib";
import { readObject } from "../hashobject";

const GIT_DIR = path.resolve("./.git");

/*
tree <tree_hash>
parent <parent_commit_hash> (optional)
author <name> <email> <timestamp> <timezone>
committer <name> <email> <timestamp> <timezone>

<commit_message>

*/

export const createCommit = (
  message: string,
  authorName: string,
  authorEmail: string
): void => {
  // check if there is any branch or not
  if (!fs.existsSync(".git/refs/heads")) {
    console.log(
      "fatal: not a git repository (or any of the parent directories): .git"
    );
    process.exit(1);
  }
  // check if the branch is linked with the HEAD or not
  if (!fs.existsSync(".git/HEAD")) {
    console.log("fatal: ref HEAD is not a symbolic ref");
    process.exit(1);
  }
  const timestamp: number = new Date().getTime();
  const timezone: number = new Date().getTimezoneOffset();
  let treeHash: string;
  const currentBranch: string = getCurrentBranch();
  const parentHash: string = getLastCommitHash(currentBranch);

  if (parentHash) {
    treeHash = createTreeFromIndex(parentHash);
  } else {
    const indexFile = path.join(GIT_DIR, "index");
    if (!fs.existsSync(indexFile) || !fs.readFileSync(indexFile)) {
      console.log("Index file does not exist");
      process.exit(1);
    }
    const lines = fs.readFileSync(indexFile, "utf-8").split("\n");
    treeHash = firstCommitTree(".", lines);
  }

  let commitContent = `tree ${treeHash}\n`;
  if (parentHash) {
    commitContent += `parent ${parentHash}\n`;
  }
  //   use Buffer.from to convert the string to a buffer
  commitContent += `author ${authorName} <${authorEmail}> ${timestamp} ${timezone}\n`;
  commitContent += `committer ${authorName} <${authorEmail}> ${timestamp} ${timezone}\n\n`;
  commitContent += `${message}\n`;

  const commitBuffer = Buffer.from(commitContent, "utf-8");
  const hash = crypto.createHash("sha1").update(commitBuffer).digest("hex");
  const hashDir = hash.substring(0, 2);
  const hashFile = hash.substring(2);

  const compressedBuffer: Buffer = zlib.deflateSync(commitBuffer);

  const dirPath = path.join(GIT_DIR, "objects", hashDir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, hashFile);
  fs.writeFileSync(filePath, compressedBuffer);

  saveCommit(currentBranch, hash);
  console.log(`[${currentBranch} ${hash}] ${message}`);
};

// // Read the info using last commit hash from the branch file
// export const commitInfo = (commitHash: string): string => {
//   const hashDir = commitHash.substring(0, 2);
//   const hashFile = commitHash.substring(2);
//   const filePath = path.join(GIT_DIR, "objects", hashDir, hashFile);

//   if (!fs.existsSync(filePath)) {
//     console.log("fatal: Hash not found");
//     process.exit(1);
//   }

//   const compressedBuffer: Buffer = fs.readFileSync(filePath);

//   const decompressedBuffer: Buffer = zlib.unzipSync(compressedBuffer);
//   const nullByteIndex = decompressedBuffer.indexOf(0);
//   return decompressedBuffer.slice(nullByteIndex + 1).toString();
// };

// hashTree of the given commit hash
export const hashOfTree = (commitHash: string): string => {
  const content: string = readObject(commitHash);
  const lines: string[] = content.split("\n");
  const treeLine = lines.find((line) => line.startsWith("tree"));
  if (!treeLine) {
    throw new Error("Tree information not found in commit data.");
  }
  return treeLine.split(" ")[1];
};
