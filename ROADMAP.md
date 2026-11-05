# Roadmap

CodeCircuit is an ongoing project. This is what's planned, roughly in order. Items move as I learn from using the tool on my own codebases.

## 1. Stability (now)

The core works, but some known issues get in the way of real use.

- [ ] **Nested Module ICs:** content is lost when going back from three or more levels, and is unstable at two levels.
- [ ] **Frozen components:** components moved outside their original area stop responding (no details panel, pasted copies come out frozen) until a reload or undo/redo.
- [ ] **Deep export/import:** second-level components freeze after importing a nested project.
- [ ] End-to-end tests for nesting and moving, through the real UI path (tray drag, double-click, Back button).

## 2. Persistence

One clear layer for what gets saved, when, and which view or nesting level you're in.

- [ ] Rename and status changes survive a reload without having to move the component first
- [ ] Reload and Reset work correctly inside a Module IC
- [ ] Component name counter restarts after Reset

## 3. Interaction

Canvas interaction as its own layer (selection, drag, snap, commands), with the missing features on top.

- [ ] Multi-select and multi-delete
- [ ] Snap-to-grid
- [ ] Split the input coordinator into smaller mouse, keyboard and file handlers

## 4. Test and code health

- [ ] Performance stress test that doesn't fail on slower machines
- [ ] Spatial index (quadtree) catching components at exact boundary coordinates
- [ ] Resolve the open `it.todo` tests
- [ ] Clean lint run

## 5. Component model

A design pass on what each part means for an architecture tool.

- [ ] Revisit the five current types (Power Core, Module IC, Task Resistor, Decision Point, Gateway): names and roles
- [ ] Candidate new parts: Transformer, Aggregator, Distributor
- [ ] A "blueprint" state before TODO, for parts that are designed but not built yet
- [ ] Implementation tasks inside a component: a new type, or a property of existing ones

## 6. Import a codebase as a circuit

The next big feature: point CodeCircuit at a real TypeScript project and get its structure as a board.

- [ ] Module graph parser: read a TypeScript project and produce its modules and imports
- [ ] Visualization: turn that graph into Module ICs and connections, with automatic layout
- [ ] Link-state markers: show which parts of a board are linked to real code and which are still plans

## Later

- A small backend to store and serve projects
- "Workbench" mode: sketch behavior first as flowcharts, then link each part to real code when it exists
- An optional 3D view on top of the 2D board

## Contributing

Ideas and bug reports are welcome as GitHub issues.
