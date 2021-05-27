import * as d3 from "d3";
import $ from "jquery"; //Jena
import { controller } from "./controller.js"; //Jena
import { initializeChart, fillChart } from "./drawChart.js";
import {
  drawInitialBars,
  drawSecondOverviewBars,
  drawThirdOverviewBars,
} from "./drawBars.js";
import {
  installZoom,
  installBrush,
  initializeViewAssignment,
} from "./brushSetup.js";
import { dragChart } from "./dragChart.js";
import { initLens } from "./lensChart.js";
// import { initLens } from "./newLensChart.js";
import { initTextArea, updateTextArea } from "./textArea";
import { initFilters } from "./filters";
import { initIndicator } from "./indicator";
import { initStateController } from "./stateController";
import { initElemrntAddres } from "./elemAddress";
// import { initEvents } from "./events";
import { initFunctions } from "./functions";
import { bindSliderToBrushes } from "./slider";
import { initializeButtonContainer } from "./buttons.js";
import { initializeStates } from "./overviewState.js";

var chart = initializeChart(); //draw the basic chart

d3.json("../../../backend/data/bt_debatte4.json", function (data) {
  ////beschnittener datensatz zu testzwecken
  // var data = {
  //    userAnnotations: data.userAnnotations.filter(function (anno) {
  //        return anno.annotationTokens[anno.annotationTokens.length - 1] < 150;
  //    }),
  //    size: data.size,
  //    tokens: data.tokens.slice(0, 150),
  //    users: data.users
  // };
  //beschnittener datensatz zu testzwecken
  // var data = {
  //    userAnnotations: data.userAnnotations.filter(function (anno) {
  //        return anno.annotationTokens[anno.annotationTokens.length - 1] < 500;
  //    }),
  //    size: data.size,
  //    tokens: data.tokens.slice(0, 500),
  //    users: data.users
  // };

  //HM
  // var data = {
  //    userAnnotations: data.userAnnotations.filter(function (anno) {
  //        return anno.annotationTokens[anno.annotationTokens.length - 1] <3000;
  //    }),
  //    size: data.size,
  //    tokens: data.tokens.slice(0, 3000),
  //    users: data.users
  // };

  ////beschnittener datensatz zu testzwecken
  //var data = {
  //    userAnnotations: data.userAnnotations,
  //    size: data.size,
  //    tokens: data.tokens,
  //    users: data.users.slice(0,3)
  //};

  //install the user/data-related groups in the chart and append the data
  fillChart(chart, data);

  //if (tokens.length < chart.p.tokenExt / chart.p.lowerTokenThreshold) {
  //    drawAtomicDetailBars(chart, tokens, annos, chunks);
  //    drawAtomicOverviewBars(chart, tokens);
  //}
  //else {
  //    if (tokens.length < chart.p.tokenExt) {
  //        drawSemiAggregatedDetailBars(chart, tokens);
  //        drawSemiAggretagedOverviewBars(chart, tokens);
  //    }
  //    else {
  //        var bins = preprocessData.computeBins(tokens, chart);
  //        drawAggregatedDetailBars(chart, bins, binMaxima);
  //        drawAggregatedOverviewBars(chart, bins, binMaxima);
  //    }
  //}

  //draw the initial view
  drawInitialBars(chart);
  drawSecondOverviewBars(
    chart,
    [0, chart.d.bins.length],
    [0, chart.d.tokens.length]
  );
  drawThirdOverviewBars(
    chart,
    [0, chart.d.bins.length],
    [0, chart.d.tokens.length]
  );

  initTextArea(chart);
  //initializeButtonContainer(chart);
  // initEvents(chart);
  initFunctions(chart);

  /**
   * Brushes
   */
  installZoom(chart); //MB currently defucnt
  initializeViewAssignment(chart);
  installBrush(chart, 0, {
    brushNr: 0,
    overlay: [0, chart.p.tokenExt],
    selection: [0, chart.p.tokenExt],
  });
  installBrush(chart, 1, {
    brushNr: 0,
    overlay: [0, chart.p.tokenExt],
    selection: [0, chart.p.tokenExt],
  });
  installBrush(chart, 2, {
    brushNr: 0,
    overlay: [0, chart.p.tokenExt],
    selection: [0, chart.p.tokenExt],
  });

  initializeButtonContainer(chart);

  //dragChart(chart); //HM
  //lensChart(chart); //HM
  initIndicator(chart); //HM
  // initFilters(chart);
  initElemrntAddres(chart); //HM
  initStateController(chart); //HM

  $(function () {
    controller.newMonitor("textDiv", chart);
    bindSliderToBrushes(chart, chart.p.tokenExt, 0, 1);
    bindSliderToBrushes(chart, chart.p.tokenExt, 0, 0);
    bindSliderToBrushes(chart, chart.p.tokenExt, 1, 1);
    bindSliderToBrushes(chart, chart.p.tokenExt, 1, 0);
    bindSliderToBrushes(chart, chart.p.tokenExt, 2, 1);
    bindSliderToBrushes(chart, chart.p.tokenExt, 2, 0);
    initializeStates(chart);
  });

  // initEvents(chart);
  // initFunctions(chart);
});
