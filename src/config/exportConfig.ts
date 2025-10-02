/**
 * Configuration for export/import functionality
 * 
 * Phase 2B: Added to prevent stack overflow and circular reference issues
 */
export const ExportConfig = {
  // Maximum nesting depth for Module ICs (prevents stack overflow)
  MAX_NESTING_DEPTH: 15,
  
  // Enable circular reference detection
  DETECT_CIRCULAR_REFS: true,
  
  // Enable verbose logging during export/import (for debugging)
  VERBOSE_LOGGING: false,
  
  // Maximum components per project (sanity check)
  MAX_COMPONENTS: 10000,
  
  // Maximum connections per project (sanity check)
  MAX_CONNECTIONS: 50000,
};
