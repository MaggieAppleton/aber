import { MediaSchema } from '../../../shared/src/index.js';
import { define, insert, result } from './core.js';

/** Uploaded prototype media is stored without inventing a capture or agent work. */
export const mediaTools = {
  storeMedia: define(MediaSchema, 'person', (ctx, input) => result(ctx, 'media', insert(ctx, 'media', input))),
};
