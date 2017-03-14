# Elm Rancher deployment

This package is used to deploy elm application built with [create-elm-app](https://www.npmjs.com/package/create-elm-app) in [Rancher](http://rancher.com/)

## Installation

```
$ npm install elm-rancher-deploy --save-dev
```

This module needs to be in the project and not installed globally because it uses Dockerfiles and they must be inside the project to work.

## Commands

### Bump version

```
$ deploy-elm bump [<commitSuffix>]
```

bumps elm version, create a new commit (with <commitSuffix> or empty string), create tag for version and finally pushes that commit and tags

### Build Elm App

```
$ deploy-elm build <imgName> [<env>]
```

builds the Elm application in the given env (staging or prod (default)). This creates a new docker image that contains built source code

### Create a release

```
$ deploy-elm release <imgName> [<env>]
```

creates a docker release image for the given env (staging or prod (default))

### Publish release

```
$ deploy-elm publish <imgName> [<env>]
```

tags and pushes the release image. One image has a tag with the current version, and another image has the latest tag. If staging env is specified, then tags are prefixed by "staging-"

### Deploy to Rancher

```
$ deploy-elm deploy [--url=<rancher_url>] [--access-key=<access_key>] [--secret-key=<secret_key>] [--service=<service_id>] [--env=<env>] --image=<imageName> [latest]
```

deploys the specified image and tag (default is version tag with eventually staging- as prefix) to rancher, given rancher url, credentials and service id.
Rancher information can be ommited if the following envrionment variables are set:

  * `RANCHER_SERVICE_ID`: ID of the Rancher service to upgrade for staging deployment
  * `RANCHER_ACCESS_KEY`: Access key for Rancher API
  * `RANCHER_SECRET_KEY`: Secret key for Rancher API
  * `RANCHER_URL`: Rancher API Url

## Customization

You can cusyomize the Dockerfiles by copying them from the `scrpts` directory directly to your application directory. **Copy the entire `scripts` directory content because you will neeed all files in it**
