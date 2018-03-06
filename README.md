# siggame/colisee-builder

REST Service that builds client code into Docker Images which are then pushed to a Docker Registry.

[![Travis](https://img.shields.io/travis/siggame/colisee-builder.svg?style=flat-square)](https://travis-ci.org/siggame/colisee-builder)
[![Docker Pulls](https://img.shields.io/docker/pulls/siggame/colisee-builder.svg?style=flat-square)](https://hub.docker.com/r/siggame/colisee-builder)
[![GitHub tag](https://img.shields.io/github/tag/siggame/colisee-builder.svg?style=flat-square)](https://github.com/siggame/colisee-builder/tags)
[![dependencies Status](https://david-dm.org/siggame/colisee-builder/status.svg)](https://david-dm.org/siggame/colisee-builder)
[![devDependencies Status](https://david-dm.org/siggame/colisee-builder/dev-status.svg)](https://david-dm.org/siggame/colisee-builder?type=dev)

## Table Of Contents

- [Description](#description)
- [Getting Started](#getting-started)

- [Usage](#usage)
  - [REST API](#rest-api)
    - [Interfaces](#interfaces)
    - [API](#api)

- [Contributors](#contributors)
- [Change Log](#change-log)
- [License](#license)
- [Contributing](#contributing)

## Description

The purpose of this application is to provide a service to the ACM SIG-Game Web team to build competitor code.
A competitor will log into the Web team's general user interface and upload a new zip file to submit to the
tournament. The Web team will request this service to add this zip file to the queue. The builder will give
back a unique ID of the build and the web team will occasionally ping the service to check if the build has
finished. When the build has finished, the Web team will retrieve the build output.

The builder is designed to connect to an image build system and image repository. The image build system which
the builder relies on currently is Docker. The image repository needs to be compatible with the Docker daemon
and also should support queries to verify that the image was successfully pushed to that repository.

## Getting Started

Using docker.

```bash
docker pull siggame/colisee-builder
```

Using npm.

```bash
npm run setup && npm run start:prod
```

## Usage

### REST API

#### Interfaces

The following interfaces & types are defined and referenced below in the API endpoints.

```typescript
type BuildStatusType = "queued" | "building" | "failed" | "succeeded";

interface IBuildSubmission {
    id: string;
    status: BuildStatusType;
    startedTime: DateTime;
    finishedTime: DateTime | null;
}

// https://www.npmjs.com/package/http-errors
interface HttpError {
    status: number;
    statusCode: string;
    message: string;
}
```

#### API

-----------------------------------------

#### `GET /status`

Retrieve the status of all builds. The following filter parameters are acceptable.

```typescript
interface FilterParams {
    // Filter by any of the provided team ids
    ids: numbers[];
}
```

##### 200 - Retrieved build status

```plain
IBuildSubmission[];
```

##### 400 - Bad Request

```plain
HttpError
```

-----------------------------------------

#### `GET /status/:team_id`

Retrieve the built version of the code as a saved docker image. The built must have status `succeeded`. Otherwise, endpoint will return a 403 - Forbidden.

##### 200 - Retrieved log

```plain
IBuildSubmission;
```

##### 404 - Not Found; 400 - Bad Request

```plain
HttpError;
```

-----------------------------------------

#### `POST /submit/:team_id`

Push a new build into a team's build queue. The **body** of the request must contain the **[.tar, .tgz, .zip] file** that is to be built. The **body** should contain a field named **submission** that is the archive.

##### Body

```plain
multipart/form-data

submission: File
```

##### 201 - Enqueued Build

```json
{
    submission: {
        id: number;
    }
}
```

##### 400 - Bad Request

```plain
HttpError;
```

## Contributors

- [Russley Shaw](https://github.com/russleyshaw)
- [user404d](https://github.com/user404d)
- [Matthew Qualls](https://github.com/MatthewQualls)

## Change Log

View our [CHANGELOG.md](https://github.com/siggame/colisee-builder/blob/master/CHANGELOG.md)

## License

View our [LICENSE](https://github.com/siggame/colisee/blob/master/LICENSE)

## Contributing

View our [CONTRIBUTING.md](https://github.com/siggame/colisee/blob/master/CONTRIBUTING.md)
