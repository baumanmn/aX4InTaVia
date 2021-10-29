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
import {
  instantiateTool,
  exportToBackend,
  placeHolderBtn,
} from "./annotator.js";

$(document).ajaxStart(function () {
  let body = document.getElementsByTagName("body")[0];
  let bodyWidth = body.clientWidth;
  let loadAnimation = body.appendChild(document.createElement("div"));
  loadAnimation.setAttribute("class", "load-animation-div");
  loadAnimation.style.left = bodyWidth / 2 - 60 + "px";
});

$(document).ajaxComplete(function () {
  document.getElementsByClassName("load-animation-div")[0].remove();
});

$.ajax({
  type: "POST",
  url: "/file_names",
  data: {},
  dataType: "json",
  success: function (results) {
    let PIPELINE_KEY = "NLTK";

    let data = results["file_names"];
    let pipelines = results["pipeline_names"];
    let body = document.getElementsByTagName("body")[0];

    let bodyWidth = body.clientWidth;
    let selectorWidth = 200;
    let loaderWidth = 800;
    let margin = 20;

    let pipelineSelector = body.appendChild(document.createElement("div"));
    let loaderDiv = body.appendChild(document.createElement("div"));

    pipelineSelector.setAttribute("class", "selector-div");
    pipelineSelector.style.left =
      bodyWidth / 2 - loaderWidth / 2 - selectorWidth - margin + "px";

    let temp = pipelineSelector.appendChild(document.createElement("div"));
    temp.setAttribute("class", "title-div");
    temp.innerHTML = "NER Tagger";

    temp.onclick = function () {
      if (!pipelineSelector.classList.contains("active")) {
        pipelineSelector.classList.add("active");
        pipelineSelector.style.height = (pipelines.length + 1) * 25 + "px";

        let dataWrapper = pipelineSelector.appendChild(
          document.createElement("div")
        );
        dataWrapper.setAttribute("class", "selector-wrapper");
        dataWrapper.style.gridTemplateRows =
          "repeat(" + (pipelines.length + 1) + ", 25px)";

        let lastClicked = null;

        for (let i = 0; i < pipelines.length; i++) {
          let dataDiv = dataWrapper.appendChild(document.createElement("div"));
          dataDiv.setAttribute("class", "data-selector");
          if (i === 0) {
            dataDiv.classList.add("active");
            lastClicked = dataDiv;
          }
          dataDiv.innerHTML = pipelines[i];
          dataDiv.onclick = function () {
            PIPELINE_KEY = pipelines[i];
            if (lastClicked !== null) {
              lastClicked.classList.remove("active");
            }
            dataDiv.classList.add("active");
            lastClicked = dataDiv;
          };
        }
      } else {
        document.getElementsByClassName("selector-wrapper")[0].remove();
        pipelineSelector.classList.remove("active");
        pipelineSelector.style.height = "25px";
      }
    };

    loaderDiv.setAttribute("class", "loader-div");
    loaderDiv.style.left = bodyWidth / 2 - loaderWidth / 2 + "px";

    let titleDiv = loaderDiv.appendChild(document.createElement("div"));
    titleDiv.setAttribute("class", "title-div");
    titleDiv.innerHTML =
      "Load Dataset" +
      " or " +
      "Drop .txt or .json files into the 'data' folder and reload";

    titleDiv.onclick = function () {
      if (!loaderDiv.classList.contains("active")) {
        loaderDiv.classList.add("active");
        loaderDiv.style.height = (data.length + 1) * 25 + "px";

        let dataWrapper = loaderDiv.appendChild(document.createElement("div"));
        dataWrapper.setAttribute("class", "data-wrapper");
        dataWrapper.style.gridTemplateRows =
          "repeat(" + (data.length + 1) + ", 25px)";

        for (let i = 0; i < data.length; i++) {
          let dataDiv = dataWrapper.appendChild(document.createElement("div"));
          dataDiv.setAttribute("class", "data-selector");
          dataDiv.innerHTML = data[i];
          dataDiv.onclick = function () {
            fetchData({ key: data[i], pipeline: PIPELINE_KEY });
          };
        }
      } else {
        document.getElementsByClassName("data-wrapper")[0].remove();
        loaderDiv.classList.remove("active");
        loaderDiv.style.height = "25px";
      }
    };
  },
});

function fetchData(fetch_data) {
  document.getElementsByClassName("loader-div")[0].remove();
  document.getElementsByClassName("selector-div")[0].remove();
  $.ajax({
    type: "POST",
    url: "/retrieve_data",
    data: fetch_data,
    dataType: "json",
    success: function (results) {
      var data = results["processed_data"];
      var existingStore = results["existing_store"];
      var chart = initializeChart();

      fillChart(chart, data);

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
        instantiateTool(chart, existingStore);
        placeHolderBtn();
      });
    },
  });
} //draw the basic chart

/* var chart = initializeChart(); */

/* d3.json("/retrieve_data", function (data) {

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
 */
