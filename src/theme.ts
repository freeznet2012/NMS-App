export const colors = {
  ink: '#171A1D', blue: '#194FA3', selected: '#E8F0FF', surface: '#FFFFFF',
  divider: '#D9DEE5', paid: '#176B41', error: '#A52721', muted: '#52606D', secondary: '#F1F3F6',
  canvas: '#FAFAFC', panel: '#EBF0FC', softBorder: '#E1E4EB', darkBlue: '#122653',
  disabledText: '#697586',
  navigationActive: '#0956DA', navigationInk: '#27334A',
  paidSurface: '#EAF7EE', dueSurface: '#FDECEB', warning: '#885100', warningSurface: '#FFF3DA',
};
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, section: 40, hero: 48 };
export const sizes = { title: 22, pageTitle: 28, headline: 20, body: 16, secondary: 14, amount: 32, welcome: 32, icon: 24, touch: 48, radius: 8, panelRadius: 16 };

const identityColors = [
  { background: '#DCEAFF', ink: '#174FA3' },
  { background: '#E9DEFF', ink: '#5C36B5' },
  { background: '#D7F2E6', ink: '#1A694B' },
  { background: '#FFF0D5', ink: '#825100' },
  { background: '#FBE1E5', ink: '#A5233A' },
];

export function identityColor(id: string) {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return identityColors[hash % identityColors.length];
}
