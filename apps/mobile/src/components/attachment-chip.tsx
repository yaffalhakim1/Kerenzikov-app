import type { MessageAttachment } from '@waku/client';
import { Button } from 'panelui-native/components/button';
import { AppPressable } from '@/components/app-pressable';
import { Chip } from 'panelui-native/components/chip';
import { Spinner } from 'panelui-native/components/spinner';
import { Text } from 'panelui-native/primitives/text';
import { useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, View } from 'react-native';

import { AppSymbol } from './app-symbol';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isPreviewableImage, readAttachmentImage } from '@/lib/attachments';
import { useDaemon } from '@/lib/daemon-context';

const TILE = 76;

/**
 * The upload indicator on a file still being handed to the daemon.
 *
 * The wire protocol stores an attachment in one request and reports no byte
 * progress, so this is deliberately indeterminate — a turning ring, not a
 * fabricated percentage. PanelUI's `Spinner` is that ring: it animates on the
 * UI thread, and under the platform's reduce-motion setting it pulses in place
 * rather than holding still, which is the one thing a stalled-looking spinner
 * must not do.
 *
 * `size` survives from the hand-rolled arc so call sites keep their density;
 * it lands on the nearest step of the spinner's own scale.
 */
export function UploadRing({ size = 18 }: { size?: number }) {
  return (
    <Spinner
      className={size <= 16 ? 'h-3.5 w-3.5' : 'h-4 w-4'}
      label="Uploading"
    />
  );
}

/** One attachment in a message: an inline preview when it is an image the
 * daemon can hand back, otherwise a PanelUI chip carrying the name. */
export function AttachmentChip({ attachment }: { attachment: MessageAttachment }) {
  const theme = useTheme();
  const daemon = useDaemon();
  const [source, setSource] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const { is_dir, is_image, mention, name, path } = attachment;
  const reference = attachment.blob_reference;
  const client = daemon.client;
  const connected = daemon.phase === 'connected';
  const previewable = isPreviewableImage(attachment);

  // Depend on the fields, never the attachment object: every stream commit
  // deep-clones the session, so an object dependency would re-read the blob
  // on each frame.
  useEffect(() => {
    if (!previewable || !reference || !client || !connected) {
      setSource(null);
      return;
    }
    let active = true;
    void readAttachmentImage(client, {
      blob_reference: reference,
      is_dir,
      is_image,
      mention,
      name,
      path,
    })
      .then((value) => { if (active) setSource(value); })
      .catch(() => { if (active) setSource(null); });
    return () => { active = false; };
  }, [client, connected, is_dir, is_image, mention, name, path, previewable, reference]);

  if (source) {
    return (
      <>
        // Not a PanelUI control: this is a bare tappable image with no chrome
        // of its own. Every PanelUI pressable draws a surface, which would put
        // a card behind the picture.
        <AppPressable
          accessibilityLabel={`Preview ${attachment.name}`}
          accessibilityRole="button"
          onPress={() => setPreviewing(true)}
          style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.7 : 1 }]}>
          <Image
            resizeMode="cover"
            source={{ uri: source }}
            style={[styles.image, { backgroundColor: theme.inset }]}
          />
        </AppPressable>
        <Modal
          animationType="fade"
          onRequestClose={() => setPreviewing(false)}
          visible={previewing}>
          <View style={[styles.viewer, { backgroundColor: theme.background }]}>
            <Image
              accessibilityLabel={attachment.name}
              resizeMode="contain"
              source={{ uri: source }}
              style={styles.viewerImage}
            />
            <Button
              accessibilityLabel="Close preview"
              className="absolute end-4 top-4"
              onPress={() => setPreviewing(false)}
              size="icon"
              variant="ghost"
            >
              <AppSymbol
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={15}
                tintColor={theme.text}
              />
            </Button>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <Chip
      className="max-w-44"
      size="sm"
      start={
        <AppSymbol
          name={{
            ios: is_image ? 'photo' : 'doc',
            android: is_image ? 'image' : 'description',
            web: 'description',
          }}
          size={12}
          tintColor={theme.textSecondary}
        />
      }>
      {/* An element rather than a bare string: the chip's own label cannot be
          told to stay on one line, and an attachment name is the one thing
          here that can outrun the pill. */}
      <Text className="shrink text-secondary-foreground" numberOfLines={1}>
        {attachment.name}
      </Text>
    </Chip>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: Radius.small, height: TILE, overflow: 'hidden', width: TILE },
  image: { height: TILE, width: TILE },
  viewer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  viewerImage: { height: '80%', width: '100%' },
  close: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    top: 54,
    width: 32,
  },
});
