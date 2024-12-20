// write in typescript
import * as fs from "fs";

// create the branch and checkout the branch in the same function also add the branch name in the .git/HEAD file
export function createBranch(branchName: string): void {
  fs.writeFileSync(".git/refs/heads/" + branchName, "");
  fs.writeFileSync(".git/HEAD", `ref: refs/heads/${branchName}\n`);
  console.log(`Switched to a new branch ${branchName}`);
}

// read the branch name from the .git/HEAD file
export function getCurrentBranch(): string {
  return fs.readFileSync(".git/HEAD", "utf-8").split("/").slice(-1)[0].trim();
}

// read the content of the branch file
export function getBranchContent(branchName: string): string {
  return fs.readFileSync(".git/refs/heads/" + branchName, "utf-8");
}

// save the commit hash in the branch file
export function saveCommit(branchName: string, commitHash: string): void {
  let branchContent: string = getBranchContent(branchName);
  branchContent += `${commitHash}\n`;
  fs.writeFileSync(".git/refs/heads/" + branchName, branchContent);
}

// return the hash of the last commit in the branch
export function getLastCommitHash(branchName: string): string {
  let branchContent: string = getBranchContent(branchName);
  return branchContent.split("\n").slice(-2)[0];
}

// switch the branch by updating the .git/HEAD file
export function switchBranch(branchName: string): void {
  fs.writeFileSync(".git/HEAD", `ref: refs/heads/${branchName}\n`);
  console.log(`Switched to branch ${branchName}`);
}
