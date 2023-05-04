const prompt = require('prompt-sync')({sigint: true});
const { spawn } = require("child_process");
const os = require('os')
working_dir = os.homedir();

user_cmd = "";

function call() {
  user_cmd = prompt(working_dir + " >");

  const ls = spawn(user_cmd);

  ls.stdout.on("data", data => {
    console.log(`${data}`);
    ls.kill('SIGINT')
  });

  ls.stderr.on("data", data => {
    console.log(`${data}`);
  });

  ls.on('error', (error) => {
    console.log(`${error.message}`);
    ls.kill('SIGINT')
  });

  ls.on('exit', (error) => {
    call()
  });

}

const interval = setInterval(function () { }, 1000)
process.on('exit', () => {
  clearTimeout(interval)
})
call()  