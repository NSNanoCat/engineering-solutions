import { lodash } from '@nsnanocat/utils';
import type { KebabCase } from 'type-fest';

export const runMaybeAsync = async <T, A extends any[]>(
  fn: ((...args: A) => T | Promise<T>) | undefined,
  ...args: A
): Promise<T | undefined> => {
  const result = fn?.(...args);
  return result instanceof Promise ? await result : result;
};

export const objectEntries = <T extends Record<string, any>>(obj: T): [keyof T, T[keyof T]][] => Object.entries(obj);

export const toKebabCase = <T extends string>(str: T) => lodash.kebabCase(str) as KebabCase<T>;

export const handleArgumentsDefaultValue = (defaultValue: any) => {
  switch (typeof defaultValue) {
    case 'string':
      return `"${defaultValue}"`;
    case 'number':
    case 'boolean':
      return `${defaultValue}`;
    case 'object':
      if (Array.isArray(defaultValue)) {
        return `"${defaultValue.join()}"`;
      }
      return `"${JSON.stringify(defaultValue)}"`;
    default:
      return '""';
  }
};
