import { ArgumentsBuilder } from '@nsnanocat/arguments-builder';
import { Project } from 'ts-morph';
import { testArgs } from './common';

describe('ArgumentsBuilder', () => {
  const builder = new ArgumentsBuilder({
    args: testArgs,
  });

  describe('buildBoxJsSettings', () => {
    it('should generate correct BoxJs settings', () => {
      const result = builder.buildBoxJsSettings('@iRingo.WeatherKit.Settings');
      expect(result).toEqual(
        expect.arrayContaining([
          {
            id: '@iRingo.WeatherKit.Settings.Switch',
            name: '总功能开关',
            val: true,
            type: 'boolean',
            desc: '是否启用此APP修改',
          },
          {
            id: '@iRingo.WeatherKit.Settings.NextHour.Provider',
            name: '[未来一小时降水强度]数据源',
            val: 'ColorfulClouds',
            type: 'selects',
            items: [
              {
                key: 'WeatherKit',
                label: 'WeatherKit (不进行替换)',
              },
              {
                key: 'ColorfulClouds',
                label: '彩云天气',
              },
              {
                key: 'QWeather',
                label: '和风天气',
              },
            ],
            desc: '始终会使用选定的数据源，填补无降水监测地区的数据。',
          },
          {
            id: '@iRingo.WeatherKit.Settings.AQI.Provider',
            name: '[空气质量]数据源',
            val: 'ColorfulClouds',
            type: 'selects',
            items: [
              {
                key: 'WeatherKit',
                label: 'WeatherKit (不进行替换)',
              },
              {
                key: 'ColorfulClouds',
                label: '彩云天气',
              },
              {
                key: 'QWeather',
                label: '和风天气',
              },
              {
                key: 'WAQI',
                label: 'The World Air Quality Project',
              },
            ],
            desc: '始终会使用选定的数据源，填补无空气质量监测地区的数据。',
          },
          {
            id: '@iRingo.WeatherKit.Settings.AQI.ReplaceProviders',
            name: '[空气质量]需要替换的供应商',
            val: [],
            type: 'checkboxes',
            desc: '选中的空气质量数据源会被替换。',
            items: [
              {
                key: 'QWeather',
                label: '和风天气',
              },
              {
                key: 'BreezoMeter',
                label: 'BreezoMeter',
              },
              {
                key: 'TWC',
                label: 'The Weather Channel',
              },
            ],
          },
          {
            id: '@iRingo.WeatherKit.Settings.AQI.Local.Scale',
            name: '[空气质量]本地替换算法',
            val: 'WAQI_InstantCast',
            type: 'selects',
            desc: '本地替换时使用的算法',
            items: [
              {
                key: 'NONE',
                label: 'None (不进行替换)',
              },
              {
                key: 'WAQI_InstantCast',
                label: 'WAQI InstantCast',
              },
            ],
          },
          {
            id: '@iRingo.WeatherKit.Settings.AQI.Local.ReplaceScales',
            name: '[空气质量]需要修改的标准',
            val: ['HJ6332012'],
            type: 'checkboxes',
            desc: '选中的空气质量标准会被替换。请注意各国监测的污染物种类可能有所不同，转换算法或API未必适合当地。',
            items: [
              {
                key: 'HJ6332012',
                label: '中国 (HJ 633—2012)',
              },
            ],
          },
          {
            id: '@iRingo.WeatherKit.Settings.AQI.Local.ConvertUnits',
            name: '[空气质量]转换污染物计量单位',
            val: false,
            type: 'boolean',
            desc: '（不推荐。不同单位互转可能会损失精度，导致数值偏大）将污染物数据替换为转换单位后的数据，方便对照转换后的标准。',
          },
          {
            id: '@iRingo.WeatherKit.Settings.API.ColorfulClouds.Token',
            name: '[API]彩云天气 API 令牌',
            val: '',
            type: 'text',
            placeholder: '123456789123456789abcdefghijklmnopqrstuv',
            desc: '彩云天气 API 令牌',
          },
          {
            id: '@iRingo.WeatherKit.Settings.API.QWeather.Host',
            name: '[API]和风天气 API 主机',
            val: 'devapi.qweather.com',
            type: 'selects',
            desc: '和风天气 API 使用的主机名',
            items: [
              {
                key: 'devapi.qweather.com',
                label: '免费订阅 (devapi.qweather.com)',
              },
              {
                key: 'api.qweather.com',
                label: '付费订阅 (api.qweather.com)',
              },
            ],
          },
          {
            id: '@iRingo.WeatherKit.Settings.API.QWeather.Token',
            name: '[API]和风天气 API 令牌',
            val: '',
            type: 'text',
            placeholder: '123456789123456789abcdefghijklmnopqrstuv',
            desc: '和风天气 API 令牌',
          },
          {
            id: '@iRingo.WeatherKit.Settings.API.WAQI.Token',
            name: '[API]WAQI API 令牌',
            val: '',
            type: 'text',
            placeholder: '123456789123456789abcdefghijklmnopqrstuv',
            desc: 'WAQI API 令牌，填写此字段将自动使用WAQI高级API',
          },
        ]),
      );
    });
  });

  describe('buildSurgeArguments', () => {
    const result = builder.buildSurgeArguments();
    it('should generate correct Surge arguments', () => {
      expect(result.argumentsText).not.toContain('Switch');
      expect(result.argumentsText).toContain('NextHour.Provider:"ColorfulClouds"');
    });
    it('should generate correct Surge arguments description', () => {
      expect(result.argumentsDescription).toContain('[未来一小时降水强度]数据源\n    ├ WeatherKit');
    });
    it('should generate correct Surge script params', () => {
      expect(result.scriptParams).toContain(
        'NextHour.Provider="{{{NextHour.Provider}}}"&AQI.Provider="{{{AQI.Provider}}}"&',
      );
    });
  });

  describe('buildLoonArguments', () => {
    const result = builder.buildLoonArguments();
    it('should generate correct Loon arguments', () => {
      expect(result.argumentsText).not.toContain('Switch');
      expect(result.argumentsText).toContain(
        'NextHour.Provider = select,"ColorfulClouds","WeatherKit","QWeather",tag=[未来一小时降水强度]数据源,desc=',
      );
      expect(result.argumentsText).toContain('AQI.ReplaceProviders = input,');
    });
    it('should generate correct Loon script params', () => {
      expect(result.scriptParams).toContain('[{NextHour.Provider},{AQI.Provider},');
    });
  });

  describe('buildDtsArguments', () => {
    it('should generate correct DTS interface', () => {
      const result = builder.buildDtsArguments();
      expect(result).toContain('export interface Settings {');
      expect(result).toContain('Switch?: boolean;');
      expect(result).toContain('NextHour?: {');
      expect(result).toContain("Provider?: 'WeatherKit' | 'ColorfulClouds' | 'QWeather';");
      expect(result).toContain('AQI?: {');
      expect(result).toContain("Provider?: 'WeatherKit' | 'ColorfulClouds' | 'QWeather' | 'WAQI';");
      expect(result).toContain("ReplaceProviders?: ('QWeather' | 'BreezoMeter' | 'TWC')[];");
      expect(result).toContain('Local?: {');
      expect(result).toContain("Scale?: 'NONE' | 'WAQI_InstantCast';");
      expect(result).toContain("ReplaceScales?: ('HJ6332012')[];");
      expect(result).toContain('ConvertUnits?: boolean;');
      expect(result).toContain('API?: {');
      expect(result).toContain('ColorfulClouds?: {');
      expect(result).toContain('Token?: string;');
      expect(result).toContain('QWeather?: {');
      expect(result).toContain("Host?: 'devapi.qweather.com' | 'api.qweather.com';");
      expect(result).toContain('Token?: string;');
      expect(result).toContain('WAQI?: {');
      expect(result).toContain('Token?: string;');
      expect(result).toContain('@defaultValue true');
      expect(result).toContain('@defaultValue "ColorfulClouds"');
      expect(result).toContain('@defaultValue []');
      expect(result).toContain('@defaultValue "WAQI_InstantCast"');
      expect(result).toContain('@defaultValue ["HJ6332012"]');
      expect(result).toContain('@defaultValue false');
      expect(result).toContain('@defaultValue ""');
      expect(result).toContain('@defaultValue "devapi.qweather.com"');
    });
  });
});

describe('indexed argument types', () => {
  it('merges indices, preserves nested arrays, options and scope exclusions in a compilable interface', () => {
    const builder = new ArgumentsBuilder({
      args: [
        { key: 'Languages[0]', type: 'string', defaultValue: 'EN', options: [{ key: 'EN' }] },
        { key: 'Languages[1]', type: 'string', defaultValue: 'ZH', options: [{ key: 'ZH' }] },
        { key: 'Single[2]', type: 'boolean', defaultValue: false },
        { key: 'Nested.Rows[0].Name', type: 'string', defaultValue: '' },
        { key: 'Nested.Rows[1].Name', type: 'number', defaultValue: 1 },
        { key: 'Nested.Rows[1].Enabled', type: 'boolean', defaultValue: true },
        { key: 'Nested.Matrix[0][1]', type: 'number', defaultValue: 1 },
        { key: 'Nested.Mode', type: 'string', defaultValue: 'auto', options: [{ key: 'auto' }] },
        { key: 'Hidden[0]', type: 'string', defaultValue: '', exclude: ['dts'] },
      ],
    });
    const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { strict: true } });
    const source = project.createSourceFile(
      'settings.ts',
      builder.buildDtsArguments() +
        `
      const valid: Settings = {
        Languages: ['EN', 'ZH'], Single: [true],
        Nested: { Rows: [{ Name: 'first', Enabled: true }, { Name: 1 }], Matrix: [[1]], Mode: 'auto' },
      };
      // @ts-expect-error unknown option must remain invalid
      const invalid: Settings = { Languages: ['INVALID'] };
      // @ts-expect-error excluded argument must not leak into types
      const excluded: Settings = { Hidden: ['value'] };
    `,
    );
    expect(
      source
        .getInterfaceOrThrow('Settings')
        .getProperties()
        .map((property) => property.getName()),
    ).toEqual(['Languages', 'Single', 'Nested']);
    expect(project.getPreEmitDiagnostics().map((diagnostic) => diagnostic.getMessageText())).toEqual([]);
    expect(builder.buildBoxJsSettings('Settings').map((item) => item.id)).toContain('Settings.Languages[1]');
  });
});
