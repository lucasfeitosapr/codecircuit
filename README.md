# CodeCircuit 2D _(Evolved from Project: Motherboard)_

> **Software Architecture Visualization IDE for Developers**  
> Transform complex codebases into intuitive circuit boards where code relationships flow like energy through interconnected components.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Test Coverage](https://img.shields.io/badge/tests-10%20passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![Phase](https://img.shields.io/badge/phase-Architecture%20Transformation-orange)

---

## 🎯 **Project Status** _(Updated: Sept 17, 2025)_

**Current Phase:** Strategic Pivot - Project Management → Software Architecture Tool  
**Build:** ✅ Production Ready Foundation (`npm run build` works)  
**Tests:** ✅ 10/10 tests passing  
**Code Quality:** ✅ Zero linting errors  
**Location:** `./`

### Evolution Status

- **Foundation:** ✅ Complete (Canvas rendering, component system, hierarchical navigation)
- **Project Management Mode:** ✅ Fully functional (Power Cores, Module ICs, Task Resistors)
- **Architecture Transformation:** 🎯 **ACTIVE DEVELOPMENT** (Service Cores, Class ICs, Function Components)

---

## 📸 **Current Visual State**

### Main Board View

![Main Board](image-1)
_Main circuit board showing Power Core connected to multiple Module ICs with clean 90-degree routing_

### Schematic View

![Schematic View](image-2)
_Inside Module IC 2 showing internal Task Resistors with hierarchical navigation_

**Key Visual Features Implemented:**

- ✅ Cyberpunk aesthetic with neon green circuit board styling
- ✅ Clean component placement with proper spacing
- ✅ 90-degree orthogonal connection routing
- ✅ Hierarchical navigation (notice "Back" button in schematic view)
- ✅ Color-coded component categories in left sidebar
- ✅ Smooth 60fps rendering with FPS counter

---

## 🧠 **Core Concept Evolution**

### **Dual-Mode Vision: Project Management + Software Architecture**

**Original Circuit Board Metaphor (Project Mode):**

- **Power Cores** = User Stories _(energy sources)_
- **Module ICs** = Features/Services _(black-box components with interfaces)_
- **Task Resistors** = Individual Tasks _(atomic work units)_
- **Traces** = Dependencies _(typed energy pathways)_

**New Code Architecture Metaphor (Code Mode):**

- **Service Cores** = Microservices/Applications _(system energy sources)_
- **Class ICs** = Files/Modules/Classes _(code components with defined APIs)_
- **Function Components** = Methods/Functions _(executable logic units)_
- **Data Traces** = API calls, imports, data flow _(typed data pathways)_

**Key Innovation:** Hierarchical "Enter Schematic" system works for both modes - zoom into Module ICs for project tasks OR into Class ICs for function implementations.

---

## 🏗️ **Technical Architecture**

### Tech Stack

```
Build System:  Vite (localhost:3000)
Frontend:      Vanilla TypeScript, HTML5 Canvas, CSS3
Rendering:     2D Canvas with camera system (pan/zoom/orbit)
Styling:       Cyberpunk aesthetic with neon colors
```

### Project Structure

```
motherboard-mvp/
├── package.json          # Vite build + dependencies
├── index.html            # UI structure with cyberpunk styling
├── main.ts              # Core application logic (~1800+ lines)
├── datasheet.ts         # Component inspector UI
├── tests/               # Test suite (10 tests)
├── vite.config.js       # Build configuration
├── README.md            # This file
├── ROADMAP.md           # Development phases (moved)
├── Tasks.md             # Detailed task tracking (moved)
└── COPILOT_MEMORY.md    # Project memory/notes (moved)
```

### Core Application Class: `MotherboardApp`

- **View Management:** Multi-level navigation with view stack
- **Component System:** 3 component types with typed pins
- **Connection Engine:** 90-degree routing with type validation
- **Export/Import:** Deep serialization including internal structures
- **Pin Configuration:** Dynamic pin management UI

---

## 🚀 **Quick Start**

```bash
# Development
npm install
npm run dev          # Start localhost:3000

# Production
npm run build        # Creates dist/ folder
npm run preview      # Preview production build

# Testing
npm test            # Run test suite
npm run lint        # Check code quality
```

### Key Interactions

- **Place Components:** Drag from component tray
- **Create Connections:** Click source pin → click target pin
- **Change States:** Right-click components to cycle TODO → IN_PROGRESS → DONE
- **Enter Module ICs:** Double-click to view internal schematic
- **Configure Pins:** Select Module IC → click "Configure Pins" in datasheet
- **Export Project:** File menu → Export (saves as .json)

---

## 📋 **Strategic Development Roadmap**

### **🎯 Current Focus: Phase 1 - Living Blueprint Foundation**

**Timeline:** 4-6 weeks | **Status:** Ready to Begin

#### **P1.1: Enhanced State Machine** _(Week 1-2)_ 🔴 **CRITICAL**

- [ ] Add DEFINED state to component state machine
- [ ] Implement wireframe/blueprint rendering for DEFINED components
- [ ] Create state transition system: DEFINED → TODO → IN_PROGRESS → DONE
- [ ] Add visual state indicators and gradual filling animations

#### **P1.2: Implementation Task Integration** _(Week 2-3)_ 🟠 **HIGH**

- [ ] Create ImplementationTask component type
- [ ] Link implementation tasks to parent architectural components
- [ ] Implement task breakdown workflow (double-click → add tasks)
- [ ] Add parent-child state propagation

#### **P1.3: Blueprint Workflow UI** _(Week 3-4)_ 🟠 **HIGH**

- [ ] Add "Blueprint Mode" toggle in UI
- [ ] Create component placement in DEFINED state by default
- [ ] Implement "Add Implementation Tasks" workflow
- [ ] Create smooth transitions between architect and developer views

#### **P1.4: Enhanced Visual System** _(Week 4-6)_ 🟡 **MEDIUM**

- [ ] Implement dual-layer rendering (blueprint + implementation)
- [ ] Add gradual filling animations for state transitions
- [ ] Create blueprint-style connection traces (dashed lines)
- [ ] Enhanced energy flow for different states

### **Future Phases:**

- **Phase 2:** Intelligent Data Representation _(3-4 weeks)_
- **Phase 3:** Code Integration _(4-6 weeks)_
- **Phase 4:** Team Collaboration _(3-4 weeks)_

---

## 🧪 **Testing & Quality**

### Current Test Coverage

```
✅ Component creation and placement (2 tests)
✅ Connection system (2 tests)
✅ Export/import round-trip (6 tests)
✅ Pin configuration system (included in component tests)
```

### Code Quality Metrics

- **Lines of Code:** ~1,800 TypeScript
- **TypeScript Coverage:** 100%
- **Linting Errors:** 0
- **Build Time:** ~400ms
- **Bundle Size:** ~38KB (gzipped: ~10KB)

---

## 🎨 **Visual Design System**

### Component Types & Colors

- **Power Cores:** Golden energy source with pulsing animation
- **Module ICs:** Blue rectangular components with configurable pins
- **Task Resistors:** Colorful resistor-style components with zigzag pattern

### Energy Types (Typed Power Grid)

- **Security:** Yellow energy _(Authentication, Permissions)_
- **Database:** Blue energy _(Storage, Retrieval)_
- **Logic:** Purple energy _(Business Rules, Algorithms)_
- **Interface:** White/Cyan energy _(API, UI)_

### Component States

- **TODO:** Outlined components
- **IN_PROGRESS:** Pulsing animation
- **DONE:** Solid green fill
- **BLOCKED:** _(Future)_ Red glitching overlay

---

## 🔧 **Key Features Implemented**

### Core Functionality

- [x] **Component Placement System** - Drag-and-drop from component tray
- [x] **90-Degree Connection Routing** - Clean orthogonal traces
- [x] **State Management** - Right-click to cycle component states
- [x] **Camera Controls** - Pan, zoom, orbit with smooth animations
- [x] **Component Inspector** - Slide-out datasheet panel

### Advanced Features

- [x] **Hierarchical Navigation** - Enter/exit schematic views
- [x] **Dynamic Pin Configuration** - Runtime pin management
- [x] **Deep Export/Import** - Preserve full project structure
- [x] **Type System Foundation** - Energy-typed connections
- [x] **Professional Build System** - TypeScript, linting, testing

### UI/UX Polish

- [x] **Cyberpunk Aesthetic** - Neon colors, circuit board styling
- [x] **Smooth Animations** - State transitions and camera movement
- [x] **Responsive Design** - Works across different screen sizes
- [x] **Professional Tooling** - ESLint, Prettier, automated testing

---

## 📊 **Project Metrics**

### Completed Tasks: **47+** major features and fixes

### Active Issues: **0** critical bugs

### Next Milestone: Phase 2 implementation (connection validation)

### Estimated Completion: 2-3 weeks for Phase 2

---

## 🎯 **Success Criteria**

### MVP Success _(✅ Complete)_

- [x] Build system producing clean bundles
- [x] Comprehensive test suite with >90% coverage
- [x] Zero linting errors, consistent formatting
- [x] Core features working (placement, connections, export/import)
- [x] Dynamic pin configuration for Module ICs

### Phase 1 Success _(✅ Complete)_

- [x] Smooth schematic navigation
- [x] Pin mapping UI fully functional
- [x] Professional code quality and build system
- [x] Enhanced export/import with nested structures

### Phase 2 Success _(🎯 Next Target)_

- [ ] Connection type validation preventing invalid connections
- [ ] Visual error feedback system
- [ ] Smooth transitions and professional animations
- [ ] Positive feedback from external testing

---

## 🚧 **Known Issues & TODOs**

### Immediate (This Week)

- [ ] Implement connection type validation (Phase 2.1)
- [ ] Add visual error feedback for invalid connections
- [ ] Create smooth schematic view transitions
- [ ] Update documentation with latest features

### Short Term (Next 2 Weeks)

- [ ] Circular dependency detection system
- [ ] Dead code identification and warnings
- [ ] Architectural health dashboard
- [ ] Performance optimization for complex projects

### Future Considerations

- [ ] Team collaboration features
- [ ] Advanced component states (BLOCKED, fault cascade)
- [ ] Module template system
- [ ] Export to other formats (PNG, PDF)

---

## 📁 **File Organization**

### Important Files to Track

- **`main.ts`** - Core application logic, main development file
- **`Tasks.md`** - Detailed task completion tracking
- **`ROADMAP.md`** - Strategic development phases
- **`COPILOT_MEMORY.md`** - Project context and architecture notes

### Generated/Build Files _(Don't track changes)_

- `dist/` folder - Build output
- `node_modules/` - Dependencies
- `.vscode/` - Editor settings

---

## 💡 **Development Notes & Future Considerations**

### Key Architectural Decisions

- **Canvas-based rendering** for smooth performance and custom visuals
- **Component-based architecture** with clear separation of concerns
- **TypeScript** for type safety and better developer experience
- **Vite build system** for fast development and optimized production builds

### Performance Considerations

- Maintains 60fps even with 50+ components
- Efficient camera system with viewport culling
- Optimized connection rendering with cached paths
- Memory management for large project hierarchies

### Code Visualization Challenges & Solutions

**Complex Code Relationships Identified:**

- **Function calls** (A calls B) - directional flow
- **Data passing** (parameters and arguments) - typed connections
- **Return flows** (what comes back) - bidirectional traces
- **Class inheritance** (hierarchical relationships) - parent-child structure
- **Module dependencies** (horizontal connections) - cross-module linking

**Potential Architecture for Code Visualization:**

- **Files as Module ICs** - Each file becomes a black-box component
- **Functions as Mini-ICs** - Functions within files become smaller components
- **Data transformation representation** - Visual indication of input vs output types
- **Conditional branches** - Visual branching in trace routing
- **Async operations** - Special trace styling for promises/callbacks

**Example: User Info Flow**

```
user.controller.ts [Module IC]
├── getUserById() [Function IC]
├── updateUser() [Function IC]
└── deleteUser() [Function IC]
```

_Internal traces show data flow between functions, external pins connect to other modules_

### Connection Routing Complexity

Current 90-degree routing works well for project management flows, but code relationships may need:

- **Bidirectional traces** - Data flows both ways
- **Multi-layer routing** - Different types of relationships on different visual layers
- **Conditional routing** - Traces that branch based on logic conditions
- **Async routing** - Visual distinction for synchronous vs asynchronous flows

---

_Last Updated: September 17, 2025_  
_Next Review: September 24, 2025_
