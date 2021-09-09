import * as d3 from "d3";
import {
  drawSemiAggregatedDetailBars,
  drawAggregatedDetailBars,
  drawAtomicDetailBars,
} from "./drawBars.js";
import { StateController } from "./stateController";
import { ElemAddress } from "./elemAddress";
import { getBinIdByTokenID } from "./functions";

let chart;

const initialLensWidth = 200; //Lens width 200 px

// lens size X means . in the lens there a are  2 * X Tokens/Bins
const aInitialLensSize = 13; //Aggregated Lens initial Size
const aLensMaxSize = 300; //Aggregated Lens maximal Size
const aLensMinSize = 1; //Aggregated Lens minimal Size

const sAInitialLensSize = 10; // SemiAggregated Lens initial Size
const sALensMaxSize = 49; //SemiAggregated Lens maximal Size
const sALensMinSize = 6; // SemiAggregated Lens minimal Size

var binNumber; //id of the clicked bin
var tokenNumber; //id of the clicked token
var freezeToken; //id of freeze Token

var aLensSize = aInitialLensSize; // number  of bins/2 in the lens
var sALensSize = sAInitialLensSize; //number  of tokens/2 in the lens
var lensTempMode = ""; // what was the last lens mode
var container;

export function initLens(globalChart) {
  chart = globalChart;

  var lensEventTriggerHeight =
    chart.p.tokenPolygonHeight + chart.p.tokenTextHeight;
  var users = chart.d.users.slice();
  var tokenBarHeight = chart.p.tokenBarHeight;
  var userHeight = chart.p.userHeight;
  var l = users.length;
  var dist = (tokenBarHeight - l * userHeight) / (l + 1);
  chart.d.lens = false; //persistent lens
  chart.d.shortlens = false; //transient lens
  container = d3.select("#detail_g");
  chart.p.lensWidth = initialLensWidth; //width of the lens

  //region lens event-handling
  //lens-zooming
  d3.select("body").on("keypress", function () {
    if (chart.d.lens || chart.d.shortlens) {
      if (d3.event.key === "1") {
        if (chart.modeDetail === "aggregated") {
          if (aLensSize <= aLensMaxSize / 2) {
            aLensSize++;
          }
        } else {
          if (sALensSize <= sALensMaxSize / 2) {
            sALensSize++;
          }
        }
      }
      if (d3.event.key === "2") {
        if (chart.modeDetail === "aggregated") {
          if (aLensSize > aLensMinSize / 2) {
            aLensSize--;
          }
        } else {
          if (sALensSize > sALensMinSize / 2) {
            sALensSize--;
          }
        }
      }
      if (chart.modeDetail === "aggregated") {
        //updateLensBins();
        //updatelensAggregated(lensBins);
        // drawSemiAggregatedDetailBars(chart, updateLensBins(), true);
        drawAggregatedLensDetailBars();
        StateController.deactivatedHoveredElements();
      } else {
        // drawSemiAggregatedDetailBars(chart, updateLensTokens(), true);
        drawSemiAggregatedLensDetailBars();
        // drawAtomicDetailBars(chart, updateLensTokens(), true);
        StateController.deactivatedHoveredElements();
      }
    }
  });

  container.on("contextmenu", function () {
    d3.event.preventDefault();
  });

  container.on("mousedown", function () {
    if (d3.mouse(this)[1] > lensEventTriggerHeight) {
      if (
        chart.modeDetail === "aggregated" ||
        chart.modeDetail === "semiAggregated"
      ) {
        if (chart.d.lens) {
          container.on("mousemove", null);
          chart.lensWindow.style("display", "none");
          chart.d.lens = false;
        }

        if (d3.event.which === 3) {
          updateLensPosition(d3.mouse(this)[0]);
          container.on("mousemove", updateLensPosition);
          chart.d.shortlens = true;
          // offEvent();
        }
      }
    }
  });

  container.on("mouseup", function () {
    if (d3.event.which === 3) {
      if (d3.event.detail === 2) {
        //double right click
        if (
          chart.modeDetail === "aggregated" ||
          chart.modeDetail === "semiAggregated"
        ) {
          chart.d.lens = !chart.d.lens;
          if (chart.d.lens) {
            updateLensPosition(d3.mouse(this)[0], true);
            container.on("mousemove", null);
          } else {
            container.on("mousemove", null);
            chart.lensWindow.style("display", "none");
          }
        }
      } else if (d3.event.detail === 1) {
        //single right-click
        setTimeout(closeLens, 0);
      }
    }
  });

  chart.lensWindow = chart.detail
    .append("g")
    .attr("id", "lensWindowGroup")
    .attr("clip-path", "url(#lens-clip)")
    .style("pointer-events", "none")
    .style("display", "none");

  chart.lensWindow
    .append("clipPath") // define a clip path
    .attr("id", "lens-clip")
    .append("rect")
    .attr("width", chart.p.lensWidth + 1)
    .attr("height", tokenBarHeight);

  //lens window background-rect
  chart.lensWindow
    .append("rect")
    .attr("id", "lensBackground")
    .attr("width", chart.p.lensWidth)
    .attr("height", tokenBarHeight);

  //lens background-tokens for all users
  chart.lensDetailBTokens_Bins = chart.lensWindow
    .append("g")
    .attr("id", "lensDetailBTG")
    .attr(
      "transform",
      "translate(" +
        0 +
        "," +
        -(chart.p.tokenPolygonHeight + chart.p.tokenTextHeight) +
        ")"
    );

  //lens groups per user
  chart.lensUserLayers = chart.lensWindow
    .selectAll("g.userLayer")
    .data(users)
    .enter()
    .append("g")
    .attr("class", "userLayer")
    .attr("id", function (d) {
      return "lensUserLayerG" + d;
    })
    .attr("transform", function (d, i) {
      var offset = dist * (i + 1) + i * userHeight;
      return "translate(" + 0 + "," + offset + ")";
    });

  //drop-shadow-rect per user
  chart.lensUserLayers
    .append("rect")
    .attr("x", 0)
    .attr("width", chart.p.lensWidth)
    .attr("y", 0)
    .attr("height", chart.p.userHeight)
    .attr("class", "userLayerBG")
    .attr("filter", "url(#dropshadow)");

  //the groups for the token/bin-rects per user
  chart.lensUserTokens_Bins = chart.lensUserLayers
    .append("g")
    .attr("id", function (d) {
      return "lensUserTokens_BinsG" + d;
    });

  //the groups for the anno/token-marks per user
  chart.lensUserAnnos = chart.lensUserLayers
    .append("g")
    .attr("id", function (d) {
      return "lensUserAnnosG" + d;
    });

  //the groups for the atomic frames per user
  chart.lensUserAtomicFrames = chart.lensUserLayers
    .append("g")
    .attr("id", function (d) {
      return "lensUserAtomicFrames" + d;
    });
  // .style("pointer-events", "none");

  //the groups for the anno-chunks (g) per user
  chart.lensChunks = chart.lensUserLayers.append("g").attr("id", function (d) {
    return "lensChunksG" + d;
  });

  //frame-rect per user
  chart.lensUserLayers
    .append("rect")
    .attr("x", 0)
    .attr("width", chart.p.lensWidth)
    .attr("y", 0)
    .attr("height", chart.p.userHeight)
    .attr("stroke-dasharray", `${chart.p.lensWidth}, ${chart.p.userHeight}`)
    .attr("class", "userLayerBG_stroke");

  //lens window frame-rect
  chart.lensWindow
    .append("rect")
    .attr("id", "lensFrame")
    .attr("width", chart.p.lensWidth)
    .attr("height", tokenBarHeight);
  //endregion
}

function getX(m) {
  return m - chart.p.lensWidth / 2;
}

//close the lens
function closeLens() {
  if (!chart.d.lens) {
    chart.d.shortlens = false;
    container.on("mousemove", null);
    chart.lensWindow.style("display", "none");
    chart.lensDetailBTokens_Bins.selectAll("*").remove();
    chart.lensUserTokens_Bins.selectAll("*").remove();
    chart.lensUserAnnos.selectAll("*").remove();
    chart.lensChunks.selectAll("*").remove();
    chart.lensUserAtomicFrames.selectAll("*").remove();
  }
}

//if lens display mode is change, clean the lens.
function changeMode(mode) {
  if (lensTempMode != mode) {
    chart.lensDetailBTokens_Bins.selectAll("*").remove();
    chart.lensUserTokens_Bins.selectAll("*").remove();
    chart.lensUserAnnos.selectAll("*").remove();
    chart.lensChunks.selectAll("*").remove();
    chart.lensUserAtomicFrames.selectAll("*").remove();
    lensTempMode = mode;
  }
}

//get lens bins range
function updateLensBins() {
  if (
    binNumber - aLensSize >= 0 &&
    binNumber + aLensSize <= chart.d.binRange[1]
  ) {
    return [binNumber - aLensSize, binNumber + aLensSize];
  } else if (binNumber - aLensSize < 0) {
    return [0, binNumber + aLensSize];
  } else {
    return [binNumber - aLensSize, chart.d.binRange[1]];
  }
}

//get tokens range from bins range
function binRangeToTokenRange(binRange) {
  var lastBinTokens = chart.d.detailBins[binRange[1]].tokens;
  var lastTokenID = lastBinTokens[lastBinTokens.length - 1].id;
  var firstTokenID = chart.d.detailBins[binRange[0]].tokens[0].id;

  return [firstTokenID, lastTokenID];
}

function getBinsFirstToken(binID) {
  return chart.d.detailBins[binID].tokens[0].id;
}

function getBinsLastToken(binID) {
  let binTokens = chart.d.detailBins[binID].tokens;
  return binTokens[binTokens.length - 1].id;
}

//get lens tokens range
function updateLensTokens() {
  if (tokenNumber - sALensSize > 0) {
    return [tokenNumber - sALensSize, tokenNumber + sALensSize];
  } else {
    return [0, tokenNumber + sALensSize];
  }
}

export function updateLensPositionAfterBrush(rangen) {
  if (chart.modeDetail === "atomic") {
    chart.lensWindow.style("display", "none");
  } else if (chart.modeDetail === "aggregated") {
    // if (chart.d.tokenRange[0] <= firstToken  && lastToken <= chart.d.tokenRange[1]){
    if (
      chart.d.tokenRange[0] <= freezeToken &&
      freezeToken <= chart.d.tokenRange[1]
    ) {
      let binID = getBinIdByTokenID(freezeToken);
      let x =
        (1420 * (binID - chart.d.binRange[0])) /
        (chart.d.binRange[1] - chart.d.binRange[0]);
      updateLensPosition(x);
    } else {
      chart.lensWindow.style("display", "none");
    }
  } else {
    if (
      chart.d.tokenRange[0] <= freezeToken &&
      freezeToken <= chart.d.tokenRange[1]
    ) {
      let x =
        (1420 * (freezeToken - chart.d.tokenRange[0])) /
        (chart.d.tokenRange[1] - chart.d.tokenRange[0]);
      updateLensPosition(x);
    } else {
      chart.lensWindow.style("display", "none");
    }
  }
}

function updateLensPosition(mouseX = d3.mouse(this)[0], doubleClick = false) {
  var percentage = mouseX / chart.p.width;
  //move the lens-group to the right place
  if (mouseX < chart.p.lensWidth / 2) {
    //closer to left tool-border than half-lens
    chart.lensWindow
      .style("display", "block")
      .attr(
        "transform",
        "translate(" +
          0 +
          "," +
          (chart.p.tokenPolygonHeight + chart.p.tokenTextHeight) +
          ")"
      );
  } else if (mouseX > chart.p.width - chart.p.lensWidth / 2) {
    //closer to right tool-border than half-lens
    chart.lensWindow
      .style("display", "block")
      .attr(
        "transform",
        "translate(" +
          (chart.p.width - chart.p.lensWidth) +
          "," +
          (chart.p.tokenPolygonHeight + chart.p.tokenTextHeight) +
          ")"
      );
  } else {
    chart.lensWindow
      .style("display", "block") //make it visible
      .attr(
        "transform",
        "translate(" +
          getX(mouseX) +
          "," +
          (chart.p.tokenPolygonHeight + chart.p.tokenTextHeight) +
          ")"
      );
  }
  //draw the bars within the lens
  if (chart.modeDetail === "aggregated") {
    var id = Math.floor(
      (chart.p.binRange[1] - chart.p.binRange[0] + 1) * percentage
    );
    binNumber = chart.p.binRange[0] + id;
    if (doubleClick) {
      freezeToken = chart.d.detailBins[binNumber].tokens[0].id;
    }
    // drawSemiAggregatedDetailBars(chart, updateLensBins(), true);
    drawAggregatedLensDetailBars();
    StateController.deactivatedHoveredElements();
  }
  if (chart.modeDetail === "semiAggregated") {
    var id = Math.floor(
      (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1) * percentage
    );
    tokenNumber = chart.d.tokenRange[0] + id;
    if (doubleClick) {
      freezeToken = tokenNumber;
    }
    drawSemiAggregatedLensDetailBars();
    StateController.deactivatedHoveredElements();
  }
}

//According to lens token numbers we decide the display mode of lens
function drawAggregatedLensDetailBars() {
  var binRange = updateLensBins();
  var tokenRange = binRangeToTokenRange(binRange);
  var numberOfTokens = tokenRange[1] - tokenRange[0];
  if (numberOfTokens < initialLensWidth / chart.p.lowerTokenThreshold) {
    changeMode("Atomic");
    drawAtomicDetailBars(chart, tokenRange, true);
  } else if (numberOfTokens < initialLensWidth) {
    changeMode("SemiAggregated");
    drawSemiAggregatedDetailBars(chart, tokenRange, true);
  } else {
    changeMode("Aggregated");
    drawAggregatedDetailBars(chart, binRange, true);
  }
}

//According to lens token numbers we decide the display mode of lens
function drawSemiAggregatedLensDetailBars() {
  var tokenRange = updateLensTokens();
  var numberOfTokens = tokenRange[1] - tokenRange[0];
  if (numberOfTokens < initialLensWidth / chart.p.lowerTokenThreshold) {
    changeMode("Atomic");
    drawAtomicDetailBars(chart, tokenRange, true);
  } else if (numberOfTokens < initialLensWidth) {
    changeMode("SemiAggregated");
    drawSemiAggregatedDetailBars(chart, tokenRange, true);
  }
}
