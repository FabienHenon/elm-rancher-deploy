#!/usr/bin/env node
var app = require('../index.js');

const params = process.argv.slice(2);

if (params.length == 0) {
  usage();
} else {
  const action = params[0];
  const args = params.slice(1);

  if (['bump', 'build', 'release', 'publish', 'deploy'].indexOf(action) > -1) {
    app[action](args);
  } else {
    usage();
  }
}

function usage() {
  console.log(`
    Usage:

    $ deploy-elm bump [<commitSuffix>]

    bumps elm version, create a new commit (with <commitSuffix> or empty string), create tag for version and finally pushes that commit and tags

    $ deploy-elm build <imgName> [<env>]

    builds the Elm application in the given env (staging or prod (default)). This creates a new docker image that contains built source code

    $ deploy-elm release <imgName> [<env>]

    creates a docker release image for the given env (staging or prod (default))

    $ deploy-elm publish <imgName> [<env>]

    tags and pushes the release image. One image has a tag with the current version, and another image has the latest tag. If staging env is specified, then tags are prefixed by "staging-"

    $ deploy-elm deploy [--url=<rancher_url>] [--access-key=<access_key>] [--secret-key=<secret_key>] [--service=<service_id>] [--env=<env>] <imageName> [latest]

    deploys the specified image and tag (default is version tag with eventually staging- as prefix) to rancher, given rancher url, credentials and service id.
    Rancher information can be ommited if the following envrionment variables are set:

    * RANCHER_SERVICE_ID: ID of the Rancher service to upgrade for staging deployment
    * RANCHER_ACCESS_KEY: Access key for Rancher API
    * RANCHER_SECRET_KEY: Secret key for Rancher API
    * RANCHER_URL: Rancher API Url
  `);
}
