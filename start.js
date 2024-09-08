require('dotenv').config();
const { exec } = require('child_process');

exec('serverless offline', (err, stdout, stderr) => {
  if (err) {
    console.error(`Error: ${err}`);
    return;
  }
  console.log(stdout);
  console.error(stderr);
});