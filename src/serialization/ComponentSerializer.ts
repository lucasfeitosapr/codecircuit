import { ExportConfig } from '../config/exportConfig';
import type { ComponentBase, ModuleComponent, Connection } from '../types';

/**
 * ComponentSerializer - Handles recursive component serialization
 * 
 * Extracted from ExportImportManager (Phase 4, CC-21) to:
 * - Enable isolated testing of circular reference detection
 * - Separate serialization logic from I/O coordination
 * - Fix visitedComponents persistence bug
 * 
 * Note: This initial extraction preserves existing behavior including bugs.
 * Bug fixes will be applied in a separate commit.
 */

export interface SerializedComponent {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  title?: string;
  icon?: string;
  color?: string;
  pins?: any;
  status?: string;
  category?: string;
  description?: string;
  createdAt?: Date | string;
  internalComponents?: SerializedComponent[];
  internalConnections?: any[];
  pinMap?: any;
}

export class ComponentSerializer {
  /**
   * Serialize components including internal structures.
   * Phase 2B: Added circular reference detection and depth limiting.
   * Phase 4 (CC-21): Fixed visitedComponents persistence bug by using stateless design.
   */
  serialize(components: ComponentBase[]): SerializedComponent[] {
    // Create fresh visited set for each serialization to prevent false positives
    const visited = new Set<string>();
    return this.serializeComponents(components, 0, visited);
  }

  /**
   * Internal recursive serialization method.
   * Extracted from ExportImportManager.serializeComponents()
   * 
   * @param components - Components to serialize
   * @param depth - Current nesting depth
   * @param visited - Set of visited component IDs to detect circular references
   */
  private serializeComponents(
    components: ComponentBase[],
    depth: number,
    visited: Set<string>
  ): SerializedComponent[] {
    // Prevent infinite recursion on deep nesting (Phase 2B)
    if (depth > ExportConfig.MAX_NESTING_DEPTH) {
      if (ExportConfig.VERBOSE_LOGGING) {
        console.warn(`⚠️ Maximum nesting depth (${ExportConfig.MAX_NESTING_DEPTH}) reached, truncating deeper levels`);
      }
      return [];
    }

    return components
      .filter(component => {
        // Filter out null/undefined components
        if (!component || !component.id) return false;

        // Check for circular references (Phase 2B, fixed in CC-21)
        if (ExportConfig.DETECT_CIRCULAR_REFS && visited.has(component.id)) {
          console.warn(`⚠️ Circular reference detected for component: ${component.id}, skipping to prevent stack overflow`);
          return false;
        }

        return true;
      })
      .map(component => {
        // Mark as visited (Phase 2B, fixed in CC-21)
        visited.add(component.id);

        const serialized: SerializedComponent = {
          id: component.id,
          type: component.type,
          x: component.x,
          y: component.y,
          width: component.width,
          height: component.height,
          name: component.name,
          title: component.title,
          icon: component.icon,
          color: component.color,
          pins: component.pins,
          status: component.status,
          category: component.category,
          description: component.description,
          createdAt: component.createdAt,
        };

        // Handle Module IC internal structures
        if (component.type === 'module-ic') {
          const moduleComponent = component as ModuleComponent;

          if (moduleComponent.internalComponents) {
            // Recursively serialize with depth tracking (Phase 2B, fixed in CC-21)
            serialized.internalComponents = this.serializeComponents(
              moduleComponent.internalComponents,
              depth + 1,
              visited
            );
          }

          if (moduleComponent.internalConnections) {
            // Store raw connections - they will be serialized by ExportImportManager
            // in a post-processing step since we don't have access to serializeConnections()
            serialized.internalConnections = moduleComponent.internalConnections as any[];
          }

          if (moduleComponent.pinMap) {
            serialized.pinMap = moduleComponent.pinMap;
          }
        }

        return serialized;
      });
  }

  /**
   * Clear visited components tracking.
   * @deprecated No longer needed - serialize() creates fresh visited set automatically.
   * Kept for backward compatibility with ExportImportManager.
   */
  clearVisited(): void {
    // No-op: visited set is now created fresh in serialize()
  }
}
