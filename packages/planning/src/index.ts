/**
 * @wiggum/planning — barrel exports
 *
 * Pure types package. Zero runtime code. All component exports are
 * `declare const` — they exist only for TypeScript JSX validation.
 */

// Types
export type {
  MoodName,
  PresetName,
  ThemeIdentifier,
  PatternName,
  FontName,
  ShadowProfile,
  RadiusStop,
  GumDropName,
  StackComponent,
  Layout,
  FieldType,
} from './types'

// Component prop interfaces
export type {
  AppProps,
  ThemeProps,
  TypographyProps,
  AnimationProps,
  RuleProps,
  ScreenProps,
  NavProps,
  NavItemProps,
  ContentProps,
  AsideProps,
  SectionProps,
  GumDropProps,
  ColumnProps,
  FieldProps,
  ActionProps,
  SlotProps,
  CustomProps,
  SchemaProps,
  EndpointProps,
} from './components'

// JSX components (declare const — no runtime)
export {
  App,
  Theme,
  Typography,
  Animation,
  Rule,
  Screen,
  Nav,
  NavItem,
  Content,
  Aside,
  Section,
  Gumdrop,
  Column,
  Field,
  Action,
  Slot,
  Custom,
  Data,
  Schema,
  Endpoint,
} from './components'
