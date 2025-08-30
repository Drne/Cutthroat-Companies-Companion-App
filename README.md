# Cutthroat Companies Companion App

Interactive resource & contract simulation dashboard built with React + Vite. It helps track base resources, their derived products, dynamic market noise, and time‑sensitive contracts. Designed as a lightweight companion / sandbox for experimentation with production chains and economic decay.

## Key Features
- Resource Tiers & Dependencies: Automatic tier computation from component (dependency) graph.
- Live Values & History: Each resource shows animated value changes with sparkline history graph.
- Min Constraints & Overrides: Optional enforcement or temporary ignoring of minimum resource floors.
- Increment / Decrement Controls: Quick adjustment buttons per resource.
- Multiplication Table Flip: Tap / click a resource value to flip into a 1–10 multiplication table for quick scaling math; tap again to return.
- Economic Noise: Configurable random perturbations (interval toggleable) to simulate volatility.
- Decay & Pausing: Global pause plus decay timers for contracts / resources (decayTimeMs setting).
- Contracts System: Procedurally generated contracts with difficulty, resource requirements, and reward multipliers (min / max configurable).
- Contract Decay: The most recent contract can decay/expire after a set interval.
- Undo & Reset: Undo last resource change and reset all resources + contracts.
- Persistent Settings: LocalStorage backed (custom hook) so preferences survive reloads.
- Resource Connection Overlay: SVG lines visually linking dependent resources.
- Animated Layout & Presence: Framer Motion for smooth entering / leaving of contracts.
- Accessible Interactions: Keyboard navigable toggles (value flip, buttons) and ARIA labels.

## Tech Stack
- React 19 + Vite 7 (ESM, fast HMR)
- styled-components 6 (scoped styling / theming)
- framer-motion (layout + presence animations)
- @number-flow/react (performant animated numeric transitions)
- clsx (conditional class utilities)
- Lodash (utility helpers – future use / reserved)
- ESLint (flat config) + React hooks & refresh plugins

## Getting Started
1. Install dependencies:
   npm install
2. Development server:
   npm run dev
   (Open the printed local URL in your browser.)
3. Lint:
   npm run lint
4. Production build:
   npm run build
5. Preview build locally:
   npm run preview

## Project Structure (Relevant)
- src/App.jsx: Main layout & composition of resources + contracts + settings.
- src/constants/resources.js: Raw resource definitions and automatic tier calculation.
- src/components/ResourceBox.jsx: Resource display, history sparkline, value flip multiplication table, and controls.
- src/components/Contract.jsx: Single contract card logic / presentation.
- src/components/SettingsPanel.jsx: Configuration UI (noise interval, decay, contract counts, rewards, etc.).
- src/hooks/useResources.js: Core resource state, noise toggling, min handling, undo stack, bases.
- src/hooks/useContracts.js: Contract generation, completion, decay logic, difficulty scaling.
- src/hooks/useEconomicNoise.js: (If referenced) Noise effect timer abstraction.
- src/hooks/useResourceConnections.js: DOM refs + path calculations for dependency lines.
- src/hooks/useWebStorage.ts: LocalStorage abstraction (typed) providing persistent state.

## Core Concepts
### Resources
Each resource has: name, label, components (dependencies), min (floor), tier (derived). Tiers are computed recursively: tier = 1 + max(tier(components)). Base resources (no components) are Tier 1.

### Resource History & Graph
State changes push numeric snapshots into a history array (capped). Sparkline normalizes to min/max range and renders an SVG path + shaded area gradient.

### Multiplication Table
When showTable state is true for a resource, the standard value view & graph are replaced by a 2×5 grid listing (n × value = product) for n=1..10 using currency formatting.

### Contracts
Generated with variable resource requirements and reward multipliers (min–max). Difficulty setting influences scaling (passed into useContracts). Most recently added contract decays after decayTimeMs (if not paused). Completion updates resource values accordingly (logic inside useContracts / Contract component).

### Noise
Random jitter applied at configurable intervals (noiseIntervalMs). Can be toggled on/off; pause global state stops timers.

### Undo
Maintains a short stack of prior resource value snapshots. Undo reverts the last change if available.

## Custom Hooks Overview
- useResources(options): Returns grouped resources by tier, value setters, noise control, undo, ignoring min, and resource base values.
- useContracts(values,...): Manages contract lifecycle (generate, decay, complete) relative to current resource values.
- useResourceConnections(resourceList): Provides ref registration + computed SVG path data connecting component resources to their products.
- useWebStorage(key, initial): LocalStorage persisted state synchronized with React.

## Accessibility
- Interactive spans/divs have role="button", tabIndex, and keyboard handlers (Enter/Space).
- ARIA labels describe dynamic numeric content and toggle purpose.
- Focus-visible styles for clarity.

## Configuration & Tuning
| Setting                     | Description                                    |
|-----------------------------|------------------------------------------------|
| Paused                      | Stops timers (noise, decay) without resetting. |
| Noise Interval (ms)         | Frequency of random resource perturbations.    |
| Decay Time (ms)             | How long before last contract begins to decay. |
| Contract Count              | Target number of concurrent contracts.         |
| Contract Difficulty         | Difficulty scaling parameter.                  |
| Reward Min / Max Multiplier | Range for contract payout multipliers.         |
| Max Contract Resources      | Cap on distinct resources per contract.        |
| Ignore Minimums             | Temporarily disables min floor enforcement.    |

## Development Notes
- React 19 concurrent features can be adopted later if needed.
- styled-components SSR/theming not yet integrated; easy extension point.
- Graph & connection paths rely on layout; recalculated via refs (no external layout engine required).
- Currency display currently 0 fraction digits; adjust Intl.NumberFormat in ResourceBox for cents.

## Possible Future Enhancements
- Export / import saved state profiles.
- Theming (dark mode / high contrast).
- Contract filtering & sorting UI.
- Analytics panel (average fulfillment time, volatility metrics).
- WebSocket / server sync layer for shared sessions.
- Tests (unit + integration) for hooks and contract logic.
- i18n for labels & number formatting.
- Mobile responsive layout refinements (stacked view).

## Contributing
Fork, create a feature branch, commit with conventional messages, open a PR. Run lint before submitting.

## License
Currently unlicensed (private). Add a LICENSE file if distribution is intended.

## Author / Attribution
Internal companion tool project. Replace / extend this section as needed.
