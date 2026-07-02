{
  description = "robertdelanghe.dev — software-engineering portfolio, built on @bounded-systems/brand";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # Brand pinned here (flake.lock) for the hermetic build, independent of the
    # git submodule (kept only for non-Nix dev). Bump both together.
    brand = {
      url = "github:bounded-systems/brand";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, brand }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAll = nixpkgs.lib.genAttrs systems;
      pkgsFor = system: nixpkgs.legacyPackages.${system};
    in
    {
      packages = forAll (system:
        let pkgs = pkgsFor system; in
        rec {
          default = site;
          site = pkgs.stdenv.mkDerivation {
            pname = "robertdelanghe-dev";
            version = "0.1.0";
            src = ./.;
            nativeBuildInputs = [ pkgs.nodejs_22 ];
            buildPhase = ''
              runHook preBuild
              rm -rf brand
              cp -rL ${brand} brand
              chmod -R u+w brand
              node brand/tokens/build-tokens.mjs --check
              node build.mjs
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              cp -r dist $out
              runHook postInstall
            '';
          };
        });

      devShells = forAll (system:
        let pkgs = pkgsFor system; in
        {
          default = pkgs.mkShell {
            packages = [ pkgs.nodejs_22 pkgs.wrangler ];
          };
        });
    };
}
