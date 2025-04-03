# README

[![License: MIT](https://img.shields.io/badge/license-MIT-orange.svg)](https://github.com/xaverh/vscode-clang-format/blob/master/LICENSE)
[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/xaver.clang-format.svg)](https://marketplace.visualstudio.com/items?itemName=xaver.clang-format)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/xaver.clang-format.svg)](https://marketplace.visualstudio.com/items?itemName=xaver.clang-format)

[Clang-Format](http://clang.llvm.org/docs/ClangFormat.html) is a tool to format C/C++/Java/JavaScript/Objective-C/Objective-C++/Metal/Protobuf code. It can be configured with a config file named `.clang-format` within the working folder or a parent folder. Configuration see: http://clang.llvm.org/docs/ClangFormatStyleOptions.html


## Usage

This extension allows clang-format (version 3.8 or higher) to be used to format C/C++, Javascript etc.
source files directly from within Visual Studio Code.

Files can be formatted on-demand by right clicking in the document and
selecting "Format Document", or by using the associated keyboard shortcut
(usually Ctrl+⇧+F on Windows, Ctrl+⇧+I on Linux, and ⇧+⌥+F on macOS).

To automatically format a file on save, add the following to your
vscode settings.json file:

```json
{
    "editor.formatOnSave": true
}
```

## Specifying the location of clang-format

This extension will attempt to find clang-format on your `PATH`.
Alternatively, the clang-format executable can be specified in your vscode
settings.json file:

```json
{
    "clang-format.executable": "/absolute/path/to/clang-format"
}
```

Placeholders can also be used in the `clang-format.executable` value.
The following placeholders are supported:

- `${workspaceRoot}` - replaced by the absolute path of the current vscode
  workspace root.
- `${workspaceFolder}` - replaced by the absolute path of the current vscode 
  workspace. In case of outside-workspace files `${workspaceFolder}` expands 
  to the absolute path of the first available workspace.
- `${cwd}` - replaced by the current working directory of vscode.
- `${env.VAR}` - replaced by the environment variable $VAR, e.g. `${env.HOME}`
  will be replaced by `$HOME`, your home directory.

Some examples:

- `${workspaceRoot}/node_modules/.bin/clang-format` - specifies the version of
  clang that has been added to your workspace by `npm install clang-format`.
- `${env.HOME}/tools/clang38/clang-format` - use a specific clang format version
  under your home directory.

Placeholders are also supported in `clang-format.assumeFilename`. The supported
placeholders are `${file}`, `${fileNoExtension}`, `${fileBasename}`,
`${fileBasenameNoExtension}`, and `${fileExtname}`, with the same meaning as the
predefined variables in [other configuration files](https://code.visualstudio.com/docs/editor/variables-reference).

For example:
- `${fileNoExtension}.cpp` - `/home/src/foo.h` will be formatted with
  `-assume-filename /home/src/foo.cpp`.

## Installing Clang-Format

On Linux, one can simply run `sudo apt install clang-format`. 

On Windows, the simplest way is to install LLVM to the default path either using the [installer](https://llvm.org/) or by simply running `winget install -e --id LLVM.LLVM` using [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/). 

LLVM contains the clang-format binary, the resulting pat for the `clang-format.executable` then becomes:
```json
{
    "clang-format.executable": "c:\\Program Files\\LLVM\\bin\\clang-format.exe"
}
```

## Source code
Available on github: https://github.com/xaverh/vscode-clang-format-provider
