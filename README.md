# README

## Release history

### DEVELOPING
* add protobuf support(work with https://marketplace.visualstudio.com/items?itemName=peterj.proto)
* add javascript/typescript support
* allow different style & fallback style option for different languages
* format on save is available now(just like https://github.com/Microsoft/vscode-go/blob/master/src/goMain.ts)

### v 0.6.1
* clean up dependencies #9

### v 0.6.0
* fixed multibyte character handling #7 (by [OWenT](https://github.com/owt5008137))
* fixed "clang-format is ignoring the -style setting because of invalid value" #6 (by [OWenT](https://github.com/owt5008137))
* LLVM style is now the default fallback style (fixes #1)
* changed dependency to VS Code 1.0.0 or higher

### v 0.5.0
* Included [OWenT](https://github.com/owt5008137)'s changes:
  1. add setting of clang-format executable
  2. add style setting
  3. add fallback style setting

### v 0.1.2
* Included [ioachim](https://github.com/ioachim/)'s changes:
> it doesn't require saving the file, works by doing partial edits (instead of replacing the whole buffer), and enables range formatting.

[Clang-Format](http://clang.llvm.org/docs/ClangFormat.html) is a tool to format C/C++/Java/JavaScript/Objective-C/Protobuf code. It can be configured with a config file within the working folder or a parent folder. Configuration see: http://clang.llvm.org/docs/ClangFormatStyleOptions.html


## Usage
If clang-format is installed and in PATH, C/C++ etc source files can be formatted with Visual Studio Code's built-in formatter (Usually: Ctrl+Shift+F).

## Source code

Available on github: https://github.com/xaverh/vscode-clang-format-provider
