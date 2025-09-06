# Project: Motherboard MVP

A visual task management system that transforms project complexity into an intuitive circuit board metaphor.

## 🎯 Core Concept

This MVP implements the core vision of **Project: Motherboard** - a task tracker where:
- **User Stories** become **Power Cores** (✨) - energy sources that drive your project
- **Features/Services** become **Module ICs** (⬛) - black-box components with defined interfaces  
- **Individual Tasks** become **Task Resistors** (▬▬) - atomic units of work

## ✨ Features Implemented

### Core Circuit Board Interface
- **3D-style Workbench View**: Pan, zoom, and orbit around your project circuit board
- **Component Dragging**: Drag components from the Parts Tray onto the workbench
- **Visual Status System**: 
  - TODO: Outlined components
  - IN PROGRESS: Pulsing magenta glow with energy particles
  - DONE: Solid green with power glow

### Interactive Components
- **Power Cores** (✨): User story energy sources
- **Module ICs** (⬛): Feature/service containers
- **Task Resistors** (▬▬): Individual work items

### Smart UI
- **Datasheet Panel**: Edit component properties, descriptions, and metadata
- **Real-time Status Updates**: Double-click components to cycle through states
- **Export Functionality**: Save your project as JSON
- **Help System**: Built-in guide to the circuit board metaphors

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

## 🎮 How to Use

1. **Place Components**: Drag from the Parts Tray (left panel) onto the workbench
2. **Edit Properties**: Click any component to open its datasheet panel
3. **Manage Status**: Double-click components to cycle: TODO → IN PROGRESS → DONE
4. **Navigate**: 
   - Right-click + drag to pan
   - Mouse wheel to zoom
   - Left-click + drag empty space to orbit

## 🧠 The Circuit Board Metaphor

### Visual Language
- **Energy Flow**: Completed components glow and "power" connected systems
- **Status Indicators**: Each state has distinct visual feedback
- **Typed Connections**: Future implementation will include color-coded traces for different data types

### Systems Thinking
- **Hierarchical Components**: From atomic tasks to complex features
- **Dependency Visualization**: Clear input/output pin system
- **Completion Cascades**: Finished work powers downstream components

## 🔮 Future Enhancements

The MVP provides the foundation for advanced features described in the design docs:

- **Smart Soldering Iron**: Visual trace drawing between components
- **Type Checker**: Prevent mismatched connections (Security → Database)
- **Circular Dependency Detection**: Prevent impossible logic loops
- **Real-time Collaboration**: Multi-user circuit editing
- **Advanced Animations**: Data particles flowing through traces
- **Module Expansion**: Dive into IC internals (sub-circuits)

## 🎨 Technical Stack

- **Vanilla JavaScript**: Core application logic
- **HTML5 Canvas**: Circuit board rendering
- **CSS3**: Cyberpunk-inspired UI styling
- **Vite**: Modern build tooling
- **No external dependencies**: Keeps the MVP lean and fast

## 📋 Project Status

This MVP demonstrates the core vision with:
- ✅ Interactive component placement
- ✅ Visual status management  
- ✅ Circuit board navigation
- ✅ Property editing
- ✅ Export functionality
- ⏳ Component connections (next priority)
- ⏳ Energy flow animations
- ⏳ Advanced visual effects

## 🤝 Contributing

This is a greenfield project implementing a novel approach to project management. The design documents provide the complete vision - this MVP captures the essential experience.

---

*"Build your projects like electronic circuits - watch energy flow through completed work."*
