{
  description = "Development environment for the personal Chinese NixOS wiki";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
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
                  ;;
              esac
            '';
          };
        }
      );

      apps = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
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
        in
        {
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
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        pkgs.nixfmt
      );
    };
}
