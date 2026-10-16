import type {
  PendingPermission,
  PendingUserInput,
  UserInputAnswer,
} from '@waku/client';
import { Blocks } from '@/components/blocks';
import { Button } from 'panelui-native/components/button';
import { Checkbox } from 'panelui-native/components/checkbox';
import { RadioGroup } from 'panelui-native/components/radio-group';
import { Surface } from 'panelui-native/components/surface';
import { Textarea } from 'panelui-native/components/textarea';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppSymbol } from './app-symbol';
import { MonoFont, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tapHaptic } from '@/lib/haptics';

/**
 * The two cards an agent asks a question on, shared by both composers.
 *
 * They live here rather than in `mobile-composer.tsx` because there are two
 * composer surfaces — the app's own and PanelUI's `AIInput` composition
 * (`composer-v2.tsx`) — and the choice of composer is a build flag, not a
 * product decision. Held inside one of them, switching the flag silently
 * removed the only control that can answer a blocked agent: an OpenCode
 * `form.created` or `permission.asked` reaches the runtime, the session flips
 * to `waiting`, and nothing draws it. One module, imported by both, is what
 * keeps that from depending on which composer is mounted.
 *
 * They are inline cards above the composer rather than a sheet, matching the
 * desktop (`src/app/composer.rs`): the request belongs to the turn that raised
 * it, so it sits with the composer that will carry the answer.
 */

export function PermissionPanel({
  permission,
  onRespond,
}: {
  permission: PendingPermission;
  onRespond: (optionId: string) => Promise<void>;
}) {
  const theme = useTheme();
  const [responding, setResponding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <RequestPanel borderColor={theme.warning}>
      <View style={styles.requestHeading}>
        <AppSymbol
          name={{ ios: 'hand.raised.fill', android: 'front_hand', web: 'pan_tool' }}
          tintColor={theme.warning}
        />
        <Text style={[styles.requestTitle, { color: theme.text }]}>{permission.title}</Text>
      </View>
      {permission.detail ? (
        <ScrollView
          nestedScrollEnabled
          style={[styles.detailScroll, { backgroundColor: theme.inset, borderColor: theme.border }]}>
          <Text selectable style={[styles.requestDetail, { color: theme.textSecondary }]}>
            {permission.detail}
          </Text>
        </ScrollView>
      ) : null}
      {error && <Text style={[styles.panelError, { color: theme.danger }]}>{error}</Text>}
      <View style={styles.optionActions}>
        {permission.options.map((option) => (
          <Button
            accessibilityLabel={option.label}
            className="rounded-full"
            disabled={Boolean(responding)}
            key={option.id}
            onPress={() => {
              setResponding(option.id);
              setError(null);
              tapHaptic();
              void onRespond(option.id).catch((cause) => {
                setError(cause instanceof Error ? cause.message : String(cause));
                setResponding(null);
              });
            }}
            size="sm"
            variant={option.allow ? 'primary' : 'secondary'}>
            {responding === option.id && (
              <Blocks color={option.allow ? theme.onInverse : theme.text} />
            )}
            {option.label}
          </Button>
        ))}
      </View>
    </RequestPanel>
  );
}

export function UserInputPanel({
  input,
  onSubmit,
}: {
  input: PendingUserInput;
  onSubmit: (answers: UserInputAnswer[]) => Promise<void>;
}) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIndex(0);
    setSelections({});
    setCustomAnswers({});
    setSubmitting(false);
    setError(null);
  }, [input.requestId]);

  const question = input.questions[index];
  if (!question) return null;
  const selected = selections[question.id] ?? [];
  const custom = customAnswers[question.id] ?? '';
  const canContinue = Boolean(custom.trim() || selected.length);
  const last = index === input.questions.length - 1;

  function toggle(label: string) {
    tapHaptic();
    setCustomAnswers((values) => ({ ...values, [question.id]: '' }));
    setSelections((values) => {
      const previous = values[question.id] ?? [];
      return {
        ...values,
        [question.id]: question.multiSelect
          ? previous.includes(label)
            ? previous.filter((value) => value !== label)
            : [...previous, label]
          : [label],
      };
    });
  }

  async function advance() {
    if (!canContinue || submitting) return;
    if (!last) {
      setIndex((value) => value + 1);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(input.questions.map((item) => {
        const customValue = customAnswers[item.id]?.trim();
        return {
          questionId: item.id,
          answers: customValue ? [customValue] : selections[item.id] ?? [],
        };
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setSubmitting(false);
    }
  }

  return (
    <RequestPanel borderColor={theme.accent}>
      <View style={styles.questionHeader}>
        <Text style={[styles.questionEyebrow, { color: theme.textTertiary }]}>{question.header}</Text>
        {input.questions.length > 1 && (
          <Text style={[styles.progress, { color: theme.textTertiary }]}>
            {index + 1} of {input.questions.length}
          </Text>
        )}
      </View>
      <Text style={[styles.questionText, { color: theme.text }]}>{question.question}</Text>
      <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.questionOptions}>
        {question.multiSelect ? (
          <View className="gap-2.5">
            {question.options.map((option) => (
              <Checkbox
                checked={selected.includes(option.label)}
                description={optionDetail(option)}
                key={option.label}
                label={option.label}
                onCheckedChange={() => toggle(option.label)}
                variant="card"
              />
            ))}
          </View>
        ) : (
          <RadioGroup
            onValueChange={toggle}
            value={selected[0] ?? ''}
            variant="card">
            {question.options.map((option) => (
              <RadioGroup.Item
                description={optionDetail(option)}
                key={option.label}
                label={option.label}
                value={option.label}
              />
            ))}
          </RadioGroup>
        )}
        <Textarea
          accessibilityLabel="Custom answer"
          className="bg-muted"
          containerClassName="mt-2.5"
          onChangeText={(value) => {
            setCustomAnswers((values) => ({ ...values, [question.id]: value }));
            if (value.trim()) setSelections((values) => ({ ...values, [question.id]: [] }));
          }}
          placeholder="Write another answer…"
          rows={2}
          size="sm"
          value={custom}
        />
      </ScrollView>
      {error && <Text style={[styles.panelError, { color: theme.danger }]}>{error}</Text>}
      <View style={styles.questionActions}>
        {index > 0 ? (
          <Button
            onPress={() => setIndex((value) => value - 1)}
            size="sm"
            variant="ghost">
            Back
          </Button>
        ) : <View />}
        <Button
          accessibilityLabel={last ? 'Submit answers' : 'Next question'}
          disabled={!canContinue || submitting}
          onPress={() => void advance()}
          size="sm"
          variant="primary">
          {submitting && (
            <Blocks color={theme.onInverse} />
          )}
          {last ? 'Submit' : 'Next'}
        </Button>
      </View>
    </RequestPanel>
  );
}

/** The line under a choice, or nothing when it would only restate the label. */
function optionDetail(option: {
  label: string;
  description?: string | null;
}): string | undefined {
  return option.description && option.description !== option.label
    ? option.description
    : undefined;
}

/** The card a permission request or a question is asked on, above the composer. */
function RequestPanel({ borderColor, children }: { borderColor: string; children: ReactNode }) {
  return (
    <Surface
      className="mb-2 rounded-2xl p-3"
      padding="none"
      style={{ borderColor, borderWidth: 1 }}>
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  requestHeading: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  requestTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  detailScroll: {
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 9,
    maxHeight: 110,
    padding: 9,
  },
  requestDetail: { fontFamily: MonoFont, fontSize: 11.5, lineHeight: 17 },
  optionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 11 },
  panelError: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  questionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  questionEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.55, textTransform: 'uppercase' },
  progress: { fontSize: 11, fontWeight: '600' },
  questionText: { fontSize: 14, fontWeight: '600', lineHeight: 20, marginTop: 7 },
  questionOptions: { marginTop: 10, maxHeight: 260 },
  questionActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
});
