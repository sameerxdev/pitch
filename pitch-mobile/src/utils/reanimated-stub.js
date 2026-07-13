/**
 * Stub for react-native-reanimated.
 * Used by react-native-css-interop (NativeWind) and react-native-gesture-handler
 * which both import reanimated internally. Since we removed the native module to
 * stay compatible with Expo Go, all consumers get safe no-ops instead.
 */
const makeMutable = (initialValue) => ({
  value: initialValue,
  modify: () => {},
  addListener: () => () => {},
  removeListener: () => {},
  _isReanimatedSharedValue: true,
});

const noop = () => {};
const noopAnimation = (value) => value;
const identity = (fn) => fn;

module.exports = {
  // Core shared values & animation builders
  makeMutable,
  useSharedValue: (initial) => makeMutable(initial),
  useAnimatedStyle: () => ({}),
  useAnimatedProps: () => ({}),
  useAnimatedRef: () => ({ current: null }),
  useAnimatedScrollHandler: () => ({}),
  useAnimatedGestureHandler: () => ({}),
  useDerivedValue: (fn) => makeMutable(fn()),
  useAnimatedReaction: noop,

  // Animation helpers
  withTiming: noopAnimation,
  withSpring: noopAnimation,
  withDecay: noopAnimation,
  withDelay: (_delay, animation) => animation,
  withRepeat: noopAnimation,
  withSequence: (...animations) => animations[animations.length - 1],

  // Worklet / event utilities
  runOnJS: identity,
  runOnUI: identity,
  isWorklet: () => false,
  makeRemote: (obj) => obj,
  useEvent: (handler) => handler,
  useHandler: (handlers) => ({ context: {}, doDependenciesDiff: () => false, ...handlers }),

  // Component wrapper
  createAnimatedComponent: (Component) => Component,
  default: { createAnimatedComponent: (Component) => Component },

  // Easing
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    bezier: () => (t) => t,
    in: identity,
    out: identity,
    inOut: identity,
  },

  // Misc
  interpolate: (value, input, output) => output[0] ?? 0,
  interpolateColor: () => "transparent",
  measure: () => null,
  scrollTo: noop,
};
