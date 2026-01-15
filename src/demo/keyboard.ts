/**
 * Keyboard shortcuts handling
 */
import { getGtoData, markModified } from './state';
import { toggleTheme } from './theme';
import { expandAll, collapseAll } from './tree';
import { switchToTab, renderTimelinePanel, navigateAnnotationFrame } from './panels';

export function showShortcutsModal(): void {
  document.getElementById('shortcuts-modal')?.classList.add('visible');
}

export function hideShortcutsModal(): void {
  document.getElementById('shortcuts-modal')?.classList.remove('visible');
}

export function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in input
    if ((e.target as Element).tagName === 'INPUT' ||
        (e.target as Element).tagName === 'SELECT' ||
        (e.target as Element).tagName === 'TEXTAREA') {
      return;
    }

    const modal = document.getElementById('shortcuts-modal');
    if (modal?.classList.contains('visible')) {
      if (e.key === 'Escape') hideShortcutsModal();
      return;
    }

    const gtoData = getGtoData();
    if (!gtoData) return;

    switch (e.key) {
      case '?':
        showShortcutsModal();
        break;
      case '/':
        e.preventDefault();
        document.getElementById('search-box')?.focus();
        break;
      case 't':
      case 'T':
        toggleTheme();
        break;
      case 'e':
      case 'E':
        expandAll();
        break;
      case 'c':
      case 'C':
        if (!e.ctrlKey && !e.metaKey) collapseAll();
        break;
      case '1':
        switchToTab('protocols');
        break;
      case '2':
        switchToTab('details');
        break;
      case '3':
        switchToTab('sources');
        break;
      case '4':
        switchToTab('timeline');
        break;
      case '5':
        switchToTab('annotations');
        break;
      case '6':
        switchToTab('graph');
        break;
      case '7':
        switchToTab('compare');
        break;
      case '8':
        switchToTab('json');
        break;

      // Frame navigation (when timeline or annotations panel is active)
      case 'ArrowLeft':
        if (isTimelinePanelActive()) {
          e.preventDefault();
          navigateTimelineFrame(-1);
        }
        break;
      case 'ArrowRight':
        if (isTimelinePanelActive()) {
          e.preventDefault();
          navigateTimelineFrame(1);
        }
        break;
      case 'Home':
        if (isTimelinePanelActive()) {
          e.preventDefault();
          jumpToFirstFrame();
        }
        break;
      case 'End':
        if (isTimelinePanelActive()) {
          e.preventDefault();
          jumpToLastFrame();
        }
        break;
    }
  });
}

/**
 * Check if timeline or annotations panel is currently active
 */
function isTimelinePanelActive(): boolean {
  const timelinePanel = document.getElementById('panel-timeline');
  const annotationsPanel = document.getElementById('panel-annotations');
  return timelinePanel?.classList.contains('visible') || annotationsPanel?.classList.contains('visible') || false;
}

/**
 * Navigate timeline by delta frames
 */
function navigateTimelineFrame(delta: number): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const session = gtoData.objects.find(obj => obj.protocol === 'RVSession');
  if (!session) return;

  const sessionComp = session.components.session?.properties;
  if (!sessionComp?.currentFrame || !sessionComp?.range) return;

  const range = (sessionComp.range.data?.[0] as number[]) || [1, 100];
  const currentFrame = (sessionComp.currentFrame.data?.[0] as number) || range[0];
  const newFrame = Math.max(range[0], Math.min(range[1] - 1, currentFrame + delta));

  if (newFrame !== currentFrame) {
    sessionComp.currentFrame.data = [newFrame];
    markModified();
    renderTimelinePanel();

    // Also navigate annotations if on that panel
    const annotationsPanel = document.getElementById('panel-annotations');
    if (annotationsPanel?.classList.contains('visible')) {
      navigateAnnotationFrame(delta);
    }
  }
}

/**
 * Jump to first frame
 */
function jumpToFirstFrame(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const session = gtoData.objects.find(obj => obj.protocol === 'RVSession');
  if (!session) return;

  const sessionComp = session.components.session?.properties;
  if (!sessionComp?.currentFrame || !sessionComp?.range) return;

  const range = (sessionComp.range.data?.[0] as number[]) || [1, 100];
  const currentFrame = (sessionComp.currentFrame.data?.[0] as number) || range[0];

  if (currentFrame !== range[0]) {
    sessionComp.currentFrame.data = [range[0]];
    markModified();
    renderTimelinePanel();
  }
}

/**
 * Jump to last frame
 */
function jumpToLastFrame(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const session = gtoData.objects.find(obj => obj.protocol === 'RVSession');
  if (!session) return;

  const sessionComp = session.components.session?.properties;
  if (!sessionComp?.currentFrame || !sessionComp?.range) return;

  const range = (sessionComp.range.data?.[0] as number[]) || [1, 100];
  const lastFrame = range[1] - 1; // Exclusive end
  const currentFrame = (sessionComp.currentFrame.data?.[0] as number) || range[0];

  if (currentFrame !== lastFrame) {
    sessionComp.currentFrame.data = [lastFrame];
    markModified();
    renderTimelinePanel();
  }
}
