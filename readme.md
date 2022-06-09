# typed-t

generate typescript declarations from json translation files

Currently supports:

- [x] [node-polyglot](https://www.npmjs.com/package/node-polyglot)
- [ ] [i18next](https://www.npmjs.com/package/i18next) (PR welcome)

## install

```bash
npm i typed-t -D
```

## use

```ts
// generate-decl.ts
import { generateTypes, Options, DialectOptions } from 'typed-t';

const dialectOpts: DialectOptions = {
  name: 'polyglot',

  /* Custom prefix for interpolations */
  // prefix: '{'

  /* Custom suffix for interpolations */
  // suffix: '}'
};
const options: Options = {
  /* Single json file or directory containing t9n files */
  entry: __dirname + '/locales',

  /* Specify target dialect and options */
  dialect: dialectOpts,

  /* Custom directory to put declaration files in (Default: same as input dir) */
  // outDir: __dirname + '/locale-declarations

  /* Custom filter to include only specific files */
  // include: (name: string, content: Buffer) => true

  /* Consider files in sub-folders? (Default: true) */
  // recursive: false

  /* Custom file system compatible with node:fs/promises */
  // fs: myCustomFileSystem

  /* Custom node:path implementation */
  // path: myCustomPath
};

generateTypes(options)
  .then(() => {
    console.log('DONE');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

then run

```bash
node -r esbuild-register generate-decl.ts
```

How you incorporate the types in your app is highly dependant on your setup
so this tool can not help you with that, sorry.
