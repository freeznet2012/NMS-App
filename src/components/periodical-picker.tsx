import React, { useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  Button, Checkbox, Column, HorizontalDivider, Host, IconButton, LazyColumn, ModalBottomSheet,
  OutlinedTextField, RNHostView, Row, Shape, Text, useNativeState, type TextFieldRef,
} from '@expo/ui/jetpack-compose';
import { defaultMinSize, fillMaxWidth, height, imePadding, padding, semantics, toggleable, weight } from '@expo/ui/jetpack-compose/modifiers';
import { useRegister } from '../data/store';
import { withCopyCount, type Subscription } from '../domain/model';
import { colors, sizes, spacing } from '../theme';
import { Icon, useWords } from './ui';

const shape = Shape.RoundedCorner({ cornerRadii: {
  topStart: sizes.radius, topEnd: sizes.radius, bottomStart: sizes.radius, bottomEnd: sizes.radius,
} });

export function PeriodicalPicker({ subscriptions, onApply, onDismiss }: {
  subscriptions: Subscription[];
  onApply: (subscriptions: Subscription[]) => void;
  onDismiss: () => void;
}) {
  const { periodicals, language } = useRegister();
  const t = useWords();
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const field = useRef<TextFieldRef>(null);
  const searchValue = useNativeState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set(subscriptions.map(subscription => subscription.periodicalId)));
  const quantities = new Map(subscriptions.map(subscription => [subscription.periodicalId, subscription.quantity]));
  const search = query.trim().normalize('NFC').toLocaleLowerCase();
  const available = periodicals.filter(paper => !paper.inactive || quantities.has(paper.id));
  const results = available.filter(paper => (paper.name + ' ' + paper.code).normalize('NFC').toLocaleLowerCase().includes(search));
  const count = t(`${selected.size} selected`, `${selected.size} തിരഞ്ഞെടുത്തു`);
  const searchLabel = t('Search newspapers', 'പത്രങ്ങൾ തിരയുക');
  const regularFont = language === 'ml' ? 'Malayalam' : undefined;
  const boldText = language === 'ml' ? { fontFamily: 'MalayalamBold' } : { fontWeight: 'bold' as const };
  const sheetHeight = Math.round(windowHeight * (fontScale > 1.2 || windowHeight < 660 ? 0.78 : 0.58));

  function toggle(periodicalId: string) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(periodicalId)) next.delete(periodicalId);
      else next.add(periodicalId);
      return next;
    });
  }

  function apply() {
    const retained = subscriptions.filter(subscription => selected.has(subscription.periodicalId));
    const original = new Set(subscriptions.map(subscription => subscription.periodicalId));
    const added = Array.from(selected).filter(periodicalId => !original.has(periodicalId))
      .map(periodicalId => ({ periodicalId, quantity: 1 }));
    onApply([...retained, ...added]);
  }

  return <Host style={{ position: 'absolute', width: '100%' }} pointerEvents="none">
    <ModalBottomSheet skipPartiallyExpanded containerColor={colors.surface} onDismissRequest={onDismiss}>
      <Column modifiers={[fillMaxWidth(), imePadding(), height(sheetHeight), padding(spacing.lg, 0, spacing.lg, spacing.md)]}>
        <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: spacing.sm }}
          modifiers={[fillMaxWidth(), padding(0, 0, 0, spacing.sm)]}>
          <IconButton onClick={onDismiss} modifiers={[semantics({ contentDescription: t('Close', 'അടയ്ക്കുക') })]}>
            <Text color={colors.ink} style={{ fontSize: 29 }}>×</Text>
          </IconButton>
          <Text color={colors.ink} style={{ ...boldText, fontSize: sizes.headline }} modifiers={[weight(1)]}>
            {t('Select periodicals', 'പത്രങ്ങൾ തിരഞ്ഞെടുക്കുക')}
          </Text>
          {fontScale <= 1.2 && <Text color={colors.blue} style={{ ...boldText, fontSize: sizes.secondary }}>{count}</Text>}
        </Row>
        <OutlinedTextField ref={field} value={searchValue} onValueChange={setQuery} singleLine shape={shape}
          keyboardOptions={{ autoCorrectEnabled: false, imeAction: 'search' }}
          keyboardActions={{ onSearch: () => { void field.current?.blur(); } }}
          textStyle={{ fontSize: sizes.body, color: colors.ink, fontFamily: regularFont }}
          colors={{ focusedIndicatorColor: colors.blue, unfocusedIndicatorColor: colors.divider, cursorColor: colors.blue }}
          modifiers={[fillMaxWidth(), semantics({ contentDescription: searchLabel })]}>
          <OutlinedTextField.Placeholder>
            <Text color={colors.muted} style={{ fontSize: sizes.body, fontFamily: regularFont }}>{searchLabel}</Text>
          </OutlinedTextField.Placeholder>
          <OutlinedTextField.LeadingIcon>
            <RNHostView matchContents><Icon name="search" color={colors.navigationInk} /></RNHostView>
          </OutlinedTextField.LeadingIcon>
          {query.length > 0 && <OutlinedTextField.TrailingIcon>
            <IconButton onClick={() => { searchValue.value = ''; setQuery(''); }}
              modifiers={[semantics({ contentDescription: t('Clear search', 'തിരച്ചിൽ മായ്ക്കുക') })]}>
              <Text color={colors.ink} style={{ fontSize: 26 }}>×</Text>
            </IconButton>
          </OutlinedTextField.TrailingIcon>}
        </OutlinedTextField>
        <LazyColumn modifiers={[fillMaxWidth(), weight(1)]} contentPadding={{ top: spacing.xs, bottom: spacing.xs }}>
          {results.length === 0 && <Text color={colors.muted} style={{ fontSize: sizes.body, fontFamily: regularFont }}
            modifiers={[padding(spacing.sm, spacing.md, spacing.sm, spacing.md)]}>{available.length ?
              t('No periodicals match your search.', 'തിരച്ചിലുമായി പൊരുത്തപ്പെടുന്ന പത്രങ്ങളില്ല.') :
              t('Add or activate a periodical in Manage.', 'ക്രമീകരണത്തിൽ പത്രം ചേർക്കുകയോ സജീവമാക്കുകയോ ചെയ്യുക.')}</Text>}
          {results.map(paper => {
            const checked = selected.has(paper.id);
            return <Column key={paper.id} modifiers={[fillMaxWidth()]}>
              <Row horizontalArrangement={{ spacedBy: spacing.lg }} verticalAlignment="center"
                modifiers={[fillMaxWidth(), toggleable(checked, () => toggle(paper.id), { role: 'checkbox' }),
                  defaultMinSize({ minHeight: sizes.touch }), padding(spacing.sm, spacing.xs, spacing.sm, spacing.xs)]}>
                <Checkbox value={checked} colors={{ checkedColor: colors.navigationActive,
                  uncheckedColor: colors.ink, checkmarkColor: colors.surface }} />
                <Text color={colors.ink} style={{ ...boldText, fontSize: sizes.body }} modifiers={[weight(1)]}>
                  {withCopyCount(paper.name + ' (' + paper.code + ')', checked ? quantities.get(paper.id) ?? 1 : 1)}
                </Text>
              </Row>
              <HorizontalDivider color={colors.softBorder} thickness={0.5} />
            </Column>;
          })}
        </LazyColumn>
        <Button onClick={apply} shape={shape} colors={{ containerColor: colors.blue, contentColor: colors.surface }}
          modifiers={[fillMaxWidth(), defaultMinSize({ minHeight: sizes.touch })]}>
          <Text color={colors.surface} style={{ ...boldText, fontSize: sizes.body, textAlign: 'center' }}>
            {t(`Done (${count})`, `കഴിഞ്ഞു (${count})`)}
          </Text>
        </Button>
      </Column>
    </ModalBottomSheet>
  </Host>;
}
