'use strict';

const {exec} = require('child_process');
const fs = require('fs');
const path = require('path');

function puts(next, canFail) {
  return (error, stdout, stderr) => {
    console.log(stdout);

    if (error && !canFail) {
      throw error;
    } else {
      next && next();
    }
  }
}

function cmd(cmd, next, canFail) {
  console.log(cmd);
  exec(cmd, puts(next, !!canFail));
}

function getVersionTag(prefix, next) {
  const json = JSON.parse(fs.readFileSync('elm-package.json', 'utf8'));
  const version = json['version'];

  exec('git rev-parse HEAD', (error, stdout, stderr) => {
    const sha = stdout.slice(0, 10);

    exec('git rev-list --count HEAD', (error, stdout, stderr) => {
      const count = stdout.trim();

      next(`${prefix}${version}.${count}-${sha}`);
    });
  });
}

function bump(args) {
  const suffix = args.length > 0 ? args[0] : '';

  cmd('elm package bump', () => {
    cmd('git add elm-package.json', () => {
      const json = JSON.parse(fs.readFileSync('elm-package.json', 'utf8'));

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

  const file = args.length > 1 && args[1] == 'staging' ? 'Dockerfile.staging.build' : 'Dockerfile.build';
  const dockerFile = path.resolve(__dirname, 'scripts/' + file);

  cmd(`docker build -f ${dockerFile} -t ${image}:${tag} .`);
}

function release(args) {
  if (args.length == 0) {
    throw 'Image name is needed (without tag)'
  }

  const image = args[0];
  const tag = args.length > 1 && args[1] == 'staging' ? 'staging-release' : 'release';
  const tagBuild = args.length > 1 && args[1] == 'staging' ? 'staging-build' : 'build';

  const cid = `elm_deploy_${Math.random()}`

  cmd(`docker rm -f ${cid}`, () => {
    cmd(`docker create --name ${cid} ${image}:${tagBuild}`, () => {
      cmd(`docker cp ${cid}:/opt/app/dist dist`, () => {
        cmd(`docker rm -f ${cid}`, () => {
          const file = args.length > 1 && args[1] == 'staging' ? 'Dockerfile.staging.release' : 'Dockerfile.release';
          const dockerFile = path.resolve(__dirname, 'scripts/' + file);

          cmd(`docker build -f ${dockerFile} -t ${image}:${tag} .`);
        }, true);
      });
    });
  }, true);
}

function publish(args) {
  if (args.length == 0) {
    throw 'Image name is needed (without tag)'
  }

  const image = args[0];
  const tag = args.length > 1 && args[1] == 'staging' ? 'staging-release' : 'release';
  const tagLatest = args.length > 1 && args[1] == 'staging' ? 'staging-latest' : 'latest';

  getVersionTag(args.length > 1 && args[1] == 'staging' ? 'staging-' : '', (versionTag) => {
    cmd(`docker tag ${image}:${tag} ${image}:${versionTag}`, () => {
      cmd(`docker push ${image}:${versionTag}`, () => {
        cmd(`docker tag ${image}:${tag} ${image}:${tagLatest}`, () => {
          cmd(`docker push ${image}:${tagLatest}`, () => {
            console.log(`Docker images ${image}:${versionTag} and ${image}:${tagLatest} have been successfully created and pushed`);
          });
        });
      });
    });
  });
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
