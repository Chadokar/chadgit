// write in typescript
// here I am defining the object key string and value function

import { writeObject } from "./commands/hashobject";
import { add, status } from "./commands/add";

const commands: { [key: string]: Function } = {
  init: require("./commands/init").default,
  "hash-object": writeObject,
  add: add,
  status: status,
};

export default commands;
