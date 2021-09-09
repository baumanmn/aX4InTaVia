import * as d3 from "d3";

var indicatorWindowHeight = 15;
var indicatorGroupMarginTop = 115;
var indicatorGroupMarginLeft = 0;
var arrowMarginTop = 2;
var arrowLineData = [
  { x: 0, y: 10 },
  { x: 3, y: 0 },
  { x: -3, y: 0 },
  { x: 0, y: 10 },
]; //Arrow Line coordinates

var chart;

var overviewIndicatorScale;

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

  // Group of indicator arrows
  chart.indicatorArrowsGroup = chart.indicator
    .append("g")
    .attr("id", "indicatorArrows");

  chart.overviewIndicatorGroup = chart.overview
    .append("g")
    .attr("id", "overviewIndicatorGroup")
    .attr("transform", "translate(" + 0 + "," + -18 + ")");

  chart.overviewIndicatorGroup
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", chart.p.width)
    .attr("height", indicatorWindowHeight)
    .attr("fill", "white")
    .attr("id", "overviewIndicatorBackground");

  var t = chart.d.tokens.length - 1;
  overviewIndicatorScale = d3
    .scaleLinear()
    .domain([0, t])
    .range([0, chart.p.width]);
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
        chart.p.width / (chart.d.binRange[1] - chart.d.binRange[0] + 1);
      x = binSteps * (id - chart.d.binRange[0]) + binSteps / 2;
    } else if (chart.modeDetail === "semiAggregated") {
      var tokenSteps =
        chart.p.width / (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1);
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

export function indicateNotActiveToken(id, mod = true) {
  var indicatorId = "overview_ind_t_" + id;
  if (mod) {
    var x = overviewIndicatorScale(id);

    chart.overviewIndicatorGroup
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
