const methods = {
  "--stdin": function () {
    // take data from the user and return it
    let data = "";
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      return data;
    });
  },
};

export default methods;
