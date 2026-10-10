import puppeteer from 'puppeteer';
import { Surge2Egern } from '../../surge2egern/src';

jest.mock('puppeteer', () => ({ __esModule: true, default: { launch: jest.fn() } }), { virtual: true });

it.each(['launch', 'page', 'navigation'])('releases Chrome after %s initialization failure', async (stage) => {
  const error = new Error(stage);
  const close = jest.fn().mockResolvedValue(undefined);
  const page = { goto: stage === 'navigation' ? jest.fn().mockRejectedValue(error) : jest.fn() };
  const browser = {
    close,
    newPage: stage === 'page' ? jest.fn().mockRejectedValue(error) : jest.fn().mockResolvedValue(page),
  };
  const launch = puppeteer.launch as jest.Mock;
  launch.mockReset();
  switch (stage) {
    case 'launch':
      launch.mockRejectedValue(error);
      break;
    default:
      launch.mockResolvedValue(browser);
      break;
  }
  const converter = new Surge2Egern();
  await expect(converter.transformModule('test')).rejects.toThrow(stage);
  await converter.destroy();
  expect(close).toHaveBeenCalledTimes(stage === 'launch' ? 0 : 1);
});
