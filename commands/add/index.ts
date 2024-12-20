import * as fs from "fs";
import * as path from "path";
import { writeObject } from "../hashobject";
import { allFiles } from "../../utils";

// const data = import('../../')

const GIT_DIR = path.resolve("./.git");
const INDEX_FILE = path.join(GIT_DIR, "index");

// Function to add files to the staging area
export function add(files: string[]): void {
  // Read the index file
  //   if (files[0] === "." || files[0] === "-A" || files[0] === "./") {
  //     files = fs.readdirSync(".").filter((file) => file !== ".git");
  //   }
  let index: string = "";
  if (fs.existsSync(INDEX_FILE)) {
    index = fs.readFileSync(INDEX_FILE, "utf-8");
  }

  // Iterate over the files
  for (const file of files) {
    // Read the file contents
    const content = fs.readFileSync(file, "utf-8");

    // Write the object to the objects directory
    const hash: string = writeObject(content);

    // check if the file is already in the index
    const fileIndex = index
      .split("\n")
      .find((line) => line.split(" ")[1] === file);
    // compare the hash of the file with the hash in the index. If the hash are same then skip the file
    if (fileIndex) {
      const hashInIndex = fileIndex.split(" ")[0];
      if (hashInIndex === hash) {
        console.log(
          `File : ", ${file}, " \n already in the staging area with the object : ", ${hash}`
        );
        continue;
      }
    }

    // Get file metadata (size and modification time)
    const stats = fs.statSync(file);
    const fileSize = stats.size;
    const lastModified = stats.mtimeMs;
    const isFile = stats.isFile();

    // Add the file metadata (hash, size, last modified) to the index
    index += `${hash} ${file} ${fileSize} ${lastModified}\n`;
  }

  // Write the updated index to the index file
  fs.writeFileSync(INDEX_FILE, index);
}

// Function to compare modified files with the index
export function status(): void {
  // Read the index file
  let index: string = "";
  if (fs.existsSync(INDEX_FILE)) {
    index = fs.readFileSync(INDEX_FILE, "utf-8");
  }

  // Get the list of files from the index and map them to an object
  const indexFiles = index
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const [hash, file, size, modified] = line.split(" ");
      return {
        hash,
        file,
        size: parseInt(size),
        modified: parseFloat(modified),
      };
    });

  // Get the list of files in the working directory (excluding .git directory)
  const workingDirFiles = allFiles(); // Returns an array of strings. Each string has content : "<relative-path>/<file-name>"

  let fileToBeCommitted = [];
  let newFiles = [];
  let modifiedFiles = [];
  // Iterate over the files in the working directory
  for (const file of workingDirFiles) {
    const stats = fs.statSync(file);
    const fileSize = stats.size;
    const lastModified = stats.mtimeMs;

    // Find if the file is in the index
    const indexFile = indexFiles.find((entry) => entry.file === file);

    if (indexFile) {
      // Check if the file's hash or metadata (size/last modified time) has changed
      if (indexFile.size !== fileSize || indexFile.modified !== lastModified) {
        modifiedFiles.push(file);
      } else {
        fileToBeCommitted.push(file);
      }
    } else {
      newFiles.push(file);
    }
  }
  if (newFiles.length > 0) {
    console.log("New files:");
    newFiles.forEach((file) => {
      // red color
      console.log("\t", `\x1b[31m${file}\x1b[0m`);
    });
  }
  if (modifiedFiles.length > 0) {
    console.log("Modified files:");
    modifiedFiles.forEach((file) => {
      // console.log in yellow color
      console.log("\t", `\x1b[33m${file}\x1b[0m`);
    });
  }
  if (fileToBeCommitted.length > 0) {
    console.log("Files to be committed:");
    fileToBeCommitted.forEach((file) => {
      // console.log in green color
      console.log("\t", `\x1b[32m${file}\x1b[0m`);
    });
  }
}
