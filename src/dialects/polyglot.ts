import ts, { factory as f } from 'typescript';

export interface CreatePolyglotTypesOptions {
  names?: {
    phrase?: string;
    phrases?: string;
    polyglot?: string;
  };
  prefix?: string;
  suffix?: string;
  heritageClauses?: ts.HeritageClause[];
  additionalMembers?: ts.TypeElement[];
}
export interface PolyglotOpts extends CreatePolyglotTypesOptions {
  name: 'polyglot';
}

export const defaultOpts: Required<
  Omit<PolyglotOpts, 'names'> & {
    names: Required<Required<PolyglotOpts>['names']>;
  }
> = {
  name: 'polyglot',
  names: {
    phrase: 'Phrase',
    phrases: 'Phrases',
    polyglot: 'Polyglot',
  },
  prefix: '%{',
  suffix: '}',
  additionalMembers: [],
  heritageClauses: [
    f.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
      f.createExpressionWithTypeArguments(f.createIdentifier('Omit'), [
        f.createTypeReferenceNode(f.createIdentifier('P'), undefined),
        f.createUnionTypeNode([
          f.createLiteralTypeNode(f.createStringLiteral('extend', true)),
          f.createLiteralTypeNode(f.createStringLiteral('t', true)),
          f.createLiteralTypeNode(f.createStringLiteral('replace', true)),
          f.createLiteralTypeNode(f.createStringLiteral('unset', true)),
        ]),
      ]),
    ]),
  ],
};

const delimiter = '||||';
const validPropName = /^(?![0-9])[a-zA-Z0-9$_]+$/;

export const importPolyglot = f.createImportDeclaration(
  undefined,
  undefined,
  f.createImportClause(true, f.createIdentifier('P'), undefined),
  f.createStringLiteral('node-polyglot', true),
);
export const deepPartial = f.createTypeAliasDeclaration(
  undefined,
  undefined,
  f.createIdentifier('DeepPartial'),
  [
    f.createTypeParameterDeclaration(
      undefined,
      f.createIdentifier('T'),
      undefined,
      undefined,
    ),
  ],
  f.createMappedTypeNode(
    undefined,
    f.createTypeParameterDeclaration(
      undefined,
      f.createIdentifier('P'),
      f.createTypeOperatorNode(
        ts.SyntaxKind.KeyOfKeyword,
        f.createTypeReferenceNode(f.createIdentifier('T'), undefined),
      ),
      undefined,
    ),
    undefined,
    f.createToken(ts.SyntaxKind.QuestionToken),
    f.createTypeReferenceNode(f.createIdentifier('DeepPartial'), [
      f.createIndexedAccessTypeNode(
        f.createTypeReferenceNode(f.createIdentifier('T'), undefined),
        f.createTypeReferenceNode(f.createIdentifier('P'), undefined),
      ),
    ]),
    undefined,
  ),
);

export function createPolyglotTransform(opts: PolyglotOpts) {
  const { prefix, suffix } = Object.assign({}, defaultOpts, opts);
  if (prefix === delimiter || suffix === delimiter) {
    throw new Error('"' + delimiter + '" token is reserved for pluralization');
  }

  const printer = ts.createPrinter();
  const sourceFile = ts.createSourceFile(
    'placeholder.ts',
    '',
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS,
  );

  return (content: Buffer): Buffer => {
    const t9n = JSON.parse(content.toString());
    if (!isRecord(t9n)) {
      throw new Error(`Unexpected t9n type: ${typeOf(t9n)}`);
    }

    const outputFile = printer.printList(
      ts.ListFormat.MultiLine,
      f.createNodeArray([
        importPolyglot,
        deepPartial,
        ...generateTypes(t9n, opts),
      ]),
      sourceFile,
    );

    return Buffer.from(outputFile);
  };
}

export function generateTypes(
  t9n: Record<string, unknown>,
  {
    suffix = defaultOpts.suffix,
    prefix = defaultOpts.prefix,
    names: customNames = {},
    additionalMembers = defaultOpts.additionalMembers,
    heritageClauses = defaultOpts.heritageClauses,
  }: CreatePolyglotTypesOptions = {},
) {
  const [flatKeys, type] = flatten(t9n);
  const names = {
    ...defaultOpts.names,
    ...customNames,
  };

  const getParams = createInterpolationParamFactory(
    new RegExp(`^${escape(prefix)}`),
    new RegExp(`${escape(suffix)}$`),
    new RegExp(escape(prefix) + '(.*?)' + escape(suffix), 'g'),
    prefix,
    suffix,
  );

  const phrase = f.createTypeAliasDeclaration(
    undefined,
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    names.phrase,
    undefined,
    f.createUnionTypeNode(flatKeys.map(([l]) => f.createLiteralTypeNode(l))),
  );
  const phrases = f.createTypeAliasDeclaration(
    undefined,
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    names.phrases,
    undefined,
    f.createTypeLiteralNode(type),
  );
  const nset = f.createMethodSignature(
    undefined,
    f.createIdentifier('unset'),
    undefined,
    undefined,
    [
      f.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        f.createIdentifier('phrases'),
        undefined,
        f.createUnionTypeNode([
          f.createTypeReferenceNode(
            f.createIdentifier(names.phrase),
            undefined,
          ),
          f.createTypeReferenceNode(f.createIdentifier('DeepPartial'), [
            f.createTypeReferenceNode(
              f.createIdentifier(names.phrases),
              undefined,
            ),
          ]),
        ]),
        undefined,
      ),
    ],
    f.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
  );
  const rplc = f.createMethodSignature(
    undefined,
    f.createIdentifier('replace'),
    undefined,
    undefined,
    [
      f.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        f.createIdentifier('phrases'),
        undefined,
        f.createTypeReferenceNode(f.createIdentifier(names.phrases), undefined),
        undefined,
      ),
    ],
    f.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
  );
  const extnds = f.createMethodSignature(
    undefined,
    f.createIdentifier('extend'),
    undefined,
    undefined,
    [
      f.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        f.createIdentifier('phrases'),
        undefined,
        f.createTypeReferenceNode(f.createIdentifier('DeepPartial'), [
          f.createTypeReferenceNode(
            f.createIdentifier(names.phrases),
            undefined,
          ),
        ]),
        undefined,
      ),
    ],
    f.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
  );

  const polyglot = f.createInterfaceDeclaration(
    undefined,
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    names.polyglot,
    undefined,
    heritageClauses,
    additionalMembers
      .concat([extnds, rplc, nset])
      .concat(
        flatKeys.map(([n, v]) =>
          f.createMethodSignature(
            undefined,
            't',
            undefined,
            undefined,
            [
              f.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                f.createIdentifier('phrase'),
                undefined,
                f.createLiteralTypeNode(n),
                undefined,
              ),
              ...getParams(v),
            ],
            f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          ),
        ),
      ),
  );

  return [phrase, phrases, polyglot];
}

function createInterpolationParamFactory(
  tokenStart: RegExp,
  tokenEnd: RegExp,
  tokenRgx: RegExp,
  prefix: string,
  suffix: string,
) {
  return (value: string): ts.ParameterDeclaration[] => {
    const allParams: string[] = Array.from(
      new Set<string>(
        (value.match(tokenRgx) || []).concat(
          value.includes(delimiter) ? `${prefix}smart_count${suffix}` : [],
        ),
      ),
    );

    if (!allParams.length) {
      return [];
    }

    return [
      f.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        'options',
        undefined,
        f.createTypeLiteralNode(
          allParams.map((p) => {
            const key = p.replace(tokenStart, '').replace(tokenEnd, '');

            return f.createPropertySignature(
              undefined,
              key.match(validPropName)
                ? key
                : f.createComputedPropertyName(
                    f.createStringLiteral(key, true),
                  ),
              undefined,
              key === 'smart_count'
                ? f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
                : f.createUnionTypeNode([
                    f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                    f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
                  ]),
            );
          }),
        ),
      ),
    ];
  };
}

function typeOf(thing: unknown) {
  return thing === null
    ? 'null'
    : Array.isArray(thing)
    ? 'array'
    : typeof thing;
}
function isRecord(thing: unknown): thing is Record<string, unknown> {
  return typeOf(thing) === 'object';
}
type FlattenContext = [
  flat: [ts.StringLiteral, string][],
  type: ts.PropertySignature[],
];
function flatten(
  record: Record<string, unknown>,
  parents: string[] = [],
): FlattenContext {
  return Object.entries(record).reduce(
    ([flat, type], [k, v]): FlattenContext => {
      if (isRecord(v)) {
        const [ft, subtypes] = flatten(v, parents.concat(k));

        return [
          flat.concat(ft),
          type.concat(
            f.createPropertySignature(
              undefined,
              k.match(validPropName)
                ? k
                : f.createComputedPropertyName(f.createStringLiteral(k, true)),
              undefined,
              f.createTypeLiteralNode(subtypes),
            ),
          ),
        ];
      } else if (typeof v === 'string') {
        return [
          flat.concat([
            [f.createStringLiteral(parents.concat(k).join('.'), true), v],
          ]),
          type.concat(
            f.createPropertySignature(
              undefined,
              k.match(validPropName)
                ? k
                : f.createComputedPropertyName(f.createStringLiteral(k, true)),
              undefined,
              f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            ),
          ),
        ];
      }
      throw new Error(
        `Unexpected type ${typeOf(v)} in t9n at ${parents.concat(k).join('.')}`,
      );
    },
    [[], []] as FlattenContext,
  );
}

function escape(token: string) {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
