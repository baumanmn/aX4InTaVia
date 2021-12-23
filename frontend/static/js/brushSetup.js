import * as d3 from "d3";
import $ from "jquery"; //Jena
import {
  brushMove,
  brushEnd,
  zoomMove,
  zoomEnd,
  centerMousedown,
} from "./brushBehavior";
import { tornOFEvents } from "./events"; //HM
import { addMultipleTextviews, updateTextview } from "./textArea";
import { drawButtonTree } from "./buttons.js";
import {
  getOverviewPartitionConfig,
  setOverviewPartitionConfig,
  addBrushToFamilyMap,
  addChildBrushToFamilyMap,
  addSiblingBrushToFamilyMap,
  getBrushConfigKey,
  redrawCurrentActivation,
  colorActiveTree,
  setBrushState,
  getFamilyOfBrush,
} from "./drawChart";
import {
  ascendingBrushIndicatorUpdate,
  cascadingBrushIndicatorUpdate,
} from "./brushIndicators";
import { setAnnotationWindows } from "./splitAnnotationWindow";

export var annotationBrush = 0;
export var currentlyActiveBrush = 0;

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
  let currentOverviewPartitionConfig = getOverviewPartitionConfig(
    chart,
    overviewNr
  );

  const selectorPrefix = "brush_";
  let partitionKey = brushData["brushNr"];
  let brushKey = getBrushConfigKey(chart, overviewNr, partitionKey);
  let brushID = selectorPrefix + brushKey;
  let currOverview = chart.overviews[overviewNr]["stripGroup"];
  let currClass = chart.p.defaultBrushNodeClass;

  annotationBrush = partitionKey;

  chart.overviews[overviewNr]["brushGroup"][partitionKey] = currOverview
    .append("g")
    .attr("id", brushID)
    .attr("class", currClass)
    .on("click", function () {
      chart.nodeActivityMode = "overview";
      colorActiveTree(chart, overviewNr, partitionKey);
      let activeNodes = [brushKey];
      let familyData = getFamilyOfBrush(chart, brushKey);
      if (familyData && familyData["siblings"].size > 0) {
        familyData = Array.from(familyData["siblings"]);
        activeNodes = activeNodes.concat(familyData);
        activeNodes.sort();
      }
      setAnnotationWindows(chart, activeNodes);
      addMultipleTextviews(chart, activeNodes);
    });

  chart.overviews[overviewNr]["brushGroup"][partitionKey]
    .append("svg")
    .attr("width", chart.p.tokenExt)
    .attr("height", chart.p.overviewExt);

  chart.overviews[overviewNr]["brushes"][partitionKey] = d3
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
  chart.overviews[overviewNr]["brushGroup"][partitionKey]
    .call(chart.overviews[overviewNr]["brushes"][partitionKey])
    .call(chart.overviews[overviewNr]["brushes"][partitionKey].move, [
      brushData["selection"][0],
      brushData["selection"][1],
    ]); //initialize selection to extent-region

  //change cursor appearance in case of portrait-orientation
  if (chart.p.orientation === "portrait") {
    chart.overviews[overviewNr]["brushGroup"][partitionKey]
      .selectAll(".handle")
      .attr("cursor", "ns-resize");
  }

  //a click outside of the brush-selection centers the brush there (since .overlay lies under .selection,
  //the listener receives only clicks outside of selection but inside of overlay)
  chart.overviews[overviewNr]["brushGroup"][partitionKey]
    .select(".overlay")
    .attr("x", brushData["overlay"][0])
    .attr("width", brushData["overlay"][1] - brushData["overlay"][0])
    .on("mousedown", function () {
      centerMousedown(chart, partitionKey, overviewNr);
    });

  if (!currentOverviewPartitionConfig["last_brush_config"][partitionKey]) {
    currentOverviewPartitionConfig["num_active_partitions"] += 1;
  }
  //currentOverviewPartitionConfig["active_partition"] = id;
  currentOverviewPartitionConfig["last_brush_config"][partitionKey] = {
    brushKey,
    selection: brushData["selection"],
    overlay: brushData["overlay"],
  };

  setOverviewPartitionConfig(chart, overviewNr, currentOverviewPartitionConfig);
  /* setBrushStateWithoutKey(chart, overviewNr, partitionKey, {
    overlay: brushData["overlay"],
    selection: brushData["selection"],
  }); */
  setBrushState(chart, brushKey, {
    overlay: brushData["overlay"],
    selection: brushData["selection"],
  });

  addBrushToFamilyMap(chart, overviewNr, partitionKey);
  addChildBrushToFamilyMap(chart, overviewNr, partitionKey);
  addSiblingBrushToFamilyMap(chart, overviewNr, partitionKey);

  cascadingBrushIndicatorUpdate(chart, overviewNr, partitionKey);
  ascendingBrushIndicatorUpdate(chart, overviewNr, partitionKey);

  drawButtonTree(chart);
  redrawCurrentActivation(chart);
  updateTextview(chart, brushKey);
  //cascadingButtonIndicatorUpdate(chart, overviewNr, id);
}

function handleBrushEnd(chart, overviewNr, brushData) {
  brushEnd(chart, brushData["brushNr"], overviewNr);
  /* if (overviewNr === 0) {
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
  } */
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
