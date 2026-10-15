import { describe, expect, test } from 'bun:test';
import type { MessageAttachment, WakuClient } from '@waku/client';

import {
  ATTACHMENT_CHUNK_BYTES,
  imageMimeType,
  importLocalAttachment,
  isPreviewableImage,
  localFileName,
  MAX_ATTACHMENT_BYTES,
  readAttachmentImage,
  uploadAttachmentInChunks,
} from './attachments';

function attachment(overrides: Partial<MessageAttachment> = {}): MessageAttachment {
  return {
    path: '/daemon/blobs/photo.png',
    mention: '/daemon/blobs/photo.png',
    name: 'photo.png',
    is_dir: false,
    is_image: true,
    blob_reference: 'waku-attachment:file',
    ...overrides,
  };
}

describe('mobile attachments', () => {
  test('imports local data through the daemon and retains display metadata', async () => {
    const client = {
      request: async (command: Record<string, unknown>) => {
        if (command.type === 'beginAttachmentUpload') {
          return { type: 'attachmentUploadStarted', uploadId: 'u-meta' };
        }
        if (command.type === 'finishAttachmentUpload') {
          return {
            type: 'attachmentStored',
            attachment: {
              reference: 'waku-attachment:file',
              path: '/daemon/blobs/photo.png',
              name: 'photo.png',
              isDir: false,
            },
          };
        }
        return { type: 'ack' };
      },
    } as unknown as WakuClient;

    // Three bytes, so the base64 payload is exactly one chunk.
    const attachment = await importLocalAttachment(client, {
      uri: 'file:///photo.png',
      name: 'photo.png',
      mimeType: 'image/png',
      size: 3,
      base64: 'data:image/png;base64,YWJj',
    });

    expect(attachment).toEqual({
      path: '/daemon/blobs/photo.png',
      mention: '/daemon/blobs/photo.png',
      name: 'photo.png',
      is_dir: false,
      is_image: true,
      blob_reference: 'waku-attachment:file',
    });
  });

  test('rejects an oversized file before reading or uploading it', async () => {
    const client = { request: () => Promise.reject(new Error('should not upload')) } as unknown as WakuClient;
    await expect(importLocalAttachment(client, {
      uri: 'file:///large.zip',
      name: 'large.zip',
      size: MAX_ATTACHMENT_BYTES + 1,
    })).rejects.toThrow('32 MB maximum');
  });

  test('derives a decoded name from a picker URI', () => {
    expect(localFileName('file:///tmp/Camera%20Photo.jpg?edited=1', 'photo.jpg'))
      .toBe('Camera Photo.jpg');
  });

  test('sends a URI-backed file as sequential chunks and commits it', async () => {
    const commands: Array<Record<string, unknown>> = [];
    const client = {
      request: async (command: Record<string, unknown>) => {
        commands.push(command);
        if (command.type === 'beginAttachmentUpload') {
          return { type: 'attachmentUploadStarted', uploadId: 'u-1' };
        }
        if (command.type === 'finishAttachmentUpload') {
          return {
            type: 'attachmentStored',
            attachment: {
              reference: 'waku-attachment:file',
              path: '/daemon/blobs/big.png',
              name: 'big.png',
              isDir: false,
            },
          };
        }
        return { type: 'ack' };
      },
    } as unknown as WakuClient;

    // Two and a half chunks, so the final short read is exercised too.
    const total = ATTACHMENT_CHUNK_BYTES * 2 + 5;
    const bytes = new Uint8Array(total).fill(7);
    const encoded = Buffer.from(bytes).toString('base64');
    let cursor = 0;
    let closed = false;

    const attachment = await uploadAttachmentInChunks(
      client,
      { uri: 'file:///big.png', name: 'big.png', mimeType: 'image/png' },
      total,
      {
        read: (length) => {
          if (cursor >= encoded.length) return null;
          const chunk = encoded.slice(cursor, cursor + length);
          cursor += chunk.length;
          return chunk;
        },
        close: () => {
          closed = true;
        },
      },
    );

    expect(closed).toBe(true);
    expect(commands[0]).toEqual({
      type: 'beginAttachmentUpload',
      name: 'big.png',
      totalBytes: total,
    });
    const appends = commands.filter((command) => command.type === 'appendAttachmentUpload');
    // Chunks are cut on base64 boundaries and read in byte budgets, so a chunk
    // is the largest whole number of 3-byte groups under 1 MiB. Assert the
    // tiling rather than a hand-computed size: each offset must be the running
    // total of what the previous chunks actually decoded to.
    expect(appends.length).toBeGreaterThan(1);
    const decoded = appends.map(
      (command) => Buffer.from(command.data as string, 'base64').byteLength,
    );
    let expectedOffset = 0;
    for (const [index, command] of appends.entries()) {
      expect(command.offset).toBe(expectedOffset);
      expectedOffset += decoded[index]!;
    }
    expect(expectedOffset).toBe(total);
    expect(commands.at(-1)).toEqual({ type: 'finishAttachmentUpload', uploadId: 'u-1' });
    expect(attachment.path).toBe('/daemon/blobs/big.png');
  });

  test('chunks a picker-supplied base64 payload instead of sending it whole', async () => {
    const commands: Array<Record<string, unknown>> = [];
    const client = {
      request: async (command: Record<string, unknown>) => {
        commands.push(command);
        if (command.type === 'beginAttachmentUpload') {
          return { type: 'attachmentUploadStarted', uploadId: 'u-4' };
        }
        if (command.type === 'finishAttachmentUpload') {
          return {
            type: 'attachmentStored',
            attachment: {
              reference: 'waku-attachment:file',
              path: '/daemon/blobs/photo.jpg',
              name: 'photo.jpg',
              isDir: false,
            },
          };
        }
        return { type: 'ack' };
      },
    } as unknown as WakuClient;

    // Two and a half chunks of bytes, handed over the way a picker does.
    const total = ATTACHMENT_CHUNK_BYTES * 2 + 3;
    const encoded = Buffer.from(new Uint8Array(total).fill(9)).toString('base64');

    await importLocalAttachment(client, {
      uri: 'file:///photo.jpg',
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: total,
      base64: `data:image/jpeg;base64,${encoded}`,
    });

    // The one-shot command is gone: even a picker payload is chunked, because a
    // single request is what took the connection down.
    expect(commands.some((command) => command.type === 'importAttachment')).toBe(false);
    const appends = commands.filter((command) => command.type === 'appendAttachmentUpload');
    expect(appends.length).toBeGreaterThan(1);
    expect(commands[0]).toEqual({
      type: 'beginAttachmentUpload',
      name: 'photo.jpg',
      totalBytes: total,
    });
    // Byte offsets, not character counts: a chunk of base64 has to advance the
    // daemon's total by what it decodes to, and the tiling has to be exact.
    expect(appends[0]!.offset).toBe(0);
    const decoded = appends.map(
      (command) => Buffer.from(command.data as string, 'base64').byteLength,
    );
    let expectedOffset = 0;
    for (const [index, command] of appends.entries()) {
      expect(command.offset).toBe(expectedOffset);
      expectedOffset += decoded[index]!;
    }
    expect(expectedOffset).toBe(total);
  });

  test('abandons the upload when a chunk fails, so no staging directory leaks', async () => {
    const commands: Array<Record<string, unknown>> = [];
    const client = {
      request: async (command: Record<string, unknown>) => {
        commands.push(command);
        if (command.type === 'beginAttachmentUpload') {
          return { type: 'attachmentUploadStarted', uploadId: 'u-2' };
        }
        if (command.type === 'appendAttachmentUpload') {
          throw new Error('daemon went away');
        }
        return { type: 'ack' };
      },
    } as unknown as WakuClient;

    const bytes = new Uint8Array(16).fill(1);
    await expect(uploadAttachmentInChunks(
      client,
      { uri: 'file:///a.png', name: 'a.png' },
      bytes.byteLength,
      { read: () => Buffer.from(bytes).toString('base64'), close: () => {} },
    )).rejects.toThrow('daemon went away');

    expect(commands.at(-1)).toEqual({ type: 'abortAttachmentUpload', uploadId: 'u-2' });
  });

  test('refuses to commit when the file shrank under the upload', async () => {
    const commands: Array<Record<string, unknown>> = [];
    const client = {
      request: async (command: Record<string, unknown>) => {
        commands.push(command);
        if (command.type === 'beginAttachmentUpload') {
          return { type: 'attachmentUploadStarted', uploadId: 'u-3' };
        }
        return { type: 'ack' };
      },
    } as unknown as WakuClient;

    let served = 0;
    await expect(uploadAttachmentInChunks(
      client,
      { uri: 'file:///a.png', name: 'a.png' },
      32,
      // Only 16 bytes ever arrive, though 32 were declared.
      {
        read: () => (served++ === 0 ? Buffer.from(new Uint8Array(16).fill(1)).toString('base64') : null),
        close: () => {},
      },
    )).rejects.toThrow('changed while it was being attached');

    expect(commands.some((command) => command.type === 'finishAttachmentUpload')).toBe(false);
  });
});

describe('attachment previews', () => {
  test('reads a stored attachment back as a data URI', async () => {
    const commands: unknown[] = [];
    const client = {
      request: async (command: unknown) => {
        commands.push(command);
        return { type: 'blobData', bytes: 'YWJj' };
      },
    } as unknown as WakuClient;

    await expect(readAttachmentImage(client, attachment())).resolves.toBe(
      'data:image/png;base64,YWJj',
    );
    expect(commands).toEqual([{
      type: 'readAttachment',
      reference: 'waku-attachment:file',
      path: '/daemon/blobs/photo.png',
    }]);
  });

  test('reads a Waku-owned blob without a path', async () => {
    const commands: unknown[] = [];
    const client = {
      request: async (command: unknown) => {
        commands.push(command);
        return { type: 'blobData', bytes: 'YWJj' };
      },
    } as unknown as WakuClient;

    await readAttachmentImage(client, attachment({ blob_reference: 'waku-blob:abc' }));
    expect(commands).toEqual([{ type: 'readBlob', reference: 'waku-blob:abc' }]);
  });

  test('refuses an attachment the daemon cannot look up', async () => {
    const client = {
      request: () => Promise.resolve({ type: 'ack' }),
    } as unknown as WakuClient;
    await expect(readAttachmentImage(client, attachment())).rejects.toThrow('Expected blobData');
    await expect(readAttachmentImage(client, attachment({ blob_reference: null }))).rejects.toThrow(
      'no daemon reference',
    );
  });

  test('maps image extensions to MIME types and falls back to png', () => {
    expect(imageMimeType('shot.PNG')).toBe('image/png');
    expect(imageMimeType('shot.jpg')).toBe('image/jpeg');
    expect(imageMimeType('shot.jpeg')).toBe('image/jpeg');
    expect(imageMimeType('clip.webp')).toBe('image/webp');
    expect(imageMimeType('clip.gif')).toBe('image/gif');
    expect(imageMimeType('archive')).toBe('image/png');
  });

  test('previews only images the decoder can rasterize', () => {
    expect(isPreviewableImage(attachment())).toBe(true);
    expect(isPreviewableImage(attachment({ is_image: false }))).toBe(false);
    expect(isPreviewableImage(attachment({ blob_reference: null }))).toBe(false);
    // RN cannot decode SVG, so it keeps the name chip instead of a blank tile.
    expect(isPreviewableImage(attachment({ name: 'logo.svg' }))).toBe(false);
  });
});
