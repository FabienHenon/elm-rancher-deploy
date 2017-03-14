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
  exec(cmd, {maxBuffer: 1024 * 1024}, puts(next, !!canFail));
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

function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}

function copyDockerfile(file, action) {
  if (fs.existsSync(file)) {
    console.log('Using existing file ' + file);
    action(() => null);
  } else {
    const source = path.resolve(__dirname, 'scripts/' + file);
    console.log('Copying ' + source + ' to ' + file);
    copyFile(source, file, (err) => {
      if (err) {
        console.warn('Error copying file from ' + source + ' to ' + file);
      } else {
        action(() => {
          // Remove file
          console.log('Removing file ' + file);
          fs.unlinkSync(file);
        });
      }
    });
  }
}

function bumpVersion(file, cb) {
  let json = JSON.parse(fs.readFileSync('elm-package.json', 'utf8'));
  const version = json['version'];

  const parts = version.split('.');

  if (parts.length < 3) {
    throw 'Invalid version number: ' + version;
  } else {
    const newVersion = `${parts[0]}.${parts[1]}.${parseInt(parts[2]) + 1}`;

    console.log(`Bumping from version ${version} to version ${newVersion}`);

    json['version'] = newVersion;

    fs.readFileSync('elm-package.json', JSON.stringify(json, null, 4), 'utf8');

    cb();
  }
}

function bump(args) {
  const suffix = args.length > 0 ? args[0] : '';

  bumpVersion('elm-package.json', (version) => {
    cmd('git add elm-package.json', () => {
      cmd(`git commit -m "Version ${version} ${suffix}"`, () => {
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

  copyDockerfile(file, (remove) => {
    cmd(`docker build -f ${file} -t ${image}:${tag} .`, remove);
  });
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

          copyDockerfile(file, (removeDockerFile) => {
            copyDockerfile('nginx-default.conf', (removeNGinxFile) => {
              cmd(`docker build -f ${file} -t ${image}:${tag} .`, () => {
                removeNGinxFile();
                removeDockerFile();
              });
            });
          });
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
    let options = {
      serviceId: process.env["RANCHER_SERVICE_ID"],
      imageName: null,
      imageTag: null,
      env: 'prod',
      rancherUrl: process.env["RANCHER_URL"],
      rancherAccessKey: process.env["RANCHER_ACCESS_KEY"],
      rancherSecretKey: process.env["RANCHER_SECRET_KEY"]
    };

    options = args.reduce((opts, arg) => {
      if (arg.indexOf("--url=") == 0) {
        return Object.assign({}, opts, {rancherUrl: arg.replace('--url=', '')});
      } else if (arg.indexOf("--access-key=") == 0) {
        return Object.assign({}, opts, {rancherAccessKey: arg.replace('--access-key=', '')});
      } else if (arg.indexOf("--secret-key=") == 0) {
        return Object.assign({}, opts, {rancherSecretKey: arg.replace('--secret-key=', '')});
      } else if (arg.indexOf("--service=") == 0) {
        return Object.assign({}, opts, {serviceId: arg.replace('--service=', '')});
      } else if (arg.indexOf("--image=") == 0) {
        return Object.assign({}, opts, {imageName: arg.replace('--image=', '')});
      } else if (arg.indexOf("--env=") == 0) {
        return Object.assign({}, opts, {env: arg.replace('--env=', '')});
      } else if (arg == 'latest') {
        return Object.assign({}, opts, {imageTag: 'latest'});
      } else {
        return opts;
      }
    }, options);

    getVersionTag(options.env && options.env == 'staging' ? 'staging-' : '', (versionTag) => {
      if (!options.imageTag) {
        options.imageTag = versionTag;
      } else {
        options.imageTag = options.env == 'staging' ? 'staging-latest' : 'latest';
      }

      if (!options.serviceId || !options.imageName || !options.imageTag || !options.rancherUrl ||
          !options.rancherAccessKey || !options.rancherSecretKey || !options.env) {
        console.log(options);
        throw "Missing parameters";
      }

      cmd(`docker run --rm -t \
        -e RANCHER_URL=${options.rancherUrl} \
        -e RANCHER_ACCESS_KEY=${options.rancherAccessKey} \
        -e RANCHER_SECRET_KEY=${options.rancherSecretKey} \
        etlweather/gaucho \
        upgrade ${options.serviceId} \
        --complete_previous=True \
        --imageUuid=docker:${options.imageName}:${options.imageTag} \
        --auto_complete=True`);
  });
}

module.exports = {
  bump,
  build,
  release,
  publish,
  deploy
};
