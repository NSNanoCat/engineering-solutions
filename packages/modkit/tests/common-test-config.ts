import { type SourceConfig, handleArgumentsDefaultValue } from '@nsnanocat/modkit-shared';

export const source: SourceConfig = {
  metadata: {
    description: 'This is a source config\nand this is a new line',
    extra: {
      category: 'modkit',
    },
  },
  arguments: [
    {
      type: 'boolean',
      key: 'boolean',
      name: 'Boolean',
      defaultValue: true,
    },
    {
      type: 'string',
      key: 'string',
      name: 'String',
      defaultValue: 'string',
    },
    {
      type: 'number',
      key: 'number',
      name: 'Number',
      defaultValue: 1,
    },
    {
      type: 'array',
      key: 'array',
      name: 'array',
      defaultValue: ['bar'],
      options: [
        { key: 'foo', label: 'Foo' },
        { key: 'bar', label: 'Bar' },
      ],
    },
  ],
  content: {
    script: [
      {
        type: 'http-response',
        name: 'script1',
        pattern: '^http://www.example.com/test',
        scriptKey: 'test',
        maxSize: 16384,
        injectArgument: true,
      },
      {
        type: 'cron',
        name: 'script2',
        cronexp: '* * * * *',
        scriptKey: 'fired',
      },
    ],
    rule: [
      'DOMAIN,www.apple.com,Proxy',
      {
        type: 'RULE-SET',
        assetKey: 'foo',
        policyName: 'REJECT',
        description: 'it is comment',
      },
    ],
    host: {
      'abc.com': '1.2.3.4',
    },
    rewrite: [
      {
        pattern: '^http://www.google.cn',
        type: 'http-request',
        mode: 'header',
        content: 'http://www.google.com',
      },
      {
        pattern: '^http://ad.com/ad.png',
        type: 'http-response',
        mode: 'reject',
        content: '_',
      },
      {
        pattern: '^http://example.com',
        type: 'http-request',
        mode: 'header-add',
        content: {
          DNT: '1',
        },
      },
      {
        pattern: '^https?://example.com/',
        type: 'http-response',
        content: {
          regex1: 'replacement1',
          regex2: 'replacement2',
        },
      },
    ],
    mock: [
      {
        pattern: '^http://surgetest.com/json',
        dataType: 'text',
        data: { content: '{}' },
        statusCode: 500,
      },
      {
        pattern: '^http://surgetest.com/file',
        dataType: 'file',
        data: 'foo',
        headers: {
          a: 'b',
          foo: 'bar',
        },
      },
    ],
    mitm: {
      hostname: ['example.com'],
    },
  },
  scripts: {
    test: './src/test.ts',
    fired: './src/fired.ts',
  },
  assets: {
    foo: './src/foo.list',
  },
};

export const testParams = {
  source,
  getFilePath: (fileName: string) => fileName,
  getScriptPath: (scriptKey: string) => `./${scriptKey}.js`,
  handleArgumentsDefaultValue: handleArgumentsDefaultValue,
};
