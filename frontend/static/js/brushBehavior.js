import * as d3 from "d3";
//import * as d3 from "../node_modules/d3";
//import * as d3 from "../node_modules/d3/build/d3.js";
import {
  drawDetailBars,
  updateAnnoViewRange,
} from "./splitAnnotationWindow.js";
import { updateFilters } from "./filters"; //HM
import { deleteAllIndicators } from "./indicator"; //HM
import {
  autoScrollTextArea,
  updateTextview,
  cascadingProjection,
} from "./textArea"; //HM
import "jquery-ui-bundle";
import {
  drawStateRectangle,
  stateEncoder,
  updateAll,
  updateAllIndicators,
  setRangesWithID,
} from "./overviewState.js";
import {
  adjustWorkBenchBrush,
  drawButtonRectangle,
  drawGrandButtonRectangle,
  updateAllGrandButtonRectangles,
  drawNameTBDdRectangle,
} from "./buttons.js";
import {
  getOverviewPartitionConfig,
  setOverviewPartitionConfig,
  setBrushState,
  getBrushStateWithoutKey,
  getBrushConfigKey,
  redrawWorkbench,
} from "./drawChart";
import {
  ascendingBrushIndicatorUpdate,
  ascendingButtonIndicatorUpdate,
  cascadingBrushIndicatorUpdate,
  drawRootButtonTreeNodeIndicators,
} from "./brushIndicators.js";
import { drawHistogram } from "./drawBars.js";

//the first and last token OR bin (id and x-value), whose extension contains x0 or x1
export function computeSnap(chart, x0, x1) {
  var xStart,
    res = { id: [], pos: [] };

  if (
    chart.modeOverview === "aggregated" ||
    chart.modeOverview === "semiAggregated"
  ) {
    var w = chart.p.tokenExt,
      n = chart.d.overviewIds.length,
      firstId = chart.d.overviewIds[0];

    //find left snap-element
    res.id[0] = firstId + Math.floor((x0 * n) / w);
    res.pos[0] = (Math.floor((x0 * n) / w) * w) / n;

    //find right snap-element
    res.id[1] = firstId + Math.ceil((x1 * n) / w) - 1;
    res.pos[1] = (Math.ceil((x1 * n) / w) * w) / n;
  }
  if (chart.modeOverview === "atomic") {
    xStart = chart.d.overviewXValues.map(function (xPos) {
      return xPos.begin;
    });
    //find left snap-element
    for (var i = xStart.length - 1; i >= 0; i -= 1) {
      if (x0 >= xStart[i]) {
        res.id[0] = chart.d.overviewIds[i];
        res.pos[0] = xStart[i];
        break;
      }
    }
    //find right snap-element
    for (var j = xStart.length - 1; i >= 0; j -= 1) {
      if (x1 > xStart[j]) {
        res.id[1] = chart.d.overviewIds[j];
        res.pos[1] = xStart[j] + chart.d.overviewXValues[j].inc;
        break;
      }
    }
  }

  //the case when x0=x1=xStart[i] for some i
  if (res.id[0] > res.id[1]) res = [res[1], res[0]];

  return res;
}

export function centerMousedown(chart, brush = 0, overview = 0) {
  var e = d3.event;
  //var brushG = d3.select(chart.overviews[overview]["brushID"][brush]);
  var brushG = d3.select(chart.overviews[overview]["brushGroup"][brush]);
  var currBrush = chart.overviews[overview]["brushes"][brush];
  var left = 0;
  var right = chart.p.tokenExt;

  if (brush > 0) {
    left =
      parseInt(
        chart.overviews[overview]["brushGroup"][brush - 1]
          .select(".overlay")
          .attr("x")
      ) +
      parseInt(
        chart.overviews[overview]["brushGroup"][brush - 1]
          .select(".overlay")
          .attr("width")
      );
  }
  if (brush < 2) {
    right =
      chart.overviews[overview]["splits"][brush] === true
        ? parseInt(
            chart.overviews[overview]["brushGroup"][brush + 1]
              .select(".overlay")
              .attr("x")
          )
        : chart.p.tokenExt;
  }

  if (e.which === 1) {
    e.stopPropagation();
    e.preventDefault();
    var lastX = d3.mouse(brushG.node())[0],
      w = d3.select(window),
      moved = false;
    w.on("mousemove", mousemove).on("mouseup", mouseup);
  }

  function mousemove() {
    moved = true;
    var e = d3.event;
    var newX = d3.mouse(brushG.node())[0];
    e.stopPropagation();
    e.preventDefault();

    if (lastX < newX) currBrush.move(brushG, [lastX, Math.min(newX, right)]);
    else currBrush.move(brushG, [Math.max(newX, left), lastX]);
  }

  function mouseup() {
    d3.event.stopPropagation();
    if (!moved) centerbrush();
    else {
      var newX = d3.mouse(brushG.node())[0];
      if (lastX < newX) currBrush.move(brushG, [lastX, Math.min(newX, right)]);
      else currBrush.move(brushG, [Math.max(newX, left), lastX]);
    }
    w.on("mouseup", null).on("mousemove", null);

    function centerbrush() {
      var sel = d3.brushSelection(brushG.node()),
        target = d3.event.target,
        s = sel[1] - sel[0],
        y0 = s / 2,
        y1 = chart.p.tokenExt - s / 2, //CHANGE chart.p.tokenExt TO RIGHT HERE?
        center = Math.max(y0, Math.min(y1, d3.mouse(target)[0]));

      //move the brush-selection; at this, a brush- and end- event will be fired
      //(and the selection snapped); sourceEvent is "mouseup"
      currBrush.move(brushG, [center - s / 2, center + s / 2]);
    }
  }
}
//handle the movement of the brush
export function brushMove(chart) {
  //ignore brush-events fired by brush.move() (zoomEnd or brushEnd)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

  //ignore brush-events fired by brush.move() (zoomMove)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;

  //the default brush-selection is [0, tokenExt]
  var selection = d3.event.selection || [0, chart.p.tokenExt];

  //ID of the first and last token/bin cut by the brush-selection (overview)
  var overviewRange = computeSnap(chart, selection[0], selection[1]).id;
  // var test = [[0, 40],overviewRange, [300, 350], [30, 40]];
  var test = [overviewRange, [300, 350]];
  //drawDetailBars(chart, test);

  // updateFilters(); //HM
}

export function brushEnd(chart, brush = 0, overview = 0) {
  //ignore brush-events fired by brush.move() (zoomEnd or brushEnd)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

  //ignore brush-events fired by brush.move() (zoomMove)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;

  //ignore brush-events fired by centerMousedowsn -> mousemove
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "mousemove") return;

  //the default brush-selection is [0, tokenExt]
  var selection = d3.event.selection || [0, chart.p.tokenExt];

  //the snap-borders in the brush selection (overview)
  var snapPos = computeSnap(chart, selection[0], selection[1]).pos;

  //adjust zoom-transform to the snapped selection
  var newTransform = d3.zoomIdentity
    .translate((-chart.p.tokenExt * snapPos[0]) / (snapPos[1] - snapPos[0]), 0)
    .scale(chart.p.tokenExt / (snapPos[1] - snapPos[0]));

  //snap the brush to the overview-tokens/bins (esp. in case of atomic overview)
  //JENA: rearranged order of execution and added additional logic regarding other brushes

  //var brushID = chart.overviews[overview]["brushID"][brush];
  //d3.select(brushID).call(d3.event.target.move, snapPos);
  chart.overviews[overview]["brushGroup"][brush].call(
    d3.event.target.move,
    snapPos
  );
  chart.e.detail.call(chart.zoom.transform, newTransform);

  drawDetailBars(chart);
  //updateEvents();
  autoScrollTextArea();
  deleteAllIndicators(); //HM for escaping hover bugs during the brash process

  let currentOverviewPartitionConfig = getOverviewPartitionConfig(
    chart,
    overview
  );
  if (currentOverviewPartitionConfig["last_brush_config"][brush]) {
    currentOverviewPartitionConfig["last_brush_config"][brush][
      "selection"
    ] = snapPos;
    setOverviewPartitionConfig(chart, overview, currentOverviewPartitionConfig);
  }
  let currentBrushData = getBrushStateWithoutKey(chart, overview, brush);
  if (currentBrushData) {
    currentBrushData["selection"] = snapPos;
    setBrushState(chart, overview, brush, currentBrushData);
    cascadingBrushIndicatorUpdate(chart, overview, brush);
    ascendingBrushIndicatorUpdate(chart, overview, brush);
    ascendingButtonIndicatorUpdate(chart, overview, brush);
    drawRootButtonTreeNodeIndicators(chart);
    redrawWorkbench(chart);
    updateAnnoViewRange(chart, getBrushConfigKey(chart, overview, brush), true);
    updateTextview(chart, getBrushConfigKey(chart, overview, brush));

    if (
      chart.overviews[overview + 1] &&
      chart.overviews[overview + 1]["backgroundRects"]
    ) {
      let convertedBrushData = cascadingProjection(
        chart,
        getBrushConfigKey(chart, overview, brush)
      );
      drawHistogram(chart, convertedBrushData[1], overview + 1);
    }
  }
}

//TODO Cleen console logs and idiot commentss

//handle the course of a zooming/panning-gesture
//JENA: new parameter 'brush'
export function zoomMove(chart, brush = 0, overview = 0) {
  // ignore zoom-events fired by zoom.transform() (brushEnd or ZoomEnd)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

  //the actual zoom-transform
  var t = d3.event.transform;

  var left;
  var right;

  var left = 0;
  var right = chart.p.tokenExt;

  if (brush > 0) {
    left =
      parseInt(
        chart.overviews[overview]["brushGroup"][brush - 1]
          .select(".overlay")
          .attr("x")
      ) +
      parseInt(
        chart.overviews[overview]["brushGroup"][brush - 1]
          .select(".overlay")
          .attr("width")
      );
  }
  if (brush < 2) {
    right =
      chart.overviews[overview]["splits"][brush] === true
        ? parseInt(
            chart.overviews[overview]["brushGroup"][brush + 1]
              .select(".overlay")
              .attr("x")
          )
        : chart.p.tokenExt;
  }

  //ID of the first and last token/bin in the transformed area (detail)

  var r = [0, chart.p.tokenExt].map(t.invertX, t).map(function (r, i) {
    return i === 0 ? Math.max(r, left) : Math.min(r, right);
  });
  //the new display-range

  var overviewRange = computeSnap(chart, r[0], r[1]).id; //ids where the brush should snap to

  //draw the detail-tokens/bins with IDs in range

  // var test3 = [[0, 40],overviewRange, [300, 350], [30, 40]];
  var test3 = [overviewRange, [300, 350]];
  //drawDetailBars(chart, overviewRange);

  //var brushG = d3.select(chart.overviews[overview]["brushID"][brush]);
  var brushG = chart.overviews[overview]["brushGroup"][brush];
  var currBrush = chart.overviews[overview]["brushes"][brush];

  brushG.call(currBrush.move, r);

  //adjust the brush to the overview-tokens/bins (unsnapped)
  // updateFilters(); //HM
}

//handle the end of a zooming/panning-gesture
//JENA: added new parameter 'brush'
export function zoomEnd(chart, brush = 0, overview = 0) {
  // ignore zoom-events fired by zoom.transform() (brushEnd or ZoomEnd)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

  //the actual zoom-transform
  var t = d3.event.transform;
  var left = 0;
  var right = chart.p.tokenExt;

  if (brush > 0) {
    left =
      parseInt(
        chart.overviews[overview]["brushGroup"][brush - 1]
          .select(".overlay")
          .attr("x")
      ) +
      parseInt(
        chart.overviews[overview]["brushGroup"][brush - 1]
          .select(".overlay")
          .attr("width")
      );
  }
  if (brush < 2) {
    right =
      chart.overviews[overview]["splits"][brush] === true
        ? parseInt(
            chart.overviews[overview]["brushGroup"][brush + 1]
              .select(".overlay")
              .attr("x")
          )
        : chart.p.tokenExt;
  }

  //ID of the first and last token/bin in the transformed area (detail)
  var r = [0, chart.p.tokenExt].map(t.invertX, t).map(function (r, i) {
    return i === 0 ? Math.max(r, left) : Math.min(r, right);
  });

  //the snap-borders
  var snapPos = computeSnap(chart, r[0], r[1]).pos;

  //adjust the zoom-transform to the snapped selection
  var newTrans = d3.zoomIdentity
    .translate((-chart.p.tokenExt * snapPos[0]) / (snapPos[1] - snapPos[0]), 0)
    .scale(chart.p.tokenExt / (snapPos[1] - snapPos[0]));
  //
  chart.e.detail.call(d3.event.target.transform, newTrans);

  //var brushG = d3.select(chart.overviews[overview]["brushID"][brush]);
  var brushG = chart.overviews[overview]["brushGroup"][brush];
  var currBrush = chart.overviews[overview]["brushes"][brush];

  brushG.call(currBrush.move, snapPos);

  //adjust the brush to the overview-tokens/bins (snapped)
  //updateEvents();
  autoScrollTextArea(false);
  deleteAllIndicators(); //HM for escaping hover bugs during the zoom process
}

//handle double-click on detail-window
//JENA: added new parameter 'brush'
export function quickZoom(chart, brush = 0, overview = 0) {
  var xMouse = d3.mouse(chart.e.detail)[0],
    unitId; //id of the bin or token at xMouse
  if (chart.modeOverview === "atomic") {
    var xStart = chart.d.overviewXValues.map(function (xPos) {
      return xPos.begin;
    });

    for (var i = xStart.length - 1; i >= 0; i -= 1) {
      if (xMouse >= xStart[i]) {
        unitId = chart.d.overviewIds[i];
        break;
      }
    }
  } else {
    var firstId = chart.d.overviewIds[0],
      w = chart.p.tokenExt,
      n = chart.d.overviewIds.length;
    unitId = firstId + Math.floor((xMouse * n) / w);
  }

  //var brushG = d3.select(chart.overviews[overview]["brushID"][brush]);
  var brushG = chart.overviews[overview]["brushGroup"][brush];
  var currBrush = chart.overviews[overview]["brushes"][brush];

  brushG.call(currBrush.move, atomWin);

  //adjust the brush to the atomic-window (snapped)
}
