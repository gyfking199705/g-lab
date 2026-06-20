---
name: dockerfile-author
description: Write secure, small, well-cached Dockerfiles for production using multi-stage builds and least privilege. Use when containerizing an app, shrinking a bloated image, fixing slow Docker builds, or hardening a container before deployment.
license: MIT
allowed-tools: Read, Bash(docker:*)
metadata:
  category: DevOps & Infra
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [docker, containers, devops, ci, security]
---

# Dockerfile Author

Produce images that are small, build fast, and run with least privilege.

## When to use

- Containerizing an application.
- An image is huge, builds slowly, or runs as root.
- Hardening a container for production.

## Layer caching (order matters)

- Copy **dependency manifests first**, install, *then* copy source. Changing
  source shouldn't bust the dependency cache.
  ```dockerfile
  COPY package*.json ./
  RUN npm ci
  COPY . .
  ```
- Put the least-frequently-changing instructions earliest.
- Combine related `RUN` steps and clean up in the **same** layer (apt lists,
  caches) — a later `rm` doesn't shrink an earlier layer.

## Smaller & safer images

- **Multi-stage build**: compile/install in a `builder` stage, copy only the
  artifacts into a minimal runtime stage.
- Choose a slim base (`-slim`, `alpine`, or `distroless`) for the final stage.
- Use a **`.dockerignore`** (`.git`, `node_modules`, build caches, secrets) to
  shrink context and avoid leaking files.
- **Pin** base image tags/digests; don't ship `latest`.

## Security & runtime

- **Run as non-root**: create a user and `USER app`. Default root is a risk.
- **Never bake secrets** into layers (they persist in history) — use build args
  carefully or runtime env/secret mounts.
- Set `WORKDIR`, an explicit `EXPOSE`, and a `HEALTHCHECK`.
- Prefer **exec-form** `ENTRYPOINT ["app"]` so signals (SIGTERM) reach the process.
- Install only runtime deps in the final stage; no compilers or dev tooling.

## Skeleton (Node example)

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && useradd -r app && chown -R app /app
COPY --from=builder /app/dist ./dist
USER app
EXPOSE 3000
HEALTHCHECK CMD node healthcheck.js
ENTRYPOINT ["node", "dist/server.js"]
```

## Smell test

`docker history` should show no secrets and no dead weight; the final image
should contain only what the app needs to run.
