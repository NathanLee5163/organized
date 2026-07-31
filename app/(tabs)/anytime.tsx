import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Copy } from '@/constants/Brand';
import { Fonts } from '@/constants/Colors';
import { BrandMark } from '@/src/components/BrandMark';
import { GoalDetailSheet } from '@/src/components/GoalDetailSheet';
import { GoalScheduleSheet } from '@/src/components/GoalScheduleSheet';
import { GoalsBoard } from '@/src/components/GoalsBoard';
import { PressableScale } from '@/src/components/PressableScale';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useGoals } from '@/src/context/GoalContext';
import type { Goal } from '@/src/types/goal';
import { hapticLight } from '@/src/utils/haptics';

export default function GoalsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ new?: string }>();
  const { goals, loading, refreshGoals, addGoal } = useGoals();
  const [pulling, setPulling] = useState(false);
  const [detail, setDetail] = useState<Goal | null>(null);
  const [scheduling, setScheduling] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const openCreate = () => {
    hapticLight();
    setNewTitle('');
    setCreating(true);
  };

  useFocusEffect(
    useCallback(() => {
      void refreshGoals();
    }, [refreshGoals])
  );

  useEffect(() => {
    if (params.new === '1') {
      openCreate();
      router.setParams({ new: undefined });
    }
  }, [params.new]);

  const submitCreate = async () => {
    const title = newTitle.trim();
    if (!title) {
      Alert.alert('Name required', 'Give the goal a short name.');
      return;
    }
    const goal = await addGoal(title);
    setCreating(false);
    setNewTitle('');
    setDetail(goal);
  };

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => {
              setPulling(true);
              void refreshGoals().finally(() => setPulling(false));
            }}
            tintColor={colors.tint}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <BrandMark subtitle={Brand.tabs.anytime} compact />
          <Text style={[styles.lead, { color: colors.textSecondary }]}>{Copy.anytimeLead}</Text>
        </View>

        {loading && goals.length === 0 ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 28 }} />
        ) : (
          <GoalsBoard
            goals={goals}
            onPressGoal={setDetail}
            onScheduleGoal={setScheduling}
            onAdd={openCreate}
          />
        )}
      </ScrollView>

      {creating ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.createOverlay, { backgroundColor: colors.overlay }]}>
          <Pressable onPress={() => setCreating(false)} style={styles.createDismiss} />
          <View
            style={[
              styles.createSheet,
              {
                backgroundColor: colors.surfaceSolid,
                paddingTop: insets.top + 12,
                borderColor: colors.hairline,
              },
            ]}>
            <Text style={[styles.createTitle, { color: colors.text }]}>New goal</Text>
            <Text style={[styles.createSub, { color: colors.textSecondary }]}>
              Something that takes more than a day or two.
            </Text>
            <TextInput
              autoFocus
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Ship the portfolio site"
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={() => void submitCreate()}
              style={[
                styles.createInput,
                {
                  color: colors.text,
                  borderColor: colors.hairline,
                  backgroundColor: colors.bubble,
                },
              ]}
            />
            <View style={styles.createActions}>
              <PressableScale
                onPress={() => setCreating(false)}
                style={[styles.createCancel, { borderColor: colors.hairline }]}>
                <Text style={{ color: colors.text, fontFamily: Fonts.bodyMedium }}>Cancel</Text>
              </PressableScale>
              <PressableScale
                onPress={() => void submitCreate()}
                style={[styles.createSave, { backgroundColor: colors.tint }]}>
                <Text style={{ color: colors.onTint, fontFamily: Fonts.bodySemi }}>Add</Text>
              </PressableScale>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      <GoalDetailSheet
        goal={detail}
        visible={Boolean(detail)}
        onClose={() => setDetail(null)}
        onSchedule={(g) => setScheduling(g)}
      />
      <GoalScheduleSheet
        goal={scheduling}
        visible={Boolean(scheduling)}
        onClose={() => setScheduling(null)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
  },
  top: {
    marginBottom: 18,
    gap: 6,
  },
  lead: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  createOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-start',
    zIndex: 50,
  },
  createDismiss: {
    ...StyleSheet.absoluteFill,
  },
  createSheet: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  createTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    marginBottom: 6,
  },
  createSub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginBottom: 14,
  },
  createInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.body,
    fontSize: 16,
    marginBottom: 14,
  },
  createActions: {
    flexDirection: 'row',
    gap: 10,
  },
  createCancel: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 13,
  },
  createSave: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 13,
  },
});
