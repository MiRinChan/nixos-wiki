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
  description = "Development environment for a static Markdown wiki";

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
            pkgs.deno
          ];

          shellHook = ''
            case "$-" in
              *i*)
                echo "Static Markdown wiki dev shell"
                echo "  deno task build  # generate out/"
                echo "  deno task dev    # rebuild on change (deno --watch)"
                echo "  deno task serve  # serve out/ on http://localhost:8000"
                echo "  deno task test   # verify out/ matches golden baseline"
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
            pkgs.deno
          ];
          text = ''
            deno task build
          '';
        };
      in {
        default = {
          type = "app";
          program = "${buildWiki}/bin/build-wiki";
          meta.description = "Build the static Markdown wiki into out/";
        };

        build = {
          type = "app";
          program = "${buildWiki}/bin/build-wiki";
          meta.description = "Build the static Markdown wiki into out/";
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
