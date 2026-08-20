export type GraphPoint = { x: number; y: number };

export type GraphBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

export type MinimapCamera = {
  /** Graph-space center of the viewport. */
  x: number;
  y: number;
  /** Canvas zoom (screen px per graph unit). */
  k: number;
};

export type MinimapViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function boundsFromPoints(points: Array<GraphPoint | null | undefined>): GraphBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;
  for (const point of points) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    count += 1;
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  if (count === 0) return null;
  if (minX === maxX) {
    minX -= 80;
    maxX += 80;
  }
  if (minY === maxY) {
    minY -= 80;
    maxY += 80;
  }
  // Include typical node half-box so chips aren’t clipped at the edge.
  const nodePad = 48;
  minX -= nodePad;
  maxX += nodePad;
  minY -= nodePad;
  maxY += nodePad;
  const padX = (maxX - minX) * 0.06;
  const padY = (maxY - minY) * 0.06;
  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function worldToMinimap(
  point: GraphPoint,
  bounds: GraphBounds,
  miniWidth: number,
  miniHeight: number
): GraphPoint {
  const scale = Math.min(miniWidth / bounds.width, miniHeight / bounds.height);
  const usedW = bounds.width * scale;
  const usedH = bounds.height * scale;
  const ox = (miniWidth - usedW) / 2;
  const oy = (miniHeight - usedH) / 2;
  return {
    x: ox + (point.x - bounds.minX) * scale,
    y: oy + (point.y - bounds.minY) * scale
  };
}

export function minimapToWorld(
  point: GraphPoint,
  bounds: GraphBounds,
  miniWidth: number,
  miniHeight: number
): GraphPoint {
  const scale = Math.min(miniWidth / bounds.width, miniHeight / bounds.height);
  const usedW = bounds.width * scale;
  const usedH = bounds.height * scale;
  const ox = (miniWidth - usedW) / 2;
  const oy = (miniHeight - usedH) / 2;
  return {
    x: bounds.minX + (point.x - ox) / scale,
    y: bounds.minY + (point.y - oy) / scale
  };
}

/** Visible world rectangle given canvas size and camera center/zoom. */
export function viewportInWorld(
  camera: MinimapCamera,
  viewWidth: number,
  viewHeight: number
): MinimapViewport {
  const k = camera.k > 0 ? camera.k : 1;
  const width = viewWidth / k;
  const height = viewHeight / k;
  return {
    x: camera.x - width / 2,
    y: camera.y - height / 2,
    width,
    height
  };
}

/** Convert d3-zoom screen transform into world-space camera center. */
export function cameraFromZoomTransform(
  transform: { x: number; y: number; k: number },
  viewWidth: number,
  viewHeight: number
): MinimapCamera {
  const k = transform.k > 0 ? transform.k : 1;
  return {
    k,
    x: (viewWidth / 2 - transform.x) / k,
    y: (viewHeight / 2 - transform.y) / k
  };
}

export type MinimapFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Keep the viewport rectangle inside the mini canvas with a usable minimum size. */
export function clampMinimapFrame(
  frame: MinimapFrame,
  miniWidth: number,
  miniHeight: number,
  minSize = 10
): MinimapFrame {
  const width = Math.min(miniWidth, Math.max(minSize, frame.width));
  const height = Math.min(miniHeight, Math.max(minSize, frame.height));
  const x = Math.min(Math.max(0, frame.x), miniWidth - width);
  const y = Math.min(Math.max(0, frame.y), miniHeight - height);
  return { x, y, width, height };
}
