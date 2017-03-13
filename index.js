'use strict';

const {exec} = require('child_process');
const fs = require('fs');

function puts(next) {
  return (error, stdout, stderr) => {
    console.log(stdout);

    if (error) {
      throw error;
    } else {
      next && next();
    }
  }
}

function cmd(cmd, next) {
  console.log(cmd);
  exec(cmd, puts(next));
}

function bump(args) {
  const suffix = args.length > 0 ? args[0] : '';

  cmd('elm package bump', () => {
    cmd('git add elm-package.json', () => {
      var json = JSON.parse(fs.readFileSync('elm-package.json', 'utf8'));

      cmd(`git commit -m "Version ${json["version"]} ${suffix}"`, () => {
        cmd('git push', () => {
          cmd(`git tag ${version}`, () => {
            cmd('git push --tags');
          });
        });
      });
    });
  });
}

function build(args) {

}

function release(args) {

}

function publish(args) {

}

function deploy(args) {

}

module.exports = {
  bump,
  build,
  release,
  publish,
  deploy
};
