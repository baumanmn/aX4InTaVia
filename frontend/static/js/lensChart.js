import * as d3 from "d3";
//import * as d3 from "../node_modules/d3";
//import * as d3 from "../node_modules/d3/build/d3.js";
import {
  drawSemiAggregatedDetailBars,
  drawAggregatedDetailBars,
} from "./drawBars.js";

const initialLensWidth = 200;
const initiallensSize = 15;
const lensMaxSize = 100;
const lensMinSize = 6;

export function lensChart(chart) {
  var users = chart.d.users.slice();
  var tokenBarHeight = chart.p.annotatorBandsExt;
  var userHeight = chart.p.userHeight;
  var l = users.length;

  var dist = (tokenBarHeight - l * userHeight) / (l + 1);

  var lens = false; //persistent lens
  var shortlens = false; //transient lens

  var binNumber; //id of the clicked bin
  var tokenNumber; //id of the clicked token

  var tempMode = chart.modeDetail;
  var container = d3.select("#detailFG");

  var lensSize = initiallensSize; //# of tokens/bins in the lens
  chart.p.lensWidth = initialLensWidth; //tokenExt of the lens

  //region auxiliary functions
  function getX(m) {
    return m - chart.p.lensWidth / 2;
  }

  function closeLens() {
    if (!lens) {
      shortlens = false;
      container.on("mousemove", null);
      chart.lensWindow.style("display", "none");
    }
  }

  function changeMode() {
    chart.lensDetailBTokens_Bins.selectAll("*").remove();
    chart.lensUserTokens_Bins.selectAll("*").remove();
    chart.lensUserAnnos.selectAll("*").remove();
    chart.lensChunks.selectAll("*").remove();
    if (tempMode === "aggregated") {
      tempMode = "semiAggregated";
    } else {
      tempMode = "aggregated";
    }
  }

  function updateLensBins() {
    if (binNumber - lensSize > 0) {
      //lensBins = chart.lensBins.slice(binNumber - lensSize, binNumber + lensSize + 1);
      return [binNumber - lensSize, binNumber + lensSize];
    } else {
      //lensBins = chart.lensBins.slice(0, binNumber + lensSize + 1);
      return [0, binNumber + lensSize];
    }
  }

  function updateLensTokens() {
    if (tokenNumber - lensSize > 0) {
      //lensTokens = chart.d.tokens.slice(tokenNumber - lensSize, tokenNumber + lensSize + 1);
      return [tokenNumber - lensSize, tokenNumber + lensSize];
    } else {
      //lensTokens = chart.d.tokens.slice(0, tokenNumber + lensSize + 1);
      return [0, tokenNumber + lensSize];
    }
  }

  //endregion

  //region lens event-handling
  //lens-zooming
  d3.select("body").on("keypress", function () {
    if (lens || shortlens) {
      if (d3.event.key === "1") {
        if (lensSize <= lensMaxSize / 2) {
          lensSize++;
        }
      }
      if (d3.event.key === "2") {
        if (lensSize > lensMinSize / 2) {
          lensSize--;
        }
      }
      if (chart.modeDetail === "aggregated") {
        //updateLensBins();
        //updatelensAggregated(lensBins);
        drawAggregatedDetailBars(chart, updateLensBins(), true);
      } else {
        drawSemiAggregatedDetailBars(chart, updateLensTokens(), true);
      }
    }
  });

  // d3.select("body").on("mousewheel", function () {
  //
  //     if (lens || shortlens) {
  //         d3.event.preventDefault();
  //         if (d3.event.wheelDelta < 0) {
  //             if (lensSize <= lensMaxSize / 2) {
  //                 lensSize++;
  //             }
  //         } else {
  //
  //             if (lensSize > lensMinSize / 2) {
  //                 lensSize--;
  //             }
  //         }
  //         if (chart.modeDetail === "aggregated") {
  //             updatelensBins();
  //             updatelensAggregated(lensBins);
  //         }else {
  //             updatelensTokens();
  //             updatelensSemiAggregated(lensTokens);
  //         }
  //
  //
  //     }
  //
  // });

  container.on("contextmenu", function () {
    d3.event.preventDefault();
  });

  container.on("mousedown", function () {
    if (
      chart.modeDetail === "aggregated" ||
      chart.modeDetail === "semiAggregated"
    ) {
      if (lens) {
        container.on("mousemove", null);
        chart.lensWindow.style("display", "none");
        lens = false;
      }

      if (d3.event.which === 3) {
        updateLensPosition(d3.mouse(this)[0]);
        container.on("mousemove", updateLensPosition);
        shortlens = true;
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
          lens = !lens;
          if (lens) {
            updateLensPosition(d3.mouse(this)[0]);
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

  function updateLensPosition(mouseX = d3.mouse(this)[0]) {
    var proc = mouseX / chart.p.tokenExt;

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
            (chart.p.wordViewConnectorsExt + chart.p.wordViewExt) +
            ")"
        );
    } else if (mouseX > chart.p.tokenExt - chart.p.lensWidth / 2) {
      //closer to right tool-border than half-lens
      chart.lensWindow
        .style("display", "block")
        .attr(
          "transform",
          "translate(" +
            (chart.p.tokenExt - chart.p.lensWidth) +
            "," +
            (chart.p.wordViewConnectorsExt + chart.p.wordViewExt) +
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
            (chart.p.wordViewConnectorsExt + chart.p.wordViewExt) +
            ")"
        );
    }

    //adjust the token-mode
    if (tempMode !== chart.modeDetail) {
      changeMode();
    }

    //draw the bars within the lens
    if (chart.modeDetail === "aggregated") {
      var id = Math.floor(
        (chart.p.binRange[1] - chart.p.binRange[0] + 1) * proc
      );
      binNumber = chart.p.binRange[0] + id;

      drawAggregatedDetailBars(chart, updateLensBins(), true);
    }

    if (chart.modeDetail === "semiAggregated") {
      var id = Math.floor(
        (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1) * proc
      );
      tokenNumber = chart.d.tokenRange[0] + id;

      drawSemiAggregatedDetailBars(chart, updateLensTokens(), true);
    }
  }

  //endregion

  //region groups & fixed rects
  //the lens window
  chart.lensWindow = chart.detail
    .append("g")
    .attr("id", "lensWindowGroup")
    .style("pointer-events", "none")
    .style("display", "none");

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
        -(chart.p.wordViewConnectorsExt + chart.p.wordViewExt) +
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
