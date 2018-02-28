# siggame/colisee-builder

REST Service that builds client code into Docker Images which are then pushed to a Docker Registry.

[![Travis](https://img.shields.io/travis/siggame/colisee-builder.svg?style=flat-square)](https://travis-ci.org/siggame/colisee-builder)
[![David](https://img.shields.io/david/siggame/colisee-builder.svg?style=flat-square)](\ )
[![Docker Pulls](https://img.shields.io/docker/pulls/siggame/colisee-builder.svg?style=flat-square)](https://hub.docker.com/r/siggame/colisee-builder/)
[![GitHub release](https://img.shields.io/github/release/siggame/colisee-builder.svg?style=flat-square)](https://github.com/siggame/colisee-builder/releases)

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

The purpose of this application is to provide a service to the ACM SIG-Game Web team to build competitor code. A competitor will log into the Web team's general user interface and upload a new zip file to submit to the tournament. The Web team will request this service to add this zip file to the queue. The builder will give back a unique ID of the build and the web team will occasionally ping the service to check if the build has finished. When the build has finished, the Web team will retrieve the gamelog as well as the built Docker Image from the service in a reasonable amount of time[1].

> [1] Given that the competition is 24 hours, and that a competitor will expect the build to be running in a live environment ASAP, we can assume a reasonable amount time is defined as 5 minutes. At any point in time beyond 5 minutes, the builder service cannot guarantee that the requested data was preserved. Ideally the Web Server will retrieve the data within **5 seconds** of the build being completed.

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

##### 200 - Enqueued Build

```plain
```

##### 400 - Bad Request

```plain
HttpError;
```

## Contributors

- [Russley Shaw](https://github.com/russleyshaw)
- [user404d](https://github.com/user404d)
- [Hannah Reinbolt](https://github.com/LoneGalaxy)
- [Matthew Qualls](https://github.com/MatthewQualls)

## Change Log

View our [CHANGELOG.md](https://github.com/siggame/colisee-builder/blob/master/CHANGELOG.md)

## License

View our [LICENSE](https://github.com/siggame/colisee/blob/master/LICENSE)

## Contributing

View our [CONTRIBUTING.md](https://github.com/siggame/colisee/blob/master/CONTRIBUTING.md)
