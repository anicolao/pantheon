{
  description = "Pantheon event-sourced development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        rlPython = pkgs.python3.withPackages (ps: [ ps.numpy ps.torch ps.gymnasium ps.stable-baselines3
          (ps.buildPythonPackage {
            pname = "sb3-contrib";
            version = "2.9.0";
            pyproject = true;
            src = pkgs.fetchurl {
              url = "https://files.pythonhosted.org/packages/source/s/sb3-contrib/sb3_contrib-2.9.0.tar.gz";
              hash = "sha256-boOcZpVS7LPethakLqmO1ebFmetaxfhiMkFbh6OHNpk=";
            };
            build-system = [ ps.setuptools ];
            dependencies = [ ps.stable-baselines3 ];
            pythonImportsCheck = [ "sb3_contrib" ];
          })
        ]);
      in {
        devShells.rl = pkgs.mkShell {
          packages = with pkgs; [ bun git jdk nodejs gh ripgrep rlPython ];
          shellHook = ''
            export XDG_CACHE_HOME="$PWD/.firebase/cache"
            export OMP_NUM_THREADS=1
            export OPENBLAS_NUM_THREADS=1
          '';
        };
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [ bun git jdk nodejs gh python3 ripgrep ];
          shellHook = ''
            # Keep downloaded browser and Firebase artifacts stable across
            # separate `nix develop --command` invocations in CI.
            export XDG_CACHE_HOME="$PWD/.firebase/cache"
          '';
        };
      });
}
