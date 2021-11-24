import * as d3 from "d3";
import $ from "jquery";
import { reconfigurePartitions } from "./overview";
import {
  getOverviewPartitionConfig,
  setOverviewPartitionConfig,
} from "./drawChart";

export const initPos = 1419; //hardcoded end of brush

/**
 * slider objects for each overview
 * @param sliderObj the draggable part
 * @param sliderBar the black bar
 * @param pos current position of the slider
 * @param posRef former position of slider (to determine movement direction)
 * @param initPos initial position of slider
 * @param lastHighlighted lastly hovered token that was highlighted
 * @param lastHighlightedColor
 * @param boundBrush1 the left side brush of the partitioning
 * @param boundBrush2 the right side brush of the partitioning
 * TO DO: Replace actual brush with id ref
 */
export const sliders = {
  /* "0": [
    {
      sliderObj: "",
      sliderBar: "",
      pos: initPos,
      posRef: 0,
      initPos: initPos,
      lastHighlighted: 0,
      lastHighlightedColor: "white",
      boundBrush1: "",
      boundBrush2: "",
    } x (maxNumBrushes - 1)
  ],
  x maxNumOverviews */
};

export function initializeSliders(numOverviews, maxNumSliders) {
  for (let i = 0; i < numOverviews; i++) {
    const overviewID = i;
    sliders[overviewID] = [];
    for (let j = 0; j < maxNumSliders; j++) {
      sliders[overviewID].push({
        sliderObj: "",
        sliderBar: "",
        pos: initPos,
        posRef: 0,
        initPos: initPos,
        lastHighlighted: 0,
        lastHighlightedColor: "white",
        boundBrush1: "",
        boundBrush2: "",
      });
    }
  }
}

/**
 *
 * add a slider to the specified overview on the specified position
 * @param {*} chart
 * @param {number} overviewID
 * @param {number} id ID of the slider ({0, 1})
 * @param {number} splitPos partitioning point in the overview
 */
function addSlider(chart, overviewID, id, splitPos) {
  chart.p.sliderWidth = 2;
  chart.p.sliderHandleWidth = 20;
  chart.p.sliderHeight = 40;

  var currChart = chart.overviews[overviewID]["slider"]["svg"]; //chart.slider
  var currOverview = chart.overviews[overviewID]["stripGroup"]; //chart.overview
  var currSlider = sliders[overviewID][id];
  var currID = "slider_" + overviewID + "_" + id;
  var currBar = "sliderBar_" + overviewID + "_" + id;

  currSlider.pos = splitPos;
  currSlider.posRef = 0;
  currSlider.sliderObj = currChart
    .append("rect")
    .attr("id", currID)
    .attr("class", "slider")
    .attr("x", splitPos - chart.p.sliderHandleWidth / 2)
    .attr("y", chart.p.overviewExt)
    .attr("width", chart.p.sliderHandleWidth)
    .attr("height", 12.5);

  currSlider.sliderBar = currOverview
    .append("rect")
    .attr("id", currBar)
    .attr("x", splitPos)
    .attr("y", 0)
    .attr("width", chart.p.sliderWidth)
    .attr("height", chart.p.overviewExt);
}

/**
 *
 * [This function is called when the sliders are initally moved into the overview]
 * Initially bind a slider in the specified overview on the specified position to its left and right side brushes
 * When the slider is moved via dragging, the new partitioning and the resuling brush ranges are calculated
 * and the corresponding updates are propagated
 * @param {*} chart
 * @param {*} splitPos New partitioning position and position of the slider
 * @param {*} overviewID The overview where all of the following is happening
 * @param {*} id ID specifying if the first or the second slider of the overview was moved
 */
export function bindSliderToBrushes(chart, splitPos, overviewID, id) {
  addSlider(chart, overviewID, id, splitPos);
  //depending on which brush was shortened due to slider movement,
  //the corresponding overlay and selection ranges change
  //which also results in the change of the synched text view

  const currSlider = sliders[overviewID][id];
  const predecSlider = id > 0 ? sliders[overviewID][id - 1] : null;
  const successSlider =
    id < sliders[overviewID].length - 1 ? sliders[overviewID][id + 1] : null;

  var dragHandler = d3
    .drag()
    //record change in slider position (needed for calc. new partitioning)
    .on("drag", function (e) {
      currSlider.sliderObj.attr(
        "x",
        parseInt(d3.event.x) - chart.p.sliderHandleWidth / 2
      );
      currSlider.sliderBar.attr("x", parseInt(d3.event.x));
      currSlider.posRef = currSlider.pos;
      currSlider.pos = parseInt(d3.event.x);
      currSlider.lastHighlighted = currSlider.pos;
    })
    .on("end", function () {
      var leftBrush = chart.overviews[overviewID]["brushGroup"][id];
      var rightBrush =
        chart.overviews[overviewID]["brushGroup"][parseInt(id + 1)];

      const leftBrushLeftBorder = predecSlider
        ? predecSlider.pos + chart.p.sliderWidth
        : 0;
      const leftBrushRightBorder = currSlider.pos;
      const rightBrushLeftBorder = currSlider.pos + chart.p.sliderWidth;
      const rightBrushRightBorder = successSlider
        ? successSlider.pos
        : chart.p.tokenExt;

      const intersection = checkBoundary(
        currSlider,
        predecSlider,
        successSlider
      );
      if (intersection === true) {
        currSlider.sliderObj.remove();
        currSlider.sliderBar.remove();
        bindSliderToBrushes(chart, chart.p.tokenExt, overviewID, id);
        return false;
      }

      currSlider.boundBrush1 = leftBrush;
      currSlider.boundBrush2 = rightBrush;
      currSlider.initPos = currSlider.pos;

      //determine current range of left side brush
      var brush1SelectionX = parseInt(leftBrush.select(".selection").attr("x"));
      var brush1SelectionEnd =
        parseInt(leftBrush.select(".selection").attr("x")) +
        parseInt(leftBrush.select(".selection").attr("width"));

      //set the new ranges of left and right side brushes
      var brush1Ranges = [
        leftBrushLeftBorder,
        leftBrushRightBorder,
        Math.min(leftBrushLeftBorder, brush1SelectionX),
        Math.min(leftBrushRightBorder, brush1SelectionEnd),
      ];
      //remember: this is the initial binding of the slider, i.e. the initial partitioning
      //so the second brush is freshly drawn, hence we do not need to distinguish selection and overlay ranges
      var brush2Ranges = [
        rightBrushLeftBorder,
        rightBrushRightBorder,
        rightBrushLeftBorder,
        rightBrushRightBorder,
      ];

      //propagate new partitioning and redraw brushes, adjust views, ...
      $(function () {
        reconfigurePartitions(
          chart,
          currSlider.pos,
          brush1Ranges,
          brush2Ranges,
          id,
          overviewID
        );
        let currentOverviewPartitionConfig = getOverviewPartitionConfig(
          chart,
          overviewID
        );
        currentOverviewPartitionConfig["last_slider_config"][id] =
          currSlider.pos;
        setOverviewPartitionConfig(
          chart,
          overviewID,
          currentOverviewPartitionConfig
        );
      });
    });
  if (currSlider.sliderObj) {
    dragHandler(currSlider.sliderObj);
  }
}

/**
 * [This function is called when a slider is already bound and established and then moved]
 * reconfigures either of the two sliders
 * first slider sits between brush1 (leftmost brush) and brush2 (middle brush)
 * second slider sits between brush2 and brush3 (rightmost brush)
 * @param {chart} chart - the chart object
 * @param {number} splitPos - the position of the new partitioning
 * @param {number} overviewID - id of the corresponding overview
 * @param {number} id - id of the corresponding slider (0 - slider1, 1 - slider2)
 */
export function reconfigureSlider(chart, splitPos, overviewID, id) {
  addSlider(chart, overviewID, id, splitPos);
  //we have to assume that affected overview is already partitioned twice
  //i.e. three brushes exist, which also means that the movement of a single slider
  //might change the ranges of up to two brushes and their respective synched views

  const currSlider = sliders[overviewID][id];
  const predecSlider = id > 0 ? sliders[overviewID][id - 1] : null;
  const successSlider =
    id < sliders[overviewID].length - 1 ? sliders[overviewID][id + 1] : null;

  var dragHandler = d3
    .drag()
    .on("drag", function (e) {
      //record change in slider position (needed for calc. new partitioning)
      var newX = parseInt(d3.event.x) - chart.p.sliderHandleWidth / 2;
      var newBarX = parseInt(d3.event.x);
      currSlider.sliderObj.attr("x", newX);
      currSlider.sliderBar.attr("x", newBarX);
      currSlider.posRef = currSlider.pos;
      currSlider.pos = newBarX;
      currSlider.lastHighlighted = currSlider.pos;
    })
    .on("end", function () {
      //check if the moved slider oversteps the partitioning boundaries of the non affected slider and reset if so

      const intersection = checkBoundary(
        currSlider,
        predecSlider,
        successSlider
      );
      if (intersection === true) {
        currSlider.sliderObj.remove();
        currSlider.sliderBar.remove();
        reconfigureSlider(chart, currSlider.initPos, overviewID, id);
        return false;
      }
      currSlider.initPos = currSlider.pos;

      //determine the left side and right side brushes of the respective overviews
      currSlider.boundBrush1 = chart.overviews[overviewID]["brushGroup"][id];
      currSlider.boundBrush2 =
        chart.overviews[overviewID]["brushGroup"][parseInt(id + 1)];

      //determine current ranges of the affected brushes
      var brush1SelectionX = parseInt(
        currSlider.boundBrush1.select(".selection").attr("x")
      );
      var brush1SelectionEnd =
        parseInt(currSlider.boundBrush1.select(".selection").attr("x")) +
        parseInt(currSlider.boundBrush1.select(".selection").attr("width"));
      var brush2SelectionX = parseInt(
        currSlider.boundBrush2.select(".selection").attr("x")
      );
      var brush2SelectionEnd =
        parseInt(currSlider.boundBrush2.select(".selection").attr("x")) +
        parseInt(currSlider.boundBrush2.select(".selection").attr("width"));
      var brush2OverlayX = parseInt(
        currSlider.boundBrush2.select(".overlay").attr("x")
      );
      /**
       * the left overlay border of the left brush
       */
      var leftMost = predecSlider ? predecSlider.pos + chart.p.sliderWidth : 0;

      /**
       * the left overlay border of the right brush
       */
      var left = currSlider.pos + chart.p.sliderWidth;
      /**
       * the right overlay border of the left brush
       *
       */
      var right = currSlider.pos;
      /**
       * the right overlay border of the right brush
       */
      var rightMost = successSlider ? successSlider.pos : chart.p.tokenExt;

      //set the new brush ranges
      //we make some distinctions whether the former selection ranges were shortened by the new slider position
      var brush1Move = [
        leftMost,
        right,
        brush1SelectionX,
        Math.min(brush1SelectionEnd, right),
      ];
      if (currSlider.pos < brush1SelectionX) {
        brush1Move[2] = leftMost;
        brush1Move[3] = right;
      }
      var brush2Move = [
        left,
        rightMost,
        Math.max(brush2SelectionX, left),
        brush2SelectionEnd,
      ];
      if (currSlider.pos > brush2SelectionEnd) {
        brush2Move[2] = left;
        brush2Move[3] = rightMost;
      }

      //propagate new partitioning and redraw brushes, adjust views, ...
      $(function () {
        reconfigurePartitions(
          chart,
          currSlider.pos,
          brush1Move,
          brush2Move,
          id,
          overviewID
        );
      });
    });
  if (currSlider.sliderObj) {
    dragHandler(currSlider.sliderObj);
  }
}

/**
 *
 * helper function to determine if two sliders of an overview positionally intersect
 * @param {number} overviewID the affected overview
 */
function checkBoundary(currSlider, predecSlider, successSlider) {
  if (predecSlider && currSlider.pos < predecSlider.pos) {
    return true;
  }
  if (successSlider && currSlider.pos > successSlider.pos) {
    return true;
  }
  return false;
}

/**
 *
 * Helper function that removes and re-inserts the specified slider(s)
 * @param {*} chart
 * @param {number} sliderID
 * @param {number} overviewID
 * @param {number} splitPos
 */
export function sliderReconfigurationCaller(
  chart,
  sliderID,
  overviewID,
  splitPos
) {
  sliders[overviewID][sliderID].sliderObj.remove();
  sliders[overviewID][sliderID].sliderBar.remove();
  reconfigureSlider(chart, splitPos, overviewID, sliderID);
}

/**
 *
 * Helper function that removes either all sliders of the specified overview (all === true)
 * or a specific slider within the overview, determined via id
 * @param {*} chart
 * @param {number} overview ID of the affected overview
 * @param {boolean} all boolean that determines if all sliders are to be removed
 * @param {number} id id of the specific slider to be removed
 */
export function resetSlider(chart, overviewID, all = true, id = 1) {
  if (all === true) {
    for (let i = sliders[overviewID].length - 1; i >= 0; i--) {
      sliders[overviewID][i].sliderObj.remove();
      sliders[overviewID][i].sliderBar.remove();
      bindSliderToBrushes(chart, chart.p.tokenExt, overviewID, i);
    }
  } else {
    sliders[overviewID][id].sliderObj.remove();
    sliders[overviewID][id].sliderBar.remove();
    bindSliderToBrushes(chart, chart.p.tokenExt, overviewID, id);
  }
}
