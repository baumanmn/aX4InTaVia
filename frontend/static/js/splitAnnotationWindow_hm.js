import * as d3 from "d3";
import {
  newDrawAggregatedDetailBars,
  newDrawAtomicDetailBars,
  newDrawSemiAggregatedDetailBars,
} from "./drawBars.js";
import { convertBinRange } from "./drawBars";

var oldNumberOfWindows = 0; // old number of windows for comparisons
var oldRanges = []; // old ranges are for comparisons
var updateWindowArray = []; // windows need to be updated

export function drawDetailBars(chart, ranges) {
  chart.s = {
    ranges: ranges,
  };
  if (JSON.stringify(oldRanges) !== JSON.stringify(ranges)) {
    // if ranges are changed
    let numberOfWindows = ranges.length;
    chart.d.numberOfWindows = numberOfWindows;
    if (numberOfWindows !== oldNumberOfWindows) {
      // if number of windows are changed
      ranges.forEach(function (range, i) {
        updateWindowArray[i] = true; // all windows must be updated because widths are changed
      });

      //remove old split-window groups
      removeOldWindows(oldNumberOfWindows);

      //add new split-window groups
      drawNSplitWindows(chart, numberOfWindows);
      oldNumberOfWindows = numberOfWindows;
    } else {
      ranges.forEach(function (range, i) {
        //which windows need to be updated ?
        if (
          !oldRanges[i] ||
          JSON.stringify(oldRanges[i]) !== JSON.stringify(ranges[i])
        ) {
          updateWindowArray[i] = true;
        } else {
          updateWindowArray[i] = false;
        }
      });
    }

    oldRanges = ranges;

    ranges.forEach(function (range, i) {
      if (updateWindowArray[i]) {
        //update window i if updateWindowArray[i] is true
        var tokenRange =
          chart.modeOverview === "aggregated"
            ? convertBinRange(chart, range)
            : range;

        let windowWidth = Math.floor(chart.p.tokenExt / numberOfWindows);

        let options = {
          tokenRange: tokenRange,
          windowWidth: windowWidth,
          windowId: i,
          detailBTokens_Bins: chart["detailBTokens_Bins_" + i],
          userTokens_Bins: chart["userTokens_Bins_" + i],
          userAnnos: chart["userAnnos_" + i],
          chunksG: chart["Chunks_" + i],
          termsG: chart["terms_" + i],
          userAtomicFrames: chart["userAtomicFrames_" + i],
          lens: false,
        };

        updateWindow(chart, options);
      }
    });
  }
}

// detects the mode of the window, deletes the old elements and calls draw function
export function updateWindow(chart, options) {
  var numTokens = options.tokenRange[1] - options.tokenRange[0] + 1;
  if (numTokens < options.windowWidth / chart.p.lowerTokenThreshold) {
    if (
      !chart["modeDetail_" + options.windowId] ||
      chart["modeDetail_" + options.windowId] != "atomic"
    ) {
      chart["modeDetail_" + options.windowId] = "atomic";
      removeOldElements(options, options.lens);
    }
    newDrawAtomicDetailBars(chart, options);
  } else {
    if (numTokens < options.windowWidth) {
      if (
        !chart["modeDetail_" + options.windowId] ||
        chart["modeDetail_" + options.windowId] != "semiAggregated"
      ) {
        chart["modeDetail_" + options.windowId] = "semiAggregated";
        removeOldElements(options, options.lens);
      }
      newDrawSemiAggregatedDetailBars(chart, options);
    } else {
      if (
        !chart["modeDetail_" + options.windowId] ||
        chart["modeDetail_" + options.windowId] != "aggregated"
      ) {
        chart["modeDetail_" + options.windowId] = "aggregated";
        removeOldElements(options, options.lens);
      }
      newDrawAggregatedDetailBars(chart, options);
    }
  }
}

//draw new window groups
function drawNSplitWindows(chart, n) {
  let dist =
    (chart.p.annotatorBandsExt - chart.d.users.length * chart.p.userHeight) /
    (chart.d.users.length + 1);
  let windowWidth = Math.floor(chart.p.tokenExt / n);
  for (let i = 0; i < n; i++) {
    chart["splitWindow_" + i] = chart.detail
      .append("g") //the split Window  (with clip path)
      .attr("id", "splitWindowGroup_" + i)
      .attr("class", "splitWindowGroup")
      .attr("clip-path", "url(#split-clip_" + i + ")")
      // .style("pointer-events", "none")
      .attr("transform", "translate(" + (i * windowWidth + 1 * i) + ", 0)");

    // todo this is for test
    // chart["splitWindow_" + i].append("clipPath")       // define a clip path
    //   .attr("id", "split-clip_" + i)
    //   .append("rect")
    //   .attr("width", windowWidth + 1)
    //   .attr("height", chart.p.detailHeight);

    chart["splitWindow_" + i]
      .append("rect") ////a background-rect for the split Window
      .attr("id", "splitWindowBackground" + i)
      .attr("class", "splitWindowBackground")
      .attr("width", windowWidth)
      .attr("height", chart.p.annotatorExt);

    //the groups of the aggregated tokens/bins (background), the texts & connecting polygons
    chart["detailBackground_" + i] = chart["splitWindow_" + i]
      .append("g")
      .attr("id", "detailBg_g_" + i);

    chart["detailBTokens_Bins_" + i] = chart["detailBackground_" + i]
      .append("g")
      .attr("id", "detailBgT_g_" + i);

    chart["terms_" + i] = chart["detailBackground_" + i]
      .append("g")
      .attr("id", "terms_g_" + i);

    //the group of all user tokens/annos (foreground)
    chart["detailForeground_" + i] = chart["splitWindow_" + i]
      .append("g")
      .attr("id", "detailFg_g_" + i)
      .attr(
        "transform",
        `translate(0, ${chart.p.wordViewExt + chart.p.wordViewConnectorsExt})`
      );

    //user layers group
    chart["userLayers_" + i] = chart["detailForeground_" + i]
      .selectAll("g")
      .data(chart.d.users)
      .enter()
      .append("g")
      .attr("id", function (d) {
        return "userLayerG_" + i + "_" + d;
      })
      .attr("transform", function (d, j) {
        let offset = dist * (j + 1) + j * chart.p.userHeight;
        return "translate(" + 0 + "," + offset + ")";
      });

    //background-rects for each user-layer
    chart["userLayers_" + i]
      .append("rect")
      .attr("x", 0)
      .attr("width", windowWidth)
      .attr("y", 0)
      .attr("height", chart.p.userHeight)
      .attr("stroke-dasharray", `${windowWidth}, ${chart.p.userHeight}`)
      // .attr("class", "userLayerBG_stroke")
      .attr("class", "userLayerBG")
      .attr("filter", "url(#dropshadow)");

    //the groups for the token/bin-rects per user
    chart["userTokens_Bins_" + i] = chart["userLayers_" + i]
      .append("g")
      .attr("id", function (d) {
        return "userTokens_BinsG_" + i + "_" + d;
      });

    //the groups for the anno/token-marks per user
    chart["userAnnos_" + i] = chart["userLayers_" + i]
      .append("g")
      .attr("id", function (d) {
        return "userAnnosG_" + i + "_" + d;
      });

    //the groups for the atomic frames per user
    chart["userAtomicFrames_" + i] = chart["userLayers_" + i]
      .append("g")
      .attr("id", function (d) {
        return "userAtomicFrames_" + i + "_" + d;
      });

    //the groups for the anno-chunks (g) per user
    chart["Chunks_" + i] = chart["userLayers_" + i]
      .append("g")
      .attr("id", function (d) {
        return "lensChunksG" + d + "_" + i;
      });

    chart["userLayers_" + i]
      .append("rect")
      .attr("x", 0)
      .attr("width", windowWidth)
      .attr("y", 0)
      .attr("height", chart.p.userHeight)
      .attr("stroke-dasharray", `${chart.p.tokenExt}, ${chart.p.userHeight}`)
      .attr("class", "userLayerBG_stroke");

    //  split-window dividing line
    if (i !== 0) {
      // no line for first window
      chart.detail
        .append("line")
        .attr("x1", i * windowWidth)
        .attr("y1", 0)
        .attr("x2", i * windowWidth)
        .attr("y2", chart.p.annotatorExt)
        .attr("stroke", "black")
        .attr("stroke-width", "1")
        .attr("class", "splittingLine");
    }
  }
}

function removeOldElements(options, lens = false) {
  options.chunksG.selectAll("*").remove();
  options.userAtomicFrames.selectAll("*").remove();
  options.userAnnos.selectAll("*").remove();
  options.userTokens_Bins.selectAll("*").remove();
  options.detailBTokens_Bins.selectAll("*").remove();
  if (!lens) {
    options.termsG.selectAll("*").remove();
  }
}

function removeOldWindows(n) {
  d3.selectAll(".splittingLine").remove();
  for (let i = 0; i < n; i++) {
    d3.select("#splitWindowGroup_" + i).remove();
  }
}
