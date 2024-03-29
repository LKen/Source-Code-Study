/** @flow */
import PropTypes from 'prop-types';
import * as React from 'react';
import Immutable from 'immutable';
import {
  ContentBox,
  ContentBoxHeader,
  ContentBoxParagraph,
} from '../demo/ContentBox';
import {LabeledInput, InputRow} from '../demo/LabeledInput';
import AutoSizer from '../AutoSizer';
import Collection from './Collection';
import styles from './Collection.example.css';

// Defines a pattern of sizes and positions for a range of 10 rotating cells
// These cells cover an area of 600 (wide) x 400 (tall)
const GUTTER_SIZE = 3;
const CELL_WIDTH = 75;

export default class CollectionExample extends React.PureComponent {
  static contextTypes = {
    list: PropTypes.instanceOf(Immutable.List).isRequired,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      cellCount: context.list.size,
      columnCount: this._getColumnCount(context.list.size),
      height: 300,
      horizontalOverscanSize: 0,
      scrollToCell: undefined,
      showScrollingPlaceholder: false,
      verticalOverscanSize: 0,
    };

    this._columnYMap = [];

    this._cellRenderer = this._cellRenderer.bind(this);
    this._cellSizeAndPositionGetter = this._cellSizeAndPositionGetter.bind(
      this,
    );
    this._noContentRenderer = this._noContentRenderer.bind(this);
    this._onCellCountChange = this._onCellCountChange.bind(this);
    this._onHeightChange = this._onHeightChange.bind(this);
    this._onHorizontalOverscanSizeChange = this._onHorizontalOverscanSizeChange.bind(
      this,
    );
    this._onScrollToCellChange = this._onScrollToCellChange.bind(this);
    this._onVerticalOverscanSizeChange = this._onVerticalOverscanSizeChange.bind(
      this,
    );
  }

  render() {
    const {
      cellCount,
      height,
      horizontalOverscanSize,
      scrollToCell,
      showScrollingPlaceholder,
      verticalOverscanSize,
    } = this.state;

    return (
      <ContentBox>
        <ContentBoxHeader
          text="Collection"
          sourceLink="https://github.com/bvaughn/react-virtualized/blob/master/source/Collection/Collection.example.js"
          docsLink="https://github.com/bvaughn/react-virtualized/blob/master/docs/Collection.md"
        />

        <ContentBoxParagraph>
          Renders scattered or non-linear data. Unlike <code>Grid</code>, which
          renders checkerboard data, <code>Collection</code> can render
          arbitrarily positioned- even overlapping- data.
        </ContentBoxParagraph>

        <ContentBoxParagraph>
          <label className={styles.checkboxLabel}>
            <input
              aria-label="Show placeholder while scrolling?"
              checked={showScrollingPlaceholder}
              className={styles.checkbox}
              type="checkbox"
              onChange={event =>
                this.setState({
                  showScrollingPlaceholder: event.target.checked,
                })
              }
            />
            Show placeholder while scrolling?
          </label>
        </ContentBoxParagraph>

        <InputRow>
          <LabeledInput
            label="Num cells"
            name="cellCount"
            onChange={this._onCellCountChange}
            value={cellCount}
          />
          <LabeledInput
            label="Scroll to cell"
            name="onScrollToCell"
            placeholder="Index..."
            onChange={this._onScrollToCellChange}
            value={scrollToCell || ''}
          />
          <LabeledInput
            label="Height"
            name="height"
            onChange={this._onHeightChange}
            value={height}
          />
          <LabeledInput
            label="Horizontal Overscan"
            name="horizontalOverscanSize"
            onChange={this._onHorizontalOverscanSizeChange}
            value={horizontalOverscanSize}
          />
          <LabeledInput
            label="Vertical Overscan"
            name="verticalOverscanSize"
            onChange={this._onVerticalOverscanSizeChange}
            value={verticalOverscanSize}
          />
        </InputRow>

        <AutoSizer disableHeight>
          {({width}) => (
            <Collection
              cellCount={cellCount}
              cellRenderer={this._cellRenderer}
              cellSizeAndPositionGetter={this._cellSizeAndPositionGetter}
              className={styles.collection}
              height={height}
              horizontalOverscanSize={horizontalOverscanSize}
              noContentRenderer={this._noContentRenderer}
              scrollToCell={scrollToCell}
              verticalOverscanSize={verticalOverscanSize}
              width={width}
            />
          )}
        </AutoSizer>
      </ContentBox>
    );
  }

  _cellRenderer({index, isScrolling, key, style}) {
    const {list} = this.context;
    const {showScrollingPlaceholder} = this.state;

    const datum = list.get(index % list.size);

    // Customize style
    style.backgroundColor = datum.color;

    return (
      <div className={styles.cell} key={key} style={style}>
        {showScrollingPlaceholder && isScrolling ? '...' : index}
      </div>
    );
  }

  _cellSizeAndPositionGetter({index}) {
    const {list} = this.context;
    const {columnCount} = this.state;

    const columnPosition = index % (columnCount || 1);
    const datum = list.get(index % list.size);

    // Poor man's Masonry layout; columns won't all line up equally with the bottom.
    const height = datum.size;
    const width = CELL_WIDTH;
    const x = columnPosition * (GUTTER_SIZE + width);
    const y = this._columnYMap[columnPosition] || 0;

    this._columnYMap[columnPosition] = y + height + GUTTER_SIZE;

    return {
      height,
      width,
      x,
      y,
    };
  }

  _getColumnCount(cellCount) {
    return Math.round(Math.sqrt(cellCount));
  }

  _onHorizontalOverscanSizeChange(event) {
    const horizontalOverscanSize = parseInt(event.target.value, 10) || 0;

    this.setState({horizontalOverscanSize});
  }

  _noContentRenderer() {
    return <div className={styles.noCells}>No cells</div>;
  }

  _onCellCountChange(event) {
    const cellCount = parseInt(event.target.value, 10) || 0;

    this._columnYMap = [];

    this.setState({
      cellCount,
      columnCount: this._getColumnCount(cellCount),
    });
  }

  _onHeightChange(event) {
    const height = parseInt(event.target.value, 10) || 0;

    this.setState({height});
  }

  _onScrollToCellChange(event) {
    const {cellCount} = this.state;

    let scrollToCell = Math.min(
      cellCount - 1,
      parseInt(event.target.value, 10),
    );

    if (isNaN(scrollToCell)) {
      scrollToCell = undefined;
    }

    this.setState({scrollToCell});
  }

  _onVerticalOverscanSizeChange(event) {
    const verticalOverscanSize = parseInt(event.target.value, 10) || 0;

    this.setState({verticalOverscanSize});
  }
}
