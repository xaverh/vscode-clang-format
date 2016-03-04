# README
## Clang-Format
> This version is a fork of https://github.com/xaverh/vscode-clang-format-provider. It changes the implementation so it doesn't require saving the file, works by doing partial edits (instead of replacing the whole buffer), and enables range formatting.

[Clang-Format](http://clang.llvm.org/docs/ClangFormat.html) is a tool to format C/C++/Java/JavaScript/Objective-C/Protobuf code. It can be configured with a config file within the working folder or a parent folder. Configuration see: http://clang.llvm.org/docs/ClangFormatStyleOptions.html


## Usage
If clang-format is installed and in PATH, C/C++ etc source files can be formatted with Visual Studio Code's built-in formatter (Usually: Ctrl+Shift+F).

## Roadmap

Options for the Visual Studio Code extension (eg choice of languages, format at save, etc).

## Source code

Available on github: https://github.com/ioachim/vscode-clang-format-provider
