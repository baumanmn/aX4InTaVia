import * as d3 from "d3";

var indicatorWindowHeight = 15;
var indicatorGroupMarginTop = 115;
var indicatorGroupMarginLeft = 0;
var arrowMarginTop = 2;
// var arrowLineData = [ { "x": 0,   "y": 0},  { "x": 3,  "y": 10}, {"x": -3, "y": 10}, { "x": 0,   "y": 0}];  //Arrow Line coordinates
var arrowLineData = [
  { x: 0, y: 10 },
  { x: 3, y: 0 },
  { x: -3, y: 0 },
  { x: 0, y: 10 },
]; //Arrow Line coordinates

var chart;

//This is the accessor function for arrow svg path
var lineFunction = d3
  .line()
  .x(function (d) {
    return d.x;
  })
  .y(function (d) {
    return d.y;
  });

export function initIndicator(globalChart) {
  chart = globalChart;
  // define a mask for the indicator window
  // chart.svg.append("defs").append("clipPath")
  //     .attr("id", "clipIndicator")
  //     .append("rect")
  //     .attr("tokenExt",chart.p.tokenExt)
  //     .attr("height", indicatorWindowHeight);

  //the indicator window (with clip path) moved  to the coordinates
  chart.indicator = chart.detailBackground
    .append("g")
    .attr("id", "indicatorGroup")
    .attr(
      "transform",
      "translate(" +
        indicatorGroupMarginLeft +
        "," +
        indicatorGroupMarginTop +
        ")"
    );

  // // Indicator window background
  //     chart.indicator.append("rect")
  //         .attr("id", "dragBackground")
  //         .attr("tokenExt", chart.p.tokenExt)
  //         .attr("height",  indicatorWindowHeight);

  // Group of indicator arrows
  chart.indicatorArrowsGroup = chart.indicator
    .append("g")
    .attr("id", "indicatorArrows");
}

// indicate token or bin
export function indicateToken_Bin(id, mod = true) {
  var indicatorId;
  if (chart.modeDetail === "aggregated") {
    indicatorId = "ind_b" + id;
    if (id < chart.d.binRange[0] || id > chart.d.binRange[1]) {
      mod = false;
    }
  } else {
    indicatorId = "ind_t" + id;
    if (id < chart.d.tokenRange[0] || id > chart.d.tokenRange[1]) {
      mod = false;
    }
  }

  if (mod) {
    var x;
    if (chart.modeDetail === "aggregated") {
      var binSteps =
        chart.p.tokenExt / (chart.d.binRange[1] - chart.d.binRange[0] + 1);
      x = binSteps * (id - chart.d.binRange[0]) + binSteps / 2;
    } else if (chart.modeDetail === "semiAggregated") {
      var tokenSteps =
        chart.p.tokenExt / (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1);
      x = tokenSteps * (id - chart.d.tokenRange[0]) + tokenSteps / 2;
    }

    chart.indicatorArrowsGroup
      .append("path")
      .classed("indicatorArrow", true)
      .attr("id", indicatorId)
      .attr("d", lineFunction(arrowLineData))
      .attr("transform", "translate(" + x + "," + arrowMarginTop + ")");
  } else {
    d3.select("#" + indicatorId).remove();
  }
}

// delete all arrows
export function deleteAllIndicators() {
  d3.selectAll(".indicatorArrow").remove();
}
