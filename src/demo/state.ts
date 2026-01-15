/**
 * Global application state
 */
import type { GTOData, ObjectData } from 'gto-js';

export const state = {
  gtoData: null as GTOData | null,
  selectedObject: null as ObjectData | null,
  compareObjects: {
    left: null as string | null,
    right: null as string | null
  },
  recentlyViewed: [] as string[],
  currentBreadcrumb: {
    object: null as string | null,
    component: null as string | null,
    property: null as string | null
  },
  graphZoom: 1,
  graphPan: { x: 0, y: 0 }
};

export function getGtoData(): GTOData | null {
  return state.gtoData;
}

export function setGtoData(data: GTOData): void {
  state.gtoData = data;
}

export function getSelectedObject(): ObjectData | null {
  return state.selectedObject;
}

export function setSelectedObject(obj: ObjectData | null): void {
  state.selectedObject = obj;
}
