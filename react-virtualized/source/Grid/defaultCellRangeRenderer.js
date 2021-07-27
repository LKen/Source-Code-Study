/** @flow */

import type {CellRangeRendererParams} from './types';

/**
 * Default implementation of cellRangeRenderer used by Grid.
 * This renderer supports cell-caching while the user is scrolling.
 */

export default function defaultCellRangeRenderer({
  cellCache,
  cellRenderer,
  columnSizeAndPositionManager,
  columnStartIndex,
  columnStopIndex,
  deferredMeasurementCache,
  horizontalOffsetAdjustment,
  isScrolling,
  isScrollingOptOut,
  parent, // Grid (or List or Table)
  rowSizeAndPositionManager,
  rowStartIndex,
  rowStopIndex,
  styleCache,
  verticalOffsetAdjustment,
  visibleColumnIndices,
  visibleRowIndices,
}: CellRangeRendererParams) {
  const renderedCells = [];

  // Browsers have native size limits for elements (eg Chrome 33M pixels, IE 1.5M pixes).
  // User cannot scroll beyond these size limitations.
  // In order to work around this, ScalingCellSizeAndPositionManager compresses offsets.
  // We should never cache styles for compressed offsets though as this can lead to bugs.
  // See issue #576 for more.
  // 通过比较预估大小(getTotalSize)和 __maxScrollSize 判断是否需要调整大小
  const areOffsetsAdjusted =
    columnSizeAndPositionManager.areOffsetsAdjusted() ||
    rowSizeAndPositionManager.areOffsetsAdjusted();

  // 如果没有滚动且没有调整大小，则可以缓存 cell 元素的 style
  const canCacheStyle = !isScrolling && !areOffsetsAdjusted;

  for (let rowIndex = rowStartIndex; rowIndex <= rowStopIndex; rowIndex++) {
    // 根据索引获取对应元素的行高和垂直偏移
    let rowDatum = rowSizeAndPositionManager.getSizeAndPositionOfCell(rowIndex);

    for (
      let columnIndex = columnStartIndex;
      columnIndex <= columnStopIndex;
      columnIndex++
    ) {
      // 根据索引获取元素的列宽和水平偏移
      let columnDatum = columnSizeAndPositionManager.getSizeAndPositionOfCell(
        columnIndex,
      );
      // 在动态渲染这块，为了获取整一行的高度/整一列的宽度，往往会渲染全部的行元素，此时就分为开建与不可见
      let isVisible =
        columnIndex >= visibleColumnIndices.start &&
        columnIndex <= visibleColumnIndices.stop &&
        rowIndex >= visibleRowIndices.start &&
        rowIndex <= visibleRowIndices.stop;
      let key = `${rowIndex}-${columnIndex}`;
      let style;

      // Cache style objects so shallow-compare doesn't re-render unnecessarily.
      if (canCacheStyle && styleCache[key]) {
        style = styleCache[key];
      } else {
        // In deferred mode, cells will be initially rendered before we know their size.
        // Don't interfere with CellMeasurer's measurements by setting an invalid size.
        if (
          deferredMeasurementCache &&
          !deferredMeasurementCache.has(rowIndex, columnIndex)
        ) {
          // Position not-yet-measured cells at top/left 0,0,
          // And give them width/height of 'auto' so they can grow larger than the parent Grid if necessary.
          // Positioning them further to the right/bottom influences their measured size.
          // 通过设置 auto ，然后观测它们的实际的大小
          style = {
            height: 'auto',
            left: 0,
            position: 'absolute',
            top: 0,
            width: 'auto',
          };
        } else {
          style = {
            height: rowDatum.size,
            left: columnDatum.offset + horizontalOffsetAdjustment,
            position: 'absolute',
            top: rowDatum.offset + verticalOffsetAdjustment,
            width: columnDatum.size,
          };
          // 缓存样式
          styleCache[key] = style;
        }
      }

      let cellRendererParams = {
        columnIndex,
        isScrolling,
        isVisible,
        key,
        parent,
        rowIndex,
        style,
      };

      let renderedCell;

      // Avoid re-creating cells while scrolling.
      // This can lead to the same cell being created many times and can cause performance issues for "heavy" cells.
      // If a scroll is in progress- cache and reuse cells.
      // This cache will be thrown away once scrolling completes.
      // However if we are scaling scroll positions and sizes, we should also avoid caching.
      // This is because the offset changes slightly as scroll position changes and caching leads to stale values.
      // For more info refer to issue #395
      //
      // If isScrollingOptOut is specified, we always cache cells.
      // For more info refer to issue #1028
      // ? isScrollingOptOut: 滚动的时候，是否在重新渲染可见的 cell 元素
      if (
        (isScrollingOptOut || isScrolling) &&
        !horizontalOffsetAdjustment &&
        !verticalOffsetAdjustment
      ) {
        if (!cellCache[key]) {
          cellCache[key] = cellRenderer(cellRendererParams);
        }
        // 不重新渲染，只从缓存里面拿取
        renderedCell = cellCache[key];

        // If the user is no longer scrolling, don't cache cells.
        // This makes dynamic cell content difficult for users and would also lead to a heavier memory footprint.
        // ? 由于动态 Cell 的偏移值是随时可变的，不合适一直缓存，而且缓存的是组件，内存消耗很快的
      } else {
        renderedCell = cellRenderer(cellRendererParams);
      }

      if (renderedCell == null || renderedCell === false) {
        continue;
      }

      if (process.env.NODE_ENV !== 'production') {
        warnAboutMissingStyle(parent, renderedCell);
      }

      renderedCells.push(renderedCell);
    }
  }

  return renderedCells;
}

function warnAboutMissingStyle(parent, renderedCell) {
  if (process.env.NODE_ENV !== 'production') {
    if (renderedCell) {
      // If the direct child is a CellMeasurer, then we should check its child
      // See issue #611
      if (renderedCell.type && renderedCell.type.__internalCellMeasurerFlag) {
        renderedCell = renderedCell.props.children;
      }

      if (
        renderedCell &&
        renderedCell.props &&
        renderedCell.props.style === undefined &&
        parent.__warnedAboutMissingStyle !== true
      ) {
        parent.__warnedAboutMissingStyle = true;

        console.warn(
          'Rendered cell should include style property for positioning.',
        );
      }
    }
  }
}
