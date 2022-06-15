import type { PolyglotOpts } from './dialects/polyglot';
import type { CmplOptions, WtchOpts, Prcssr } from 'cmpl';
import { cmpl, wtch } from 'cmpl';
import {
  defaultOpts as defaultPolyglotOpts,
  createPolyglotTransform,
} from './dialects/polyglot';
export {
  CreatePolyglotTypesOptions,
  TranslationMethod as PolyglotTranslationMethod,
  generateTypes as generatePolyglotTypes,
  defaultTranslationMethod as defaultPolyglotTranslationMethod,
  importPolyglot,
  deepPartial,
} from './dialects/polyglot';

type DialectOpts = PolyglotOpts;

export interface Options
  extends Omit<CmplOptions, 'processors' | 'fs'>,
    Partial<Pick<Prcssr, 'outDir' | 'include' | 'recursive'>> {
  dialect?: DialectOpts | DialectOpts['name'];
  fs?: WtchOpts['fs'] | CmplOptions['fs'];
}
export type WatchOptions = boolean | Pick<WtchOpts, 'signal' | 'onError'>;
const defaultDialectOpts: Record<DialectOpts['name'], Required<DialectOpts>> = {
  polyglot: defaultPolyglotOpts,
};

export { createPolyglotTransform };

export function createI18nTypeProcessor({
  outDir,
  include = () => true,
  recursive,
  dialect = 'polyglot',
}: Pick<Prcssr, 'outDir' | 'include' | 'recursive'> & {
  dialect?: Options['dialect'];
}): Prcssr {
  const dialectOpts =
    typeof dialect === 'string' ? defaultDialectOpts[dialect] : dialect;
  if (!dialectOpts) {
    throw new Error(`Unknown dialect ${dialect}`);
  }
  const transform =
    dialectOpts.name === 'polyglot'
      ? createPolyglotTransform(dialectOpts)
      : null;
  if (!transform) {
    throw new Error(`Unknown dialect ${dialectOpts.name}`);
  }

  return {
    recursive,
    outDir,
    include: (name, isDir) =>
      (isDir && recursive && include(name, isDir)) ||
      (!isDir && name.endsWith('.json') && include(name, isDir)),
    rename: (originalName) => {
      return originalName.replace(/\.json$/, '.d.ts');
    },
    transform,
  };
}

export async function generateTypes(
  options: Omit<Options, 'fs'> & { fs: CmplOptions['fs'] },
): Promise<Record<string, string> | Record<string, string>[]>;
export async function generateTypes(
  options: Omit<Options, 'fs'> & { fs: CmplOptions['fs'] },
  watch: false,
): Promise<Record<string, string> | Record<string, string>[]>;
export async function generateTypes(
  options: Omit<Options, 'fs'> & { fs: WtchOpts['fs'] },
  watch: true,
): Promise<
  AsyncGenerator<
    Record<string, string> | Record<string, string>[],
    void,
    unknown
  >
>;
export async function generateTypes(
  options: Omit<Options, 'fs'> & { fs: WtchOpts['fs'] },
  watch: WatchOptions,
): Promise<
  AsyncGenerator<
    Record<string, string> | Record<string, string>[],
    void,
    unknown
  >
>;
export async function generateTypes(
  {
    entry,
    outDir,
    fs = import('node:fs/promises'),
    path = import('node:path'),
    include,
    dialect,
    recursive,
  }: Options,
  watch?: WatchOptions,
) {
  const { stat } = await fs;
  const { dirname } = await path;
  const isDir = (await stat(entry)).isDirectory();

  const processor = createI18nTypeProcessor({
    outDir: outDir ? outDir : isDir ? entry : dirname(entry),
    include,
    recursive,
    dialect,
  });

  if (watch) {
    return wtch({
      entry,
      fs: fs as WtchOpts['fs'],
      path,
      processors: [processor],
      ...(typeof watch === 'object' ? watch : {}),
    });
  }

  return cmpl({
    entry,
    fs,
    path,
    processors: [processor],
  });
}
