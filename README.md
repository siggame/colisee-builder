# siggame/colisee-builder  
[![Travis](https://img.shields.io/travis/siggame/colisee-builder.svg?style=flat-square)](https://travis-ci.org/siggame/colisee-builder) 
[![David](https://img.shields.io/david/siggame/colisee-builder.svg?style=flat-square)]()
[![Docker Pulls](https://img.shields.io/docker/pulls/siggame/colisee-builder.svg?style=flat-square)](https://hub.docker.com/r/siggame/colisee-builder/)
[![GitHub release](https://img.shields.io/github/release/siggame/colisee-builder.svg?style=flat-square)](https://github.com/siggame/colisee-builder/releases)  

REST Service that builds client code into Docker Images saved as zip files.

## Table Of Contents
- [Description](#description)
- [REST API](#rest-api)
    - [Interfaces](#interfaces)
    - [API](#api)

## Description

The purpose of this application is to provide a service to the ACM SIG-Game Web team to build competitor code. A competitor will log into the Web team's general user interface and upload a new zip file to submit to the tournament. The Web team will request this service to add this zip file to the queue. The builder will give back a unique ID of the build and the web team will occasionally ping the service to check if the build has finished. When the build has finished, the Web team will retrieve the gamelog as well as the built Docker Image from the service in a reasonable amount of time[1].

> [1] Given that the competition is 24 hours, and that a competitor will expect the build to be running in a live environment ASAP, we can assume a reasonable amount time is defined as 5 minutes. At any point in time beyond 5 minutes, the builder service cannot guarantee that the requested data was preserved. Ideally the Web Server will retrieve the data within **5 seconds** of the build being completed.

## REST API

### Interfaces

The following interfaces & types are defined and referenced below in the API endpoints.

```typescript
type BuildStatusType = "queued" | "building" | "failed" | "succeeded";

interface BuildStatus {
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

### API
-----------------------------------------
### `GET /` Retrieve status of all builds

Retrieve the status of all builds. The following query parameters are acceptable.

```typescript
interface QueryParams {
    // Filter by any of the provided statuses
    id: string[];
}
```

**200 - Retrieved build status**
```
{
    statuses: BuildStatus[];
}
```
**400 - Bad Request**
```
HttpError
```

-----------------------------------------
### `GET /{id}` Retrieve status of a build

Retrieve the status of a build.

**200 - Retrieved build status**
```
BuildStatus;
```
**400 - Bad Request; 404 - Not Found**
```
HttpError
```

-----------------------------------------
### `GET /{id}/log` Retrieve log of a build

Retrieve a log of the build. The built must have status `failed` or `succeeded`. Otherwise, endpoint will return a 403 - Forbidden.

**200 - Retrieved log**
```
text/plain
```

**404 - Not Found; 400 - Bad Request; 403 - Forbidden**
```
HttpError;
```

-----------------------------------------
### `GET /{id}/image` Retrieve built docker image of a build

Retrieve the built version of the code as a saved docker image. The built must have status `succeeded`. Otherwise, endpoint will return a 403 - Forbidden.

**200 - Retrieved log**
```
application/zip
```

**404 - Not Found; 400 - Bad Request; 403 - Forbidden**
```
HttpError;
```

-----------------------------------------
### `POST /` Queue new build

Push a new build into the queue. The **body** of the request must contain the **ZIP file** of course that is to be built.

**201 - Queued build**
```
BuildStatus;
```
**400 - Bad Request; 409 - Conflict**
```
HttpError;
```