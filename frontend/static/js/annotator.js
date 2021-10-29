import { createAnnotationTool } from "../annotationTool/annotationTool.js";
import $ from "jquery"; //Jena
import { controller } from "./controller.js"; //Jena
import { typeArray } from "./constants.js";
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
import { initTextArea } from "./textArea";
import { initIndicator } from "./indicator";
import { initStateController } from "./stateController";
import { initElemrntAddres } from "./elemAddress";
import { initFunctions } from "./functions";
import { bindSliderToBrushes } from "./slider";
import { initializeButtonContainer } from "./buttons.js";
import { initializeStates } from "./overviewState.js";

const tool = createAnnotationTool();
const ANNOTATION_BACKEND_URL = "/annotation_backend";

const instantiateTool = (chart, existingStore, divID = null) => {
  tool.annotate(chart.d.spans);
  tool.addPredefinedTags(typeArray);
  $(function () {
    if (Object.keys(existingStore).length !== 0) {
      tool.loadData(existingStore);
    }
    if (divID) {
      const parentDiv = document.getElementById(divID);
      tool.removeMenuOnScroll(parentDiv);
    }
  });
};

const exportToBackend = () => {
  const serializedStore = tool.serialize();
  $.ajax({
    type: "POST",
    url: ANNOTATION_BACKEND_URL,
    data: { serialized: serializedStore },
    dataType: "json",
    success: function (results) {
      var data = results["processed_data"];
      var existingStore = results["existing_store"];
      if (!data) return 0;

      document.getElementsByTagName("body")[0].innerHTML = "";

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
};

const placeHolderBtn = () => {
  const btn = document.createElement("div");
  btn.innerHTML = "Save Annotation";
  btn.style.position = "absolute";
  btn.style.height = "50px";
  btn.style.width = "150px";
  btn.style.top = "800px";
  btn.style.fontSize = "16px";
  btn.style.background = "black";
  btn.style.color = "white";
  btn.style.textAlign = "center";
  btn.style.lineHeight = "50px";
  btn.style.cursor = "pointer";

  btn.onclick = () => {
    exportToBackend();
  };
  document.getElementsByTagName("body")[0].appendChild(btn);
};

export { instantiateTool, exportToBackend, placeHolderBtn };
