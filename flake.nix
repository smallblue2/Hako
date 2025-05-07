{
  description = "Hako build flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in rec {
        devShells.default = pkgs.mkShell {
          name = "build-hako";
          buildInputs = with pkgs; [ bun emscripten just gnupg nodejs meson ninja luajitPackages.ldoc ];
          shellHook = ''
            export EM_CACHE="$HOME/.cache/emscripten"
          '';
        };
        default = pkgs.hello;
      }
    );
}
