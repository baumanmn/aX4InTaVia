import * as d3 from "d3";
import $ from "jquery"; //Jena
import { extractChunks } from "./drawBars.js";
import { typeRect } from "./colorMaps";
import { convertLastOverviewPosition } from "./overview.js";
import {
  getBrushState,
  getFamilyOfBrush,
  getLinkedBrushKey,
  isPartOfSubtree,
} from "./drawChart.js";
import { projection } from "./brushIndicators.js";

var chart;
var tempTokenRange;

const viewsObject = {
  views: {},
  numViews: 0,
};

function brushAlreadyLinkedToView(brushKey) {
  let same = false;
  for (let i = 0; i < Object.keys(viewsObject["views"]).length; i++) {
    let currKey = viewsObject["views"][i]["brushKey"];
    if (currKey === brushKey) {
      same = true;
    }
  }

  return same;
}

/**
 * Initialize the text area and implement the first text view.
 * Process and fill the text view with all processed text tokens.
 * @param {Chart} globalChart
 */
export function initTextArea(globalChart, brushKey) {
  chart = globalChart;
  tempTokenRange = chart.d.tokenRange;

  const viewNr = viewsObject["numViews"];
  const viewID = "view_" + viewNr;
  //const viewClass = chart.activeNodes[brushKey];
  viewsObject["numViews"] += 1;

  d3.select("body").append("div").attr("class", "textArea");

  const view = d3
    .select(".textArea")
    .append("div")
    .attr("id", viewID)
    .attr("class", "splitView");

  let j = 0;
  for (let i = 0; i < chart.d.tokens.length; i++) {
    view
      .append("span")
      .text(chart.d.tokens[i].text)
      .attr("id", "tx_t_" + chart.d.tokens[i].id)
      .attr("class", "tx_t");
    chart.d.spanIDTable[chart.d.tokens[i].id] = j;
    j++;
    if (chart.d.tokens[i + 1]) {
      if (chart.d.tokens[i].end !== chart.d.tokens[i + 1].start) {
        j++;
        view
          .append("span")
          .text(" ")
          .attr("class", "text_whitespace")
          .attr("id", "tx_w_" + chart.d.tokens[i].id);
        //chart.d.spans.push($("#tx_w_" + chart.d.tokens[i].id))
      }
    }
  }
  chart.d.spans = Array.from($("#" + viewID).find("span"));
  viewsObject["views"][viewNr] = {
    view,
    brushKey,
    viewID,
  };
  upadateTextChunks(chart);
}

export function updateTextview(chart, brushKey) {
  /* let brushItself = -1;
  let sameSubTree = -1;
  for (let i = 0; i < Object.keys(viewsObject["views"]).length; i++) {
    let currKey = viewsObject["views"][i]["brushKey"];
    if (currKey === brushKey) {
      brushItself = i;
    } else {
      sameSubTree = getLinkedBrushKey(chart, isPartOfSubtree(chart, brushKey));
    }
  }
  let idx = brushItself > -1 ? brushItself : sameSubTree;
  console.log(idx);

  if (idx > -1) {
    fillTextView(chart, idx);
  } */
  for (let i = 0; i < viewsObject["numViews"]; i++) {
    fillTextView(chart, i);
  }
}

export function resetTextviews() {
  const textArea = document.getElementsByClassName("textArea")[0];

  textArea.style.gridTemplateRows = "100%";

  for (let i = 0; i < viewsObject["numViews"]; i++) {
    let currID = viewsObject["views"][i]["viewID"];
    document.getElementById(currID).remove();
  }
  viewsObject["numViews"] = 0;
  viewsObject["views"] = {};
}

export function replaceTextview(chart, oldBrushKey, newBrushKey) {
  let idx = -1;
  for (let i = 0; i < Object.keys(viewsObject["views"]).length; i++) {
    let currKey = viewsObject["views"][i]["brushKey"];
    if (currKey === oldBrushKey) {
      idx = i;
    }
  }

  if (idx > -1) {
    viewsObject["views"][idx]["brushKey"] = newBrushKey;
    fillTextView(chart, idx);
  }
}

export function addMultipleTextviews(chart, keyList) {
  if (keyList.length === 0) return;
  resetTextviews();
  const textArea = document.getElementsByClassName("textArea")[0];

  viewsObject["numViews"] = keyList.length;

  textArea.style.gridTemplateRows =
    "repeat(" + viewsObject["numViews"] + ", 1fr)";

  keyList.forEach((brushKey, idx) => {
    const viewNr = idx;
    const viewID = "view_" + viewNr;
    const viewClass = chart.activeNodes[brushKey];

    const view = d3
      .select(".textArea")
      .append("div")
      .attr("id", viewID)
      .attr("class", "splitView " + viewClass);

    viewsObject["views"][viewNr] = {
      view,
      brushKey,
      viewID,
    };
  });

  for (let i = 0; i < viewsObject["numViews"]; i++) {
    fillTextView(chart, i);
  }
}

export function addTextview(chart, brushKey) {
  if (brushAlreadyLinkedToView(brushKey) === true) return;
  const textArea = document.getElementsByClassName("textArea")[0];

  const viewNr = viewsObject["numViews"];
  const viewID = "view_" + viewNr;
  viewsObject["numViews"] += 1;

  textArea.style.gridTemplateRows =
    "repeat(" + viewsObject["numViews"] + ", 1fr)";

  const view = d3
    .select(".textArea")
    .append("div")
    .attr("id", viewID)
    .attr("class", "splitView");

  viewsObject["views"][viewNr] = {
    view,
    brushKey,
    viewID,
  };

  for (let i = 0; i < viewsObject["numViews"]; i++) {
    fillTextView(chart, i);
  }
}

export function removeTextview(chart, brushKey) {
  const textArea = document.getElementsByClassName("textArea")[0];

  viewsObject["numViews"] -= 1;

  textArea.style.gridTemplateRows =
    viewsObject["numViews"] > 0
      ? "repeat(" + viewsObject["numViews"] + ", 1fr)"
      : "100%";

  let idx = -1;
  for (let i = 0; i < Object.keys(viewsObject["views"]).length; i++) {
    let currKey = viewsObject["views"][i]["brushKey"];
    if (currKey === brushKey) {
      idx = i;
    }
  }

  if (idx > -1) {
    viewsObject["views"][idx]["view"].remove();
  }

  delete viewsObject["views"][idx];

  for (let i = 0; i < viewsObject["numViews"]; i++) {
    fillTextView(chart, i);
  }
}

function fillTextView(chart, idx) {
  let targetViewObj = viewsObject["views"][idx];
  let targetView = viewsObject["views"][idx]["view"];
  let targetViewID = viewsObject["views"][idx]["viewID"];

  //targetView.empty();
  const container = document.getElementById(targetViewID);
  container.innerHTML = "";
  //d3.select(targetView[0]).html("");

  let convertedRanges = cascadingProjection(chart, targetViewObj["brushKey"]);

  let oLeft = parseInt(convertedRanges[0][0]);
  let oRight = Math.min(
    parseInt(convertedRanges[0][1]),
    chart.d.bins.length - 1
  );
  let sLeft = parseInt(convertedRanges[1][0]);
  let sRight = Math.min(
    parseInt(convertedRanges[1][1]),
    chart.d.bins.length - 1
  );

  oLeft = chart.d.bins[oLeft].tokens[0].id;
  oRight = chart.d.bins[oRight].tokens[0].id;
  sLeft = chart.d.bins[sLeft].tokens[0].id;
  sRight = chart.d.bins[sRight].tokens[0].id;

  const spans = chart.d.spans.slice(oLeft, oRight);
  spans.forEach((span) => {
    container.appendChild(span);
  });

  let color = "lightgray";
  for (
    let i = chart.d.spanIDTable[sLeft];
    i <= chart.d.spanIDTable[sRight];
    i++
  ) {
    let span = chart.d.spans[i];
    //d3.select(targetView).append($(span));

    let currentID = $(span).attr("id").match(/\d+/)[0];
    if ($(span).hasClass("tx_t")) {
      d3.select("#tx_t_" + currentID)
        //.style("background-color", color)
        .style("background-color", "white")
        .style("opacity", "1.0")
        .classed("txt_t", true)
        .classed("active_tx_t", true)
        .classed("inactive_tx_t", false);
    } else {
      d3.select("#tx_w_" + currentID)
        .style("opacity", "1.0")
        .style("background-color", "white"); //.style("background-color", color);
    }
  }
  for (
    let i = chart.d.spanIDTable[oLeft];
    i < chart.d.spanIDTable[sLeft];
    i++
  ) {
    let span = chart.d.spans[i];
    //targetView.append(span);

    let currentID = $(span).attr("id").match(/\d+/)[0];
    if ($(span).hasClass("tx_t")) {
      d3.select("#tx_t_" + currentID)
        .style("background-color", "white")
        .style("opacity", "0.5")
        .classed("txt_t", true)
        .classed("inactive_tx_t", true)
        .classed("active_tx_t", false);
    } else {
      d3.select("#tx_w_" + currentID)
        .style("opacity", "0.5")
        .style("background-color", "white");
    }
  }
  for (
    let i = chart.d.spanIDTable[sRight + 1];
    i <= chart.d.spanIDTable[oRight];
    i++
  ) {
    let span = chart.d.spans[i];
    //targetView.append(span);

    let currentID = $(span).attr("id").match(/\d+/)[0];
    if ($(span).hasClass("tx_t")) {
      d3.select("#tx_t_" + currentID)
        .style("background-color", "white")
        .style("opacity", "0.5")
        .classed("txt_t", true)
        .classed("inactive_tx_t", true)
        .classed("active_tx_t", false);
    } else {
      d3.select("#tx_w_" + currentID)
        .style("opacity", "0.5")
        .style("background-color", "white");
    }
  }
}

/**
 *
 * Auxillary function calling the coloring function for each of the three views
 * @param {*} chart
 * @param {*} mod
 */
export function updateTextArea(chart) {
  return 0;
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

export function cascadingProjection(chart, brushKey) {
  let predecStack = [];
  let parent = brushKey;
  while (parent && parent !== chart.p.parentBrushPlaceholderID) {
    predecStack.push(parent);
    let familyData = getFamilyOfBrush(chart, parent);
    parent = familyData["parent"];
  }

  predecStack.reverse();

  const referenceLength = chart.p.tokenExt;

  const rootParent = predecStack.shift();

  const rootBrushData = getBrushState(chart, rootParent);

  const rootBrushRanges = rootBrushData["selection"];

  let L_parent_transf = rootBrushRanges[1] - rootBrushRanges[0];

  let X_parent_transf = rootBrushRanges[0];

  let convertedOverlay = rootBrushData["overlay"];

  let convertedSelection = rootBrushData["selection"];

  while (predecStack.length > 0) {
    let childKey = predecStack.shift();

    let childBrushState = getBrushState(chart, childKey);

    let childSelection = childBrushState["selection"];

    convertedSelection = projection(
      referenceLength,
      L_parent_transf,
      X_parent_transf,
      childSelection
    );

    let childOverlay = childBrushState["overlay"];

    convertedOverlay = projection(
      referenceLength,
      L_parent_transf,
      X_parent_transf,
      childOverlay
    );

    L_parent_transf = convertedSelection[1] - convertedSelection[0];
    X_parent_transf = convertedSelection[0];
  }

  return [convertedOverlay, convertedSelection];
}
