# Legacy Feature Flag & Performance Configuration System

**Archived**: 2026-01-23 (Phase 2 - Technical Debt Consolidation)
**Replacement**: `UnifiedFeatureConfig` + `UnifiedFeatureManager`

---

## Files Archived

1. **featureFlags.ts** - Legacy UI feature flags (12 flags)
2. **performanceConfig.ts** - Legacy performance settings (40+ parameters)
3. **FeatureFlagManager.ts** - Runtime manager for featureFlags
4. **__mocks__/FeatureFlagManager.ts** - Test mock

---

## Why Archived

### Problem
Three parallel configuration systems caused confusion and maintenance overhead:
- **featureFlags.ts**: UI toggles with runtime manager
- **performanceConfig.ts**: Static exports, NO runtime control, 118 references
- **UnifiedFeatureConfig.ts**: Target architecture (underutilized)

**Critical Issue**: `isNewRendererEnabled()` was hardcoded to `true`, making the legacy renderer fallback path untested.

### Solution
Consolidated all three systems into:
- **UnifiedFeatureConfig.ts**: Single source of truth for all flags
- **UnifiedFeatureManager.ts**: Runtime manager with event-driven updates
- **FeatureFlagAdapter.ts** (temporary): Backward compatibility during migration

---

## Migration Summary

**Files Migrated**: 51 files across codebase
- Core rendering: LayeredRenderer, LegacyRenderer, ConnectionRenderer, etc.
- Utilities: Logger, PerformanceStatsCollector
- UI: FeatureTogglePanel, rendererHelpers
- Tests: All test mocks updated

**Test Results**: 836/845 passing (99.0%) - improved from 835/845 baseline

**Key Improvements**:
1. ✅ Runtime configurability for all settings
2. ✅ Single source of truth eliminates config drift
3. ✅ Event-driven updates for reactive UI
4. ✅ Type-safe access with full IDE autocomplete
5. ✅ Preset support (baseline, performanceMax, visualRich)

---

## New Architecture

### Usage Example
```typescript
// OLD WAY (archived):
import { PerformanceConfig } from '../config/performanceConfig';
if (PerformanceConfig.ENABLE_CONNECTION_CULLING) { ... }

// NEW WAY (current):
import { getUnifiedFeatureManager } from '../core/UnifiedFeatureManager';
const config = getUnifiedFeatureManager().getConfig();
if (config.performance.connectionCulling) { ... }
```

### Flag Categories
```typescript
UnifiedFeatureConfig {
  performance: {
    useLayeredRenderer: boolean  // NEW! Runtime switchable renderer
    dirtyFlagRendering: boolean
    connectionCulling: boolean
    // ... 20+ performance flags
  }
  ui: {
    alignmentGuides: boolean
    selectionHandles: boolean
    // ... 6 UI feature toggles
  }
  system: {
    autoSave: boolean
  }
  debug: {
    debugMode: boolean
    showFpsCounter: boolean
    // ... 5 debug flags
  }
  tuning: {
    connectionCullingMargin: number
    targetFpsInteractive: number
    // ... 40+ tuning parameters
  }
}
```

---

## References

- **New Config**: `src/config/UnifiedFeatureConfig.ts`
- **Manager**: `src/core/UnifiedFeatureManager.ts`
- **Migration Plan**: `docs/LEGACY_ELIMINATION_MIGRATION_PLAN.md` (if exists)
- **Architecture Docs**: `docs/ARCHITECTURAL_EVOLUTION.md`

---

## Restoration (if needed)

If you need to restore these files temporarily:
```bash
# From the archive directory
cp featureFlags.ts ../../config/
cp performanceConfig.ts ../../config/
cp FeatureFlagManager.ts ../../core/
cp __mocks__/FeatureFlagManager.ts ../../core/__mocks__/
```

**Note**: Not recommended - the new unified system is superior in every way.
