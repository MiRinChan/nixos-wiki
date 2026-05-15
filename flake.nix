# The wiki program. Provide a simple markdown-based wiki with a static site generator for easy hosting on GitHub Pages or similar platforms.
# Copyright (C) 2026 MiRinChan
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License along
# with this program; if not, see < https://www.gnu.org/licenses/>.

{
  description = "Development environment for the personal Chinese NixOS wiki";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {nixpkgs, ...}: let
    systems = [
      "x86_64-linux"
      "aarch64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ];
    forAllSystems = nixpkgs.lib.genAttrs systems;
  in {
    devShells = forAllSystems (
      system: let
        pkgs = import nixpkgs {inherit system;};
      in {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22
          ];

          shellHook = ''
            case "$-" in
              *i*)
                echo "Wiki dev shell"
                echo "  npm ci         # install dependencies"
                echo "  npm run build  # generate out/"
                echo "  npm run dev    # auto-build + live reload"
                ;;
            esac
          '';
        };
      }
    );

    apps = forAllSystems (
      system: let
        pkgs = import nixpkgs {inherit system;};
        buildWiki = pkgs.writeShellApplication {
          name = "build-wiki";
          runtimeInputs = [
            pkgs.nodejs_22
          ];
          text = ''
            if [ ! -d node_modules ]; then
              echo "node_modules/ is missing. Run: npm ci" >&2
              exit 1
            fi

            npm run build
          '';
        };
      in {
        default = {
          type = "app";
          program = "${buildWiki}/bin/build-wiki";
          meta.description = "Build the wiki into out/";
        };

        build = {
          type = "app";
          program = "${buildWiki}/bin/build-wiki";
          meta.description = "Build the wiki into out/";
        };
      }
    );

    formatter = forAllSystems (
      system: let
        pkgs = import nixpkgs {inherit system;};
      in
        pkgs.nixfmt
    );
  };
}
