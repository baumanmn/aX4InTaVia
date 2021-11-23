# aX4InTaVia

Development branch dedicated to extend the overview and button trees from 3x3 to NxN.
The extension requires the following steps:

- Dynamic canvas space assignment
- Disassemble the current state object into multiple purpose-specific state-related objects: activity-state, range-state, link-state, token-state, indicator-state
- Rework button structure
- dynamic slider allocation
- Generalise update-pipeline: Dedicated top-down and bottom-up pipelines to update tokens, indicators, etc., abstracting away from number of overviews/buttons and solely functioning on ids and parent/child links
