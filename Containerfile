FROM docker.io/nixos/nix:latest AS builder
RUN nix-channel --update
COPY . /opt/src
WORKDIR /opt/src
ENV NIX_CONFIG="experimental-features = nix-command flakes"
RUN nix develop --command bash -c "just clean && just"
WORKDIR src/site
RUN nix develop --command bash -c "bun -b run build"

FROM docker.io/caddy:alpine
COPY --from=builder /opt/src/Caddyfile /opt/srv/Caddyfile
COPY --from=builder /opt/src/build/site /opt/srv
WORKDIR /opt/srv
EXPOSE 8080
ENTRYPOINT ["caddy", "run", "-c", "Caddyfile"]
