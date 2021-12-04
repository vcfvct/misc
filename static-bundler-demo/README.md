This repo demos an error that when improper import relative path is used, the issue could be covered by the transpiler+bundler, which could result in run time error.

* index.ts -> an entry class which set the static field of a class on init.
* sampler.service.ts -> a service that uses the static field set above. (but with an not correct relative path which IDE will accept)
* static.getter.ts -> a class holds the static field that is set by handler and used by sample service.

1. after compilation/transpilation, if we run handler directly, it will error out because it cannot result `.../src/..` stuff in the dist folder.
2. however after we do the bundling with `esbuild`, it tolerated that path and imported the module from the ts file and transpile to js then put it into the final bundle file. This results in 2 `StaticGetter` class/function in the bundle file.
3. our entry point(handler) only sets the static field for one of the classes(with proper path). So when can try to use the static field from the sample service which has the other import path, the field is not available and undefined error is thrown.

* one solution is to use the `ts` as entry point for bundling rather than ts->js->esbuild, the drawback is esbuild does not support all the TS features like decorators etc.
* another solution is to use singleton instead of relying on static fields of class or prototype of function.
