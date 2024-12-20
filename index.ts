#!/usr/bin/env node
// this is called hashbank or shibank which tells the OS which interpreter to use in our case we specify node as the interpretor
// and location where the node is installed

const args = process.argv.slice(2);

// imports
import commands from "./commands";
import { readObject, writeObject } from "./commands/hashobject";

enum Command {
  Init = "init",
  Add = "add",
  Catfile = "cat-file",
  HashObject = "hash-object",
  Status = "status",
  Stash = "stash",
  Test = "test",
}

console.log(args);

// write in typescript

const command = args[0] as Command;

switch (command) {
  case Command.Init:
    commands[Command.Init]();
    break;
  case Command.Add:
    console.log("added");
    const filePaths: string[] = args.slice(1);
    commands[Command.Add](filePaths);
    break;
  case Command.Status:
    console.log("status");
    commands[Command.Status]();
    break;
  case Command.Catfile:
    console.log("cat-file");
    break;
  case Command.HashObject:
    console.log("hash-object");
    let data = args[1];
    let hash: string = commands[Command.HashObject](data);
    console.log(hash);
    break;
  case Command.Test:
    console.log("test");
    const content = args[1];
    const hashval = readObject("13635c30619663c4c1070e3c068778bb40ee8989");
    // writeObject(content);
    console.log(hashval);
    // console.log(readObject(hashval));
    break;
  default:
    console.error(`Unknown command: ${command}`);
    break;
}
