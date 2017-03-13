'use strict';

const {exec} = require('child_process');
const fs = require('fs');
const path = require('path');

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
  if (args.length == 0) {
    throw 'Image name is needed (without tag)'
  }

  const image = args[0];
  const tag = args.length > 1 && args[1] == 'staging' ? 'staging-build' : 'build';

  const dockerFile = path.resolve(__dirname, 'scripts/Dockerfile.staging.build');

  cmd(`docker build -f ${dockerFile} -t ${image}:${tag} .`);
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
