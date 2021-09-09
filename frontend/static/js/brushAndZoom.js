import * as d3 from "d3";

import { udateDetailBars } from "./drawBars.js";
import { applyFiltersAfterBrashAndZoom } from "./filters"; //HM
import { deleteAllIndicators } from "./indicator"; //HM
import { updateTextArea, autoScrollTextArea } from "./textArea"; //HM
import { clickFix, tornOFEvents, updateEvents } from "./events"; //HM
import { updateLensPositionAfterBrush } from "./lensChart";

//the first and last token OR bin (id and x-value), whose extension contains x0 or x1
function computeSnap(chart, x0, x1) {
  var xStart,
    res = { id: [], pos: [] };

  if (
    chart.modeOverview === "aggregated" ||
    chart.modeOverview === "semiAggregated"
  ) {
    var w = chart.p.width,
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

//handle clicks in overview outside of the brush-selection
function centerMousedown(chart) {
  var e = d3.event;
  var brushG = d3.select("#brushG");
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

    if (lastX < newX)
      chart.brush.move(brushG, [lastX, Math.min(newX, chart.p.width)]);
    else chart.brush.move(brushG, [Math.max(newX, 0), lastX]);
  }

  function mouseup() {
    d3.event.stopPropagation();
    if (!moved) centerbrush();
    else {
      var newX = d3.mouse(brushG.node())[0];
      if (lastX < newX)
        chart.brush.move(brushG, [lastX, Math.min(newX, chart.p.width)]);
      else chart.brush.move(brushG, [Math.max(newX, 0), lastX]);
    }
    w.on("mouseup", null).on("mousemove", null);

    function centerbrush() {
      var sel = d3.brushSelection(brushG.node()),
        target = d3.event.target,
        s = sel[1] - sel[0],
        y0 = s / 2,
        y1 = chart.p.width - s / 2,
        center = Math.max(y0, Math.min(y1, d3.mouse(target)[0]));

      //move the brush-selection; at this, a brush- and end- event will be fired
      //(and the selection snapped); sourceEvent is "mouseup"
      chart.brush.move(brushG, [center - s / 2, center + s / 2]);
    }
  }
}

//handle the movement of the brush
function brushMove(chart) {
  //ignore brush-events fired by brush.move() (zoomEnd or brushEnd)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

  //ignore brush-events fired by brush.move() (zoomMove)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;

  //the default brush-selection is [0, width]
  var selection = d3.event.selection || [0, chart.p.width];

  //ID of the first and last token/bin cut by the brush-selection (overview)
  var overviewRange = computeSnap(chart, selection[0], selection[1]).id;

  //draw the detail-tokens/bins with IDs in range
  udateDetailBars(chart, overviewRange);
  // applyFiltersAfterBrashAndZoom(); //HM
  if (chart.d.shortlens) {
    updateLensPositionAfterBrush(overviewRange);
  }
}

//handle the end of the brush-movement
function brushEnd(chart) {
  //ignore brush-events fired by brush.move() (zoomEnd or brushEnd)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

  //ignore brush-events fired by brush.move() (zoomMove)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;

  //ignore brush-events fired by centerMousedowsn -> mousemove
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "mousemove") return;

  //the default brush-selection is [0, width]
  var selection = d3.event.selection || [0, chart.p.width];

  //the snap-borders in the brush selection (overview)
  var snapPos = computeSnap(chart, selection[0], selection[1]).pos;

  //snap the brush to the overview-tokens/bins (esp. in case of atomic overview)
  d3.select("#brushG").call(d3.event.target.move, snapPos);

  //adjust zoom-transform to the snapped selection
  var newTransform = d3.zoomIdentity
    .translate((-chart.p.width * snapPos[0]) / (snapPos[1] - snapPos[0]), 0)
    .scale(chart.p.width / (snapPos[1] - snapPos[0]));
  //
  chart.detail.call(chart.zoom.transform, newTransform);
  clickFix();
  updateTextArea(); //HM

  applyFiltersAfterBrashAndZoom();
  // autoScrollTextArea();
  deleteAllIndicators(); //HM for escaping hover bugs during the brash process
  updateEvents();
}

//TODO Cleen console logs and idiot comments

//handle the course of a zooming/panning-gesture
function zoomMove(chart) {
  // ignore zoom-events fired by zoom.transform() (brushEnd or ZoomEnd)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

  //the actual zoom-transform
  var t = d3.event.transform;

  //ID of the first and last token/bin in the transformed area (detail)
  var r = [0, chart.p.width].map(t.invertX, t).map(function (r, i) {
    return i === 0 ? Math.max(r, 0) : Math.min(r, chart.p.width);
  });
  //the new display-range
  var overviewRange = computeSnap(chart, r[0], r[1]).id; //ids where the brush should snap to

  //draw the detail-tokens/bins with IDs in range

  udateDetailBars(chart, overviewRange);

  //adjust the brush to the overview-tokens/bins (unsnapped)
  d3.select("#brushG").call(chart.brush.move, r);
  // applyFiltersAfterBrashAndZoom(); //HM
  if (chart.d.shortlens) {
    updateLensPositionAfterBrush(overviewRange);
  }
}

//handle the end of a zooming/panning-gesture
function zoomEnd(chart) {
  // ignore zoom-events fired by zoom.transform() (brushEnd or ZoomEnd)
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

  //the actual zoom-transform
  var t = d3.event.transform;

  //ID of the first and last token/bin in the transformed area (detail)
  var r = [0, chart.p.width].map(t.invertX, t).map(function (r, i) {
    return i === 0 ? Math.max(r, 0) : Math.min(r, chart.p.width);
  });

  //the snap-borders
  var snapPos = computeSnap(chart, r[0], r[1]).pos;

  //adjust the zoom-transform to the snaped selection
  var newTrans = d3.zoomIdentity
    .translate((-chart.p.width * snapPos[0]) / (snapPos[1] - snapPos[0]), 0)
    .scale(chart.p.width / (snapPos[1] - snapPos[0]));
  //
  chart.detail.call(d3.event.target.transform, newTrans);

  //adjust the brush to the overview-tokens/bins (snapped)
  d3.select("#brushG").call(chart.brush.move, snapPos);
  clickFix();
  updateTextArea(); //HM

  applyFiltersAfterBrashAndZoom();
  autoScrollTextArea(false);
  deleteAllIndicators(); //HM for escaping hover bugs during the zoom process
  updateEvents();
}

//handle double-click on detail-window
function quickZoom(chart) {
  var xMouse = d3.mouse(chart.detail)[0],
    unitId; //id of the bin or token at xMouse
  if (chart.modeOverview === "atomic") {
    xStart = chart.d.overviewXValues.map(function (xPos) {
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
      w = chart.p.width,
      n = chart.d.overviewIds.length;

    unitId = firstId + Math.floor((xMouse * n) / w);
  }

  //adjust the brush to the atomic-window (snapped)
  d3.select("#brushG").call(chart.brush.move, atomWin);
}

export default function installBrushAndZoom(chart) {
  //generate the zoom-behaviour for the detail-window
  chart.zoom = d3
    .zoom()
    .scaleExtent([1, Infinity]) //no downsizing
    .translateExtent([
      [0, 0],
      [chart.p.width, chart.p.detailHeight],
    ]) //panning only within detail-window
    .extent([
      [0, 0],
      [chart.p.width, chart.p.detailHeight],
    ]) //viewport = detail-window
    .filter(function () {
      //ignore right-clicks on the zoom-area
      return !d3.event.button;
    })
    .on("start", function () {
      // HM

      // console.log("start");
      // console.log(d3.mouse(this));
      tornOFEvents(); //HM
    })
    .on("zoom", function () {
      // console.log("zoom");
      zoomMove(chart);
    })
    .on("end", function () {
      // console.log("end");
      // console.log(d3.mouse(this));
      zoomEnd(chart);
    });

  chart.detail.call(chart.zoom).on("dblclick.zoom", null);
  chart.detail.on("dblclick", function () {
    quickZoom(chart);
  });

  // chart.detail.on("click", function (d) {
  //    console.log("experiment click");
  //     d3.event.preventDefault();
  // });

  //generate the brush for the overview-window
  chart.brush = d3
    .brushX()
    .extent([
      [0, 0],
      [chart.p.width, chart.p.overviewHeight],
    ])
    .on("start", function () {
      tornOFEvents(); //HM
    })
    .on("brush", function () {
      brushMove(chart);
    })
    .on("end", function () {
      brushEnd(chart);
    });

  //call the brush on the overview-window
  var overviewBrush = chart.overview
    .append("g")
    .attr("id", "brushG")
    .call(chart.brush)
    .call(chart.brush.move, [0, chart.p.width]); //initialize selection to extent-region

  //change cursor appearance in case of portrait-orientation
  if (chart.p.orientation === "portrait") {
    overviewBrush.selectAll(".handle").attr("cursor", "ns-resize");
  }

  //a click outside of the brush-selection centers the brush there (since .overlay lies under .selection,
  //the listener receives only clicks outside of selection but inside of overlay)
  overviewBrush.select(".overlay").on("mousedown", function () {
    centerMousedown(chart);
  });
}
