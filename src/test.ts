/// <reference types="types-node-test" />

import { Volume } from 'memfs';
import test from 'node:test';
import assert from 'node:assert';
import outdent from 'outdent';
import { diffLines } from 'diff';
import { green, red, gray } from 'colors';
import { generateTypes } from './index';
import ts, { factory as f } from 'typescript';

test('polyglot', async (t) => {
  await t.test('creates declaration for simplest t9n file', async (t) => {
    const { promises: vol } = Volume.fromJSON({
      '/t9n/en.json': '{"hello":"World"}',
    });

    await generateTypes({ fs: vol as any, entry: '/t9n/en.json' });

    assertEqualLines(
      (await vol.readFile('/t9n/en.d.ts')).toString().trim(),
      outdent`
        import type P from 'node-polyglot';
        type DeepPartial<T> = {
            [P in keyof T]?: DeepPartial<T[P]>;
        };
        export type Phrase = 'hello';
        export type Phrases = {
            hello: string;
        };
        export interface Polyglot extends Omit<P, 'extend' | 't' | 'replace' | 'unset'> {
            extend(phrases: DeepPartial<Phrases>): void;
            replace(phrases: Phrases): void;
            unset(phrases: Phrase | DeepPartial<Phrases>): void;
            t(phrase: 'hello'): string;
        }
      `,
    );
  });

  await t.test('creates declaration for nested t9n file', async () => {
    const { promises: vol } = Volume.fromJSON({
      '/t9n/en.json': '{"hello":{"cruel":"World"}}',
    });

    await generateTypes({ fs: vol as any, entry: '/t9n/en.json' });

    assertEqualLines(
      (await vol.readFile('/t9n/en.d.ts')).toString().trim(),
      outdent`
        import type P from 'node-polyglot';
        type DeepPartial<T> = {
            [P in keyof T]?: DeepPartial<T[P]>;
        };
        export type Phrase = 'hello.cruel';
        export type Phrases = {
            hello: {
                cruel: string;
            };
        };
        export interface Polyglot extends Omit<P, 'extend' | 't' | 'replace' | 'unset'> {
            extend(phrases: DeepPartial<Phrases>): void;
            replace(phrases: Phrases): void;
            unset(phrases: Phrase | DeepPartial<Phrases>): void;
            t(phrase: 'hello.cruel'): string;
        }
      `,
    );
  });

  await t.test('declares interpolation', async () => {
    const { promises: vol } = Volume.fromJSON({
      '/t9n/en.json': '{"hello":"Hello %{thing}"}',
    });

    await generateTypes({ fs: vol as any, entry: '/t9n/en.json' });

    assertEqualLines(
      (await vol.readFile('/t9n/en.d.ts')).toString().trim(),
      outdent`
        import type P from 'node-polyglot';
        type DeepPartial<T> = {
            [P in keyof T]?: DeepPartial<T[P]>;
        };
        export type Phrase = 'hello';
        export type Phrases = {
            hello: string;
        };
        export interface Polyglot extends Omit<P, 'extend' | 't' | 'replace' | 'unset'> {
            extend(phrases: DeepPartial<Phrases>): void;
            replace(phrases: Phrases): void;
            unset(phrases: Phrase | DeepPartial<Phrases>): void;
            t(phrase: 'hello', options: {
                thing: string | number;
            }): string;
        }
      `,
    );
  });

  await t.test('declares smart_count + interpolation', async () => {
    const { promises: vol } = Volume.fromJSON({
      '/t9n/en.json': '{"hello":"Hello %{name} |||| Multi-hello %{name}"}',
    });

    await generateTypes({ fs: vol as any, entry: '/t9n/en.json' });

    assertEqualLines(
      (await vol.readFile('/t9n/en.d.ts')).toString().trim(),
      outdent`
        import type P from 'node-polyglot';
        type DeepPartial<T> = {
            [P in keyof T]?: DeepPartial<T[P]>;
        };
        export type Phrase = 'hello';
        export type Phrases = {
            hello: string;
        };
        export interface Polyglot extends Omit<P, 'extend' | 't' | 'replace' | 'unset'> {
            extend(phrases: DeepPartial<Phrases>): void;
            replace(phrases: Phrases): void;
            unset(phrases: Phrase | DeepPartial<Phrases>): void;
            t(phrase: 'hello', options: {
                name: string | number;
                smart_count: number;
            }): string;
        }
      `,
    );
  });

  await t.test('all together now', async () => {
    const { promises: vol } = Volume.fromJSON({
      '/t9n/en.json': JSON.stringify({
        hello: 'world',
        ['#funky-"name\'']: 'with %{fun#"y\'arg}',
        deep: {
          deep: { prop: 'yay %{with_arg}' },
          and: 'Hello %{name} |||| Multi-hello %{name}',
        },
      }),
    });

    await generateTypes({ fs: vol as any, entry: '/t9n/en.json' });

    assertEqualLines(
      (await vol.readFile('/t9n/en.d.ts')).toString().trim(),
      outdent`
        import type P from 'node-polyglot';
        type DeepPartial<T> = {
            [P in keyof T]?: DeepPartial<T[P]>;
        };
        export type Phrase = 'hello' | '#funky-"name\\'' | 'deep.deep.prop' | 'deep.and';
        export type Phrases = {
            hello: string;
            ['#funky-"name\\'']: string;
            deep: {
                deep: {
                    prop: string;
                };
                and: string;
            };
        };
        export interface Polyglot extends Omit<P, 'extend' | 't' | 'replace' | 'unset'> {
            extend(phrases: DeepPartial<Phrases>): void;
            replace(phrases: Phrases): void;
            unset(phrases: Phrase | DeepPartial<Phrases>): void;
            t(phrase: 'hello'): string;
            t(phrase: '#funky-"name\\'', options: {
                ['fun#"y\\'arg']: string | number;
            }): string;
            t(phrase: 'deep.deep.prop', options: {
                with_arg: string | number;
            }): string;
            t(phrase: 'deep.and', options: {
                name: string | number;
                smart_count: number;
            }): string;
        }
      `,
    );
  });

  await t.test('polyglot options', async () => {
    const { promises: vol } = Volume.fromJSON({
      '/t9n/en.json': '{"hello":"Hello ((name))"}',
    });

    await generateTypes({
      fs: vol as any,
      entry: '/t9n/en.json',
      dialect: {
        name: 'polyglot',
        names: {
          phrase: 'MyPhrase',
          phrases: 'MyPhrases',
          polyglot: 'MyPolyglot',
        },
        prefix: '((',
        suffix: '))',
        translationMethods: [
          {
            name: 'typs',
            returnType: f.createLiteralTypeNode(f.createStringLiteral('ok')),
            interpolationParamType: f.createLiteralTypeNode(
              f.createStringLiteral('yay'),
            ),
          },
        ],
        heritageClauses: [],
        additionalMembers: [
          f.createPropertySignature(
            [f.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
            f.createIdentifier('_test'),
            undefined,
            f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
          ),
        ],
      },
    });

    assertEqualLines(
      (await vol.readFile('/t9n/en.d.ts')).toString().trim(),
      outdent`
        import type P from 'node-polyglot';
        type DeepPartial<T> = {
            [P in keyof T]?: DeepPartial<T[P]>;
        };
        export type MyPhrase = 'hello';
        export type MyPhrases = {
            hello: string;
        };
        export interface MyPolyglot {
            readonly _test: number;
            extend(phrases: DeepPartial<MyPhrases>): void;
            replace(phrases: MyPhrases): void;
            unset(phrases: MyPhrase | DeepPartial<MyPhrases>): void;
            typs(phrase: 'hello', options: {
                name: "yay";
            }): "ok";
        }
      `,
    );
  });
});

function assertEqualLines(a: string, b: string) {
  assert.strictEqual(
    a,
    b,
    diffLines(a, b)
      .map((part) => {
        const color = part.added ? green : part.removed ? red : gray;

        return color(part.value);
      })
      .join(''),
  );
}
