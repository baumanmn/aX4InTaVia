import * as d3 from "d3";
import { updateTextArea } from "./textArea";
var chart;

export function initFilters(globalChart) {
  chart = globalChart;
  var container = d3
    .select("body")
    .append("div")
    .attr("id", "filtersDiv")
    .style("background-color", "white");

  container
    .append("input")
    .attr("checked", true)
    .attr("type", "checkbox")
    .attr("id", "hideUserTokens_Bins")
    .on("change", toggleUserTokensBins);
  container
    .append("label")
    .attr("for", "hideUserTokens_Bins")
    .text("User tokens and bins");

  container
    .append("input")
    .attr("checked", true)
    .attr("type", "checkbox")
    .attr("id", "hideAnnos")
    .on("change", toggleAnnos);
  container.append("label").attr("for", "hideAnnos").text("Hide anno");

  // updateTextArea(chart);

  // var buton = d3.select("#userDragButton7");
  // buton
  //     .append("foreignObject")
  //     .append("xhtml:body")
  //     .html("<form><input type=checkbox id=check /></form>")
  //     .on("click", function(d, i){
  //         console.log(buton.select("#check").node().checked);
  //     });
}

export function updateFilters() {
  if (chart) {
    toggleUserTokensBins();
    toggleAnnos();
  }
}

function toggleUserTokensBins() {
  if (chart.modeDetail === "aggregated") {
    if (d3.select("#hideUserTokens_Bins").property("checked")) {
      d3.selectAll(".bgBinUsr").classed("transparent", false);
    } else {
      d3.selectAll(".bgBinUsr").classed("transparent", true);
    }
  } else {
    if (d3.select("#hideUserTokens_Bins").property("checked")) {
      d3.selectAll(".bgTokenUsr").classed("transparent", false);
    } else {
      d3.selectAll(".bgTokenUsr").classed("transparent", true);
    }
  }
}

function toggleAnnos() {
  if (chart.modeDetail === "aggregated") {
    if (d3.select("#hideAnnos").property("checked")) {
      d3.selectAll(".anno").classed("transparent", false);
    } else {
      d3.selectAll(".anno").classed("transparent", true);
    }
  }
  if (chart.modeDetail === "semiAggregated") {
    if (d3.select("#hideAnnos").property("checked")) {
      d3.selectAll(".anno").classed("transparent", false);
    } else {
      d3.selectAll(".anno").classed("transparent", true);
    }
  } else {
    if (d3.select("#hideAnnos").property("checked")) {
      d3.selectAll(".type").classed("transparent", false);
    } else {
      d3.selectAll(".type").classed("transparent", true);
    }
  }
}
