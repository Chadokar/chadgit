// write in typescript

import * as fs from "fs";

// create .git directory and subdirectories

const init = (): void => {
  // create .git directory
  fs.mkdirSync(".git");
  // create subdirectories
  fs.mkdirSync(".git/objects");
  fs.mkdirSync(".git/refs");
  fs.writeFileSync(".git/HEAD", "ref: refs/heads/master\n");
  console.log("Initialized git repository");
};

export default init;
