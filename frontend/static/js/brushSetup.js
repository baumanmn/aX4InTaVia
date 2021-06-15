import * as d3 from "d3";
import $ from "jquery"; //Jena
import {
  brushMove,
  brushEnd,
  zoomMove,
  zoomEnd,
  centerMousedown,
  brushEndOnClick,
} from "./brushBehavior";
import { tornOFEvents } from "./events"; //HM
import { setActiveOverview, checkAndUpdateSplit } from "./overview";
import {
  stateEncoder,
  setBrushStateActiveInOverview,
  getStoredRanges,
  setRanges,
} from "./overviewState";
import { updateTextArea } from "./textArea";
import { currentlyActive } from "./buttons.js";
import {
  //computeOverviewOrigin,
  drawCompleteOverviewBackground,
  drawStripGroup,
} from "./drawChart";

export var annotationBrush = 0;
export var currentlyActiveBrush = 0;

const brushClasses = {
  inactive: "O0",
  0: "O1",
  1: "O2",
  2: "O3",
};

/**
 *
 * the zoom functionalities
 * @param {*} chart the chart object
 */
export function installZoom(chart) {
  chart.zoom = d3
    .zoom()
    .scaleExtent([1, Infinity]) //no downsizing
    .translateExtent([
      [0, 0],
      [chart.p.tokenExt, chart.p.annotatorExt],
    ]) //panning only within detail-window
    //.extent([[0, 0], [brushM, chart.p.annotatorExt]])
    .extent([
      [0, 0],
      [chart.p.tokenExt, chart.p.annotatorExt],
    ]) //viewport = detail-window
    .filter(function () {
      //ignore right-clicks on the zoom-area
      return !d3.event.button;
    })
    .on("start", function () {
      // HM
      tornOFEvents(); //HM
    })
    .on("zoom", function () {
      zoomMove(chart, annotationBrush);
    })
    .on("end", function () {
      zoomEnd(chart, annotationBrush);
    });
}

/**
 * brushData : {
    brushNr : number,
    overlay: [left, right],
    selection: [left, right],
 }
 */
export function installBrush(chart, overviewNr, brushData) {
  let id = brushData["brushNr"];
  let currOverview = chart.overviews[overviewNr]["stripGroup"];
  let currClass =
    currentlyActive[overviewNr].id === id
      ? brushClasses[overviewNr]
      : brushClasses["inactive"];

  annotationBrush = id;

  chart.overviews[overviewNr]["brushGroup"][id] = currOverview
    .append("g")
    .attr("class", currClass)
    .on("click", function () {
      if (overviewNr !== 2) {
        annotationBrush;
        brushEndOnClick(chart, id); //MB why overviewNo not passed?
      } else {
        setBrushStateActiveInOverview(id, 2);
      }
    });

  chart.overviews[overviewNr]["brushGroup"][id]
    .append("svg")
    .attr("width", chart.p.tokenExt)
    .attr("height", chart.p.overviewExt);

  chart.overviews[overviewNr]["brushes"][id] = d3
    .brushX()
    .extent([
      [brushData["overlay"][0], 0],
      [brushData["overlay"][1], chart.p.overviewExt],
    ])
    //.extent([[0, 0], [chart.p.tokenExt, chart.p.overviewExt]])
    .on("start", function () {
      tornOFEvents(); //HM
    })
    .on("brush", function () {
      brushMove(chart);
    })
    .on("end", function () {
      handleBrushEnd(chart, overviewNr, brushData);
    });

  //call the brush on the overview-window
  chart.overviews[overviewNr]["brushGroup"][id]
    .call(chart.overviews[overviewNr]["brushes"][id])
    .call(chart.overviews[overviewNr]["brushes"][id].move, [
      brushData["selection"][0],
      brushData["selection"][1],
    ]); //initialize selection to extent-region

  //change cursor appearance in case of portrait-orientation
  if (chart.p.orientation === "portrait") {
    chart.overviews[overviewNr]["brushGroup"][id]
      .selectAll(".handle")
      .attr("cursor", "ns-resize");
  }

  //a click outside of the brush-selection centers the brush there (since .overlay lies under .selection,
  //the listener receives only clicks outside of selection but inside of overlay)
  chart.overviews[overviewNr]["brushGroup"][id]
    .select(".overlay")
    .attr("x", brushData["overlay"][0])
    .attr("width", brushData["overlay"][1] - brushData["overlay"][0])
    .on("mousedown", function () {
      centerMousedown(chart, id, overviewNr);
    });

  setRanges(overviewNr, brushData);
}

function handleBrushEnd(chart, overviewNr, brushData) {
  brushEnd(chart, brushData["brushNr"], overviewNr);
  if (overviewNr === 0) {
    setActiveOverview(chart, brushData["brushNr"]);
    $(function () {
      setActiveOverview(
        chart,
        stateEncoder[stateEncoder.parentActive].children.childActive,
        2
      );
    });
  } else if (overviewNr === 1) {
    if (
      stateEncoder[stateEncoder.parentActive].children.childActive ===
      brushData["brushNr"]
    ) {
      setActiveOverview(chart, brushData["brushNr"], 2); //2 because it sets the second level overview (starting from zero)
    }
  }
}

/**
 * remove the two specific brushes affected by a change in partitioning
 * the brushes are firstly removed and then re-added with their new ranges
 * @param {*} chart
 * @param {number} sliderID ID of the affeced slider, which in return determines the affected brushes
 * @param {number} overview ID of the affected Brush
 * @param {number} brush1 ID of the left side brush
 * @param {number} brush2 ID of the right side brush
 */
export function removeAndPrepend(chart, sliderID, overview, brush1, brush2) {
  let leftBrush = sliderID;
  let rightBrush = sliderID + 1;

  /*
   * No matter which slider was moved,
   * brush2 has to be readjusted
   */
  /* if (chart.overviews[overview]["brushGroup"][2] !== null)
    chart.overviews[overview]["brushGroup"][2].remove(); */
  /*
   * Depending on the slider either brush
   * takes on the role of the left brush and
   * brush2 the role of the right brush or
   * brush2 the role of the left brush and
   * brush3 the role of the right brush
   */
  chart.overviews[overview]["splits"][sliderID] = true;

  if (chart.overviews[overview]["brushGroup"][leftBrush] !== null)
    chart.overviews[overview]["brushGroup"][leftBrush].remove();
  if (chart.overviews[overview]["brushGroup"][rightBrush] !== null)
    chart.overviews[overview]["brushGroup"][rightBrush].remove();

  installBrush(chart, overview, {
    brushNr: leftBrush,
    overlay: [brush1[0], brush1[1]],
    selection: [brush1[2], brush1[3]],
  });
  installBrush(chart, overview, {
    brushNr: rightBrush,
    overlay: [brush2[0], brush2[1]],
    selection: [brush2[2], brush2[3]],
  });
}

/**
 * simply remove specific brush within specific overview
 * @param {*} chart
 * @param {number} overview
 * @param {number} id
 */
export function removeBrush(chart, overview, id) {
  if (chart.overviews[overview]["brushGroup"][id] !== null)
    chart.overviews[overview]["brushGroup"][id].remove();
}

/**
 * set the currently active brush
 * @param {number} id
 */
export function setCurrentlyActive(id) {
  currentlyActiveBrush = id;
}

/**
 *
 * init. the brush to view assignments
 * @param {*} chart the chart object
 */
export function initializeViewAssignment(chart) {
  chart.selectedBrushForView0 = [0, [0]]; //to be refactored into a view object
  chart.selectedBrushForView1 = [-1, [-1]]; //to be refactored into a view object
  chart.selectedBrushForView2 = [-1, [-1]]; //to be refactored into a view object
  chart.assignedRangeForViews = {
    //to be refactored into a view object
    0: [
      [0, chart.p.tokenExt], //overlay
      [0, chart.p.tokenExt], //selection
    ],
  };
}

/**
 * Assign a brush to a view and synchronize them
 * @param {*} chart
 * @param {*} viewID
 * @param {*} brushID
 * @param {*} overviewID
 */
export function assignBrushToView(chart, viewID, overviewID, key) {
  if (viewID === 0) {
    chart.selectedBrushForView0 = [overviewID, key];
  } else if (viewID === 1) {
    chart.selectedBrushForView1 = [overviewID, key];
  } else {
    chart.selectedBrushForView2 = [overviewID, key];
  }
  chart.assignedRangeForViews[viewID] = getStoredRanges(overviewID, key);
  checkAndUpdateSplit(chart, overviewID, key);
}

/**
 * Return the actual brush object of the brush that is synched with the given view
 * @param {*} chart
 * @param {*} viewID ID of the text view in question
 */
export function getSelectedBrushForView(chart, viewID) {
  let synched = null;
  let overviewBrush = null;
  if (viewID === 0) {
    synched = chart.selectedBrushForView0;
  } else if (viewID === 1) {
    synched = chart.selectedBrushForView1;
  } else {
    synched = chart.selectedBrushForView2;
  }
  if (synched[0] === -1) {
    return null;
  } else {
    let key = synched[1];
    if (synched[0] === 0) {
      overviewBrush = chart.overviews[0]["brushGroup"][key[0]];
    } else if (synched[0] === 1) {
      overviewBrush = chart.overviews[1]["brushGroup"][key[1]];
    } else {
      overviewBrush = chart.overviews[2]["brushGroup"][key[2]];
    }
    return overviewBrush;
  }
}

/**
 * Check wheter a given brush from a certain overview is synched with any of the text views
 * @param {*} chart
 * @param {*} overview number equaling 0, 1 or 2 and denoting the overview
 * @param {*} id ID of the brush
 */
export function isBrushSynchedWithText(chart, overview, key) {
  //still need
  let answer = [false, -1];
  if (
    chart.selectedBrushForView0[0] === overview &&
    compareKey(chart.selectedBrushForView0[1], key) === true
  ) {
    answer = [true, 0];
  }
  if (
    chart.selectedBrushForView1[0] === overview &&
    compareKey(chart.selectedBrushForView1[1], key) === true
  ) {
    answer = [true, 1];
  }
  if (
    chart.selectedBrushForView2[0] === overview &&
    compareKey(chart.selectedBrushForView2[1], key) === true
  ) {
    answer = [true, 2];
  }
  return answer;
}

export function checkAndUpdateAssignment(
  chart,
  overview,
  key,
  selectionRange,
  overlayRange = null
) {
  let synched = isBrushSynchedWithText(chart, overview, key);
  if (synched[0] === true) {
    let viewID = synched[1];
    chart.assignedRangeForViews[viewID][1] = selectionRange;
    if (overlayRange != null) {
      chart.assignedRangeForViews[viewID][0] = overlayRange;
    }
    updateTextArea(chart);
  }
}

export function extractKey(key) {
  let brushID;
  if (key.length > 2) {
    brushID = key[2];
  } else if (key.length > 1) {
    brushID = key[1];
  } else {
    brushID = key[0];
  }
  return brushID;
}

export function compareKey(list, key) {
  if (key.length !== list.length) {
    return false;
  }
  for (let i = 0; i < key.length; i++) {
    if (key[i] !== list[i]) {
      return false;
    }
  }
  return true;
}

//rangeKey === "selection" || "overlay"
export function getConvertedRange(chart, overviewID, brushID, rangeKey) {
  if (rangeKey === "selection") {
    rangeKey = ".selection";
  } else {
    rangeKey = ".overlay";
  }
  let brush = chart.overviews[overviewID]["brushes"][brushID];
  let maxNumBins = chart.d.bins.length;

  let rangeX = parseInt(brush.select(".selection").attr("x"));
  let rangeW = parseInt(brush.select(".selection").attr("width"));
}
