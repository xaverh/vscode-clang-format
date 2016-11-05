* v 0.11.2
  * remove changelog from readme
  * change Marketplace category to "Formatter"
* v 0.11.0
  * this extension no longer provides its own formatOnSave feature since Visual Studio Code ^1.6.0 provides this out of the box. In order to still use *format on save  * you have to put ```"editor.formatOnSave": true``` in your ```settings.json```
* v 0.10.3
  * fix info message for when executable is not found (by [prideout](https://github.com/prideout))
* v 0.10.2
  * Marketplace appearance
* v 0.10.1
  * minor fixes
* v 0.10.0
  * enabling of individual languages with ```clang-format.language.javascript.enable```, etc.*—requires reloading Visual Studio Code*
* v 0.9.0
  * add protobuf support (work with https://marketplace.visualstudio.com/items?itemName=peterj.proto)
  * add javascript/typescript support
  * allow different style & fallback style option for different languages
  * format on save is available now (just like https://github.com/Microsoft/vscode-go/blob/master/src/goMain.ts)
* v 0.6.1
  * clean up dependencies #9
* v 0.6.0
  * fixed multibyte character handling #7 (by [OWenT](https://github.com/owt5008137))
  * fixed "clang-format is ignoring the -style setting because of invalid value" #6 (by [OWenT](https://github.com/owt5008137))
  * LLVM style is now the default fallback style (fixes #1)
  * changed dependency to VS Code 1.0.0 or higher
* v 0.5.0
  * Included [OWenT](https://github.com/owt5008137)'s changes:
  1. add setting of clang-format executable
  2. add style setting
  3. add fallback style setting
* v 0.1.2
  * Included [ioachim](https://github.com/ioachim/)'s changes:
> it doesn't require saving the file, works by doing partial edits (instead of replacing the whole buffer), and enables range formatting.
