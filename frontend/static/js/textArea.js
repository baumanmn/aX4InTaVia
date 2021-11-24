import * as d3 from "d3";
import $ from "jquery"; //Jena
import { extractChunks } from "./drawBars.js";
import { typeRect } from "./colorMaps";
import { convertLastOverviewPosition } from "./overview.js";

var chart;
var tempTokenRange;

const views = {};

/**
 * Initialize the text area and implement the first text view.
 * Process and fill the text view with all processed text tokens.
 * @param {Chart} globalChart
 */
export function initTextArea(globalChart) {
  chart = globalChart;
  tempTokenRange = chart.d.tokenRange;

  d3.select("body").append("div").attr("class", "textArea");

  const textView_0 = d3
    .select(".textArea")
    .append("div")
    .attr("id", "textView_0")
    .attr("class", "splitView");

  let j = 0;
  for (let i = 0; i < chart.d.tokens.length; i++) {
    textView_0
      .append("span")
      .text(chart.d.tokens[i].text)
      .attr("id", "tx_t_" + chart.d.tokens[i].id)
      .attr("class", "tx_t");
    chart.d.spanIDTable[chart.d.tokens[i].id] = j;
    j++;
    if (chart.d.tokens[i + 1]) {
      if (chart.d.tokens[i].end !== chart.d.tokens[i + 1].start) {
        j++;
        textView_0
          .append("span")
          .text(" ")
          .attr("class", "text_whitespace")
          .attr("id", "tx_w_" + chart.d.tokens[i].id);
        //chart.d.spans.push($("#tx_w_" + chart.d.tokens[i].id))
      }
    }
  }
  chart.d.spans = Array.from($("#textView_0").find("span"));
  views["textView_0"] = textView_0;
  upadateTextChunks(chart);
}

/**
 *
 * Auxillary function calling the coloring function for each of the three views
 * @param {*} chart
 * @param {*} mod
 */
export function updateTextArea(chart) {
  let colors = ["#F4B3B3", "#9CE9B1", "#FAFAD2"];
  for (let key in chart.textViews) {
    if (chart.textViews[key]["overviewID"] !== -1) {
      updateIndividually(chart, key, colors[key]);
    }
  }
  /* for (let key in chart.assignedRangeForViews) {
    updateIndividually(chart, key, colors[key]);
  } */
}

/**
 *
 * Color the token of the given brush with the given color.
 * Given the brush, the selection range is calculated and with that the set of tokens that is covered by the brush.
 * To update correctly, the tokens formerly within the selection range, but not anymore, need to be uncolored.
 * For that, all other tokens not within the range are manually colored white.
 * @param {*} chart
 * @param {*} brush
 * @param {*} color
 */
function updateIndividually(chart, brush, color) {
  if (brush != null) {
    /* let oLeft = chart.assignedRangeForViews[brush][0][0];
    let oRight = chart.assignedRangeForViews[brush][0][1];
    let sLeft = chart.assignedRangeForViews[brush][1][0];
    let sRight = chart.assignedRangeForViews[brush][1][1]; */

    let oLeft = chart.textViews[brush]["assignedRange"][0][0];
    let oRight = chart.textViews[brush]["assignedRange"][0][1];
    let sLeft = chart.textViews[brush]["assignedRange"][1][0];
    let sRight = chart.textViews[brush]["assignedRange"][1][1];

    oLeft =
      chart.d.bins[convertLastOverviewPosition(chart, oLeft, brush)].tokens[0]
        .id;
    oRight =
      chart.d.bins[
        Math.min(
          chart.d.bins.length - 1,
          convertLastOverviewPosition(chart, oRight, brush)
        )
      ].tokens[0].id;
    sLeft =
      chart.d.bins[convertLastOverviewPosition(chart, sLeft, brush)].tokens[0]
        .id;
    sRight =
      chart.d.bins[
        Math.min(
          chart.d.bins.length - 1,
          convertLastOverviewPosition(chart, sRight, brush)
        )
      ].tokens[0].id;

    for (
      let i = chart.d.spanIDTable[sLeft];
      i <= chart.d.spanIDTable[sRight];
      i++
    ) {
      let span = chart.d.spans[i];
      let currentID = $(span).attr("id").match(/\d+/)[0];
      if ($(span).hasClass("tx_t")) {
        d3.select("#tx_t_" + currentID)
          .style("background-color", color)
          .classed("txt_t", true)
          .classed("active_tx_t", true)
          .classed("inactive_tx_t", false);
      } else {
        d3.select("#tx_w_" + currentID).style("background-color", color);
      }
    }
    for (
      let i = chart.d.spanIDTable[oLeft];
      i < chart.d.spanIDTable[sLeft];
      i++
    ) {
      let span = chart.d.spans[i];
      let currentID = $(span).attr("id").match(/\d+/)[0];
      if ($(span).hasClass("tx_t")) {
        d3.select("#tx_t_" + currentID)
          .style("background-color", "white")
          .classed("txt_t", true)
          .classed("inactive_tx_t", true)
          .classed("active_tx_t", false);
      } else {
        d3.select("#tx_w_" + currentID).style("background-color", "white");
      }
    }
    for (
      let i = chart.d.spanIDTable[sRight + 1];
      i <= chart.d.spanIDTable[oRight];
      i++
    ) {
      let span = chart.d.spans[i];
      let currentID = $(span).attr("id").match(/\d+/)[0];
      if ($(span).hasClass("tx_t")) {
        d3.select("#tx_t_" + currentID)
          .style("background-color", "white")
          .classed("txt_t", true)
          .classed("inactive_tx_t", true)
          .classed("active_tx_t", false);
      } else {
        d3.select("#tx_w_" + currentID).style("background-color", "white");
      }
    }
  }
}

export function autoScrollTextArea(mod = true) {
  if (tempTokenRange) {
    if (mod === false) {
      tempTokenRange = chart.d.tokenRange;
    } else {
      if (
        tempTokenRange[0] === chart.d.tokenRange[0] &&
        tempTokenRange[1] !== chart.d.tokenRange[1]
      ) {
        scrollToTarget(chart.d.tokenRange[1], "end");
      } else if (
        tempTokenRange[0] !== chart.d.tokenRange[0] &&
        tempTokenRange[1] === chart.d.tokenRange[1]
      ) {
        scrollToTarget(chart.d.tokenRange[0], "start");
      } else if (
        tempTokenRange[0] > chart.d.tokenRange[0] &&
        tempTokenRange[1] > chart.d.tokenRange[1]
      ) {
        scrollToTarget(chart.d.tokenRange[0], "start");
      } else if (
        tempTokenRange[0] < chart.d.tokenRange[0] &&
        tempTokenRange[1] < chart.d.tokenRange[1]
      ) {
        scrollToTarget(chart.d.tokenRange[1], "end");
      }
      tempTokenRange = chart.d.tokenRange;
    }
  } else {
    tempTokenRange = chart.d.tokenRange;
  }
}

//scrollMod One of "start", "center", "end", or "nearest". Defaults to "center".
export function scrollToTarget(id, scrollMod) {
  /* var textTokrnId = "tx_t_" + id;
  var targetToken = document.getElementById(textTokrnId);
  if (targetToken) {
    targetToken.scrollIntoView({
      behavior: "auto",
      block: scrollMod
    });
  } */
}

//region update text Chunks
// set span classes and colors
function upadateTextChunks(chart) {
  var tokenArray = [];
  for (var i = 0; i < chart.d.tokens.length; i++) {
    tokenArray[i] = [];
  }
  // chunks which must be displayed
  var chunks = extractChunks(chart, chart.d.tokenRange); // used extractChunks from drawBars
  Object.entries(chunks).forEach(function (user) {
    user[1].forEach(function (chunk) {
      for (var i = chunk.tokens.first; i <= chunk.tokens.last; i++) {
        var type = "";
        if (chart.d.tokens[i].displayType.length === 1) {
          type = chart.d.tokens[i].displayType[0];
        }
        var color = typeRect(type, 1);
        var chunkClassName = "text_" + user[0] + "_c" + chunk.id;
        tokenArray[i].push({
          user: parseInt(user[0].slice(4)),
          id: chunk.id,
        });

        var tokenID = "#tx_t_" + i;
        d3.select(tokenID)
          .classed(chunkClassName, true)
          .classed("underline", true)
          .style("border-color", color);
        if (i !== chunk.tokens.last) {
          var whitspaceID = "#tx_w_" + i;
          if (d3.select(whitspaceID)) {
            var whiteSpace = d3
              .select(whitspaceID)
              .classed(chunkClassName, true)
              .classed("underline", true)
              .style("border-color", color);
          }
        }
      }
    });
  });
  chart.d.tokenChunks = tokenArray;
}
