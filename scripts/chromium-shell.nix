{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = [
    pkgs.glib pkgs.nss pkgs.nspr pkgs.atk pkgs.at-spi2-atk pkgs.at-spi2-core
    pkgs.cups pkgs.libdrm pkgs.libxkbcommon pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage pkgs.xorg.libXfixes pkgs.xorg.libXrandr pkgs.pango
    pkgs.cairo pkgs.gdk-pixbuf pkgs.xorg.libxcb pkgs.xorg.libX11 pkgs.xorg.libXi
    pkgs.xorg.libXtst pkgs.alsa-lib pkgs.xorg.libXrender pkgs.freetype
    pkgs.fontconfig pkgs.xorg.libxshmfence pkgs.libxshmfence pkgs.zlib
    pkgs.expat pkgs.bzip2 pkgs.libpng pkgs.libjpeg-turbo pkgs.libffi
    pkgs.dbus pkgs.harfbuzz pkgs.graphite2
  ];
  LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
    pkgs.glib pkgs.nss pkgs.nspr pkgs.atk pkgs.at-spi2-atk pkgs.at-spi2-core
    pkgs.cups pkgs.libdrm pkgs.libxkbcommon pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage pkgs.xorg.libXfixes pkgs.xorg.libXrandr pkgs.pango
    pkgs.cairo pkgs.gdk-pixbuf pkgs.xorg.libxcb pkgs.xorg.libX11 pkgs.xorg.libXi
    pkgs.xorg.libXtst pkgs.alsa-lib pkgs.xorg.libXrender pkgs.freetype
    pkgs.fontconfig pkgs.xorg.libxshmfence pkgs.libxshmfence pkgs.zlib
    pkgs.expat pkgs.bzip2 pkgs.libpng pkgs.libjpeg-turbo pkgs.libffi
    pkgs.dbus pkgs.harfbuzz pkgs.graphite2
  ];
}
