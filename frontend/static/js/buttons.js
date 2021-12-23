//region imports
import * as d3 from "d3";
import { setAnnotationWindows } from "./splitAnnotationWindow";
import {
  getActiveBrushesInOverview,
  getFamilyOfBrush,
  updateOverviewConfig,
  clearOverviewStrips,
  setButtonRefInList,
  colorActiveTree,
  addWorkBenchbrush,
  isButtonAssignedToWorkbench,
  removeWorkbenchBrushViaBrushKey,
} from "./drawChart";
import {
  cascadingButtonIndicatorUpdate,
  drawRootButtonTreeNodeIndicators,
} from "./brushIndicators";
import { addMultipleTextviews } from "./textArea";
//endregion

const overviewMapExt = 750; //MB TODO rename
const overviewMapDepthExt = 120;

//containers
//var wrapperDiv; //div holding both the buttons and the workbench
var svg; //button svg

/**
 * Add a div as the container for the buttons and the workbench,
 * create the initial button structure and initialize the workbench
 * @param {*} chart
 */
export function initializeButtonContainer(chart) {
  var container = d3.select("body");
  svg = container
    .append("svg")
    .attr("id", "buttonsTBD")
    //.attr("height", "100%")
    .attr("width", chart.p.buttonsWidth) //MB TODO split windows, add viewbox
    .attr("height", overviewMapExt);
}

export function drawButtonTree(chart) {
  if (!svg) return 0;

  svg.selectAll("." + chart.p.activeNodeClass).remove();
  svg.selectAll("." + chart.p.activeSiblingClass).remove();
  svg.selectAll("." + chart.p.activeRelativeClass).remove();
  svg.selectAll("." + chart.p.activePredecClass).remove();
  svg.selectAll(".buttonTreeElement").remove();
  svg.selectAll(".buttonPartitionIndicator").remove();

  const externalPadding = 20;
  const internalPadding = 0.05;

  const overviewsNumerated = d3.range(chart.p.maxNumOverviews);
  overviewsNumerated.unshift(-1); //adding overview -1

  const xScale = d3
    .scaleBand()
    .domain(overviewsNumerated)
    .rangeRound([overviewMapDepthExt, externalPadding])
    .paddingInner(internalPadding);

  const buttonWidth = xScale.bandwidth();

  drawButtons(chart, xScale(-1), buttonWidth, 1, overviewMapExt - 1, [
    chart.p.rootButtonClassSuffix,
  ]);
  drawRootButtonTreeNodeIndicators(chart);

  let rootPartition = getActiveBrushesInOverview(chart, 0);

  let treeStack = [
    {
      partition: rootPartition,
      depth: 0,
      y0: 1,
      y1: overviewMapExt - 1,
    },
  ];

  while (treeStack.length > 0) {
    const nextPartitionData = treeStack.shift();
    const nextPartition = nextPartitionData["partition"];
    const overviewDepth = nextPartitionData["depth"];

    const xPos = xScale(overviewDepth);

    const ys = drawButtons(
      chart,
      xPos,
      buttonWidth,
      nextPartitionData["y0"],
      nextPartitionData["y1"],
      nextPartition
    );

    nextPartition.forEach((part) => {
      cascadingButtonIndicatorUpdate(chart, overviewDepth, part);

      const nextButtonFamily = getFamilyOfBrush(chart, part);
      const children = Array.from(nextButtonFamily["children"]);
      const y_pos = ys[part];

      if (children.length > 0) {
        treeStack.push({
          partition: children,
          depth: overviewDepth + 1,
          y0: y_pos["y0"],
          y1: y_pos["y1"],
        });
      }
    });
  }
}

const drawButtons = (chart, x, w, y0, y1, partitions) => {
  const buttonIDPrefix = chart.p.buttonTreeIDPrefix;
  const buttonTreeClass = chart.p.buttonTreeClass;

  const n = partitions.length;

  const yScale = d3.scaleBand().domain(d3.range(n)).rangeRound([y0, y1]);

  const y_pos = {};

  partitions.forEach((part, idx) => {
    const buttonID = buttonIDPrefix + part;

    const y_part = yScale(idx);
    const h_part = yScale.bandwidth();

    const button = svg
      .append("rect")
      .attr("id", buttonID)
      .attr("class", buttonTreeClass)
      .attr("x", x)
      .attr("width", w)
      .attr("y", y_part + 1)
      .attr("height", h_part - 1)
      .attr("fill", "lightgray")
      .attr("stroke", () => {
        if (isButtonAssignedToWorkbench(chart, part) === true) {
          return "white";
        } else {
          return "black";
        }
      })
      .attr("stroke-width", "1px")
      .on("click", () => buttonOnClick(chart, buttonID))
      .on("contextmenu", (e) => {
        const buttonIsAssigned = isButtonAssignedToWorkbench(chart, part);
        d3.select("#" + buttonID).attr("stroke", "gold");
        d3.select("#" + buttonID).attr("stroke-width", 2);

        buttonContextMenu(
          chart,
          part,
          x + w / 2,
          d3.event.pageY,
          buttonIsAssigned
        ); //(y_part + h_part) / 2
        d3.event.preventDefault();
      });

    setButtonRefInList(chart, part, {
      x,
      w,
      y: y_part,
      h: h_part,
    });

    y_pos[part] = {
      y0: y_part,
      y1: y_part + h_part,
    };
  });

  return y_pos;
};

export const buttonOnClick = (chart, buttonID) => {
  if (buttonID.includes("root")) return;
  chart.nodeActivityMode = "overview";
  let configData = chart.overviewConfig;

  let key = buttonID.split("_");
  key.shift();

  const brushKey = key.join("_");
  const overviewDepth = key[0];
  const partitionKey = key[key.length - 1];

  while (key.length > 1) {
    let partitionKey = key.pop();
    let strippedOverviewKey = key.join("_");

    configData[strippedOverviewKey]["active_partition"] = partitionKey;
  }

  updateOverviewConfig(chart, configData);
  clearOverviewStrips(chart);
  colorActiveTree(chart, overviewDepth, brushKey, true);
  let activeNodes = [brushKey];
  let familyData = getFamilyOfBrush(chart, brushKey);
  if (familyData && familyData["siblings"].size > 0) {
    familyData = Array.from(familyData["siblings"]);
    activeNodes = activeNodes.concat(familyData);
    activeNodes.sort();
  }
  setAnnotationWindows(chart, activeNodes);
  addMultipleTextviews(chart, activeNodes);
  /* if (
    chart.overviews[overview + 1] &&
    chart.overviews[overview + 1]["backgroundRects"]
  ) {
    let convertedBrushData = cascadingProjection(
      chart,
      getBrushConfigKey(chart, overviewDepth, sliderID)
    );
  } */
};

export function drawButtonIndicator(
  chart,
  indicatorX,
  indicatorY,
  indicatorID,
  splitIndicatorPos
) {
  const [buttonIndicatorID, splitIndicatorID] = constructButtonIndicatorIDs(
    indicatorID
  );
  const oldIndicator = d3.select("#" + buttonIndicatorID);
  if (oldIndicator) oldIndicator.remove();

  const colorMap = {};
  colorMap[chart.p.activeNodeClass] = "darkred";
  colorMap[chart.p.activeSiblingClass] = "darkred";
  colorMap[chart.p.activeRelativeClass] = "orange";
  colorMap[chart.p.activePredecClass] = "yellow";

  let childBrushID = indicatorID.split("_");
  childBrushID.shift();
  childBrushID.shift();
  childBrushID = childBrushID.join("_");
  svg
    .append("rect")
    .attr("id", buttonIndicatorID)
    .attr("class", "buttonPartitionIndicator")
    .attr("x", indicatorX[0])
    .attr("y", indicatorY[0])
    .attr("width", indicatorX[1] - indicatorX[0])
    .attr("height", indicatorY[1] - indicatorY[0]) //indicatorY[1] - indicatorY[0]
    .attr("fill", () => {
      if (chart.activeNodes[childBrushID]) {
        return colorMap[chart.activeNodes[childBrushID]];
      } else {
        return "black";
      }
    });

  if (splitIndicatorPos > 0) {
    const oldSplitIndicator = d3.select("#" + splitIndicatorID);
    if (oldSplitIndicator) oldSplitIndicator.remove();

    svg
      .append("circle")
      .attr("id", splitIndicatorID)
      .attr("class", "buttonPartitionIndicator")
      .attr("cx", indicatorX[1] - (indicatorX[1] - indicatorX[0]) / 2)
      .attr("cy", splitIndicatorPos + 1) //indicatorY[1] - indicatorY[0] + 1
      .attr("r", (indicatorX[1] - indicatorX[0]) / 2)
      .attr("fill", "black");
  }
}

export function drawRootButtonIndicator(
  chart,
  indicatorX,
  indicatorY,
  indicatorID,
  splitPos
) {
  const [buttonIndicatorID, splitIndicatorID] = constructButtonIndicatorIDs(
    indicatorID
  );
  const oldIndicator = d3.select("#" + buttonIndicatorID);
  if (oldIndicator) oldIndicator.remove();

  const colorMap = {};
  colorMap[chart.p.activeNodeClass] = "darkred";
  colorMap[chart.p.activeSiblingClass] = "darkred";
  colorMap[chart.p.activeRelativeClass] = "orange";
  colorMap[chart.p.activePredecClass] = "yellow";

  let childBrushID = indicatorID.split("_");
  childBrushID.shift();
  childBrushID.shift();
  childBrushID = childBrushID.join("_");

  svg
    .append("rect")
    .attr("id", buttonIndicatorID)
    .attr("class", "buttonPartitionIndicator")
    .attr("x", indicatorX[0])
    .attr("y", indicatorY[0])
    .attr("width", indicatorX[1] - indicatorX[0])
    .attr("height", indicatorY[1] - indicatorY[0]) //indicatorY[1] - indicatorY[0]
    .attr("fill", () => {
      if (chart.activeNodes[childBrushID]) {
        return colorMap[chart.activeNodes[childBrushID]];
      } else {
        return "black";
      }
    });
  //.attr("fill", "black");

  if (splitPos < chart.p.tokenExt) {
    const oldSplitIndicator = d3.select("#" + splitIndicatorID);
    if (oldSplitIndicator) oldSplitIndicator.remove();

    svg
      .append("circle")
      .attr("id", splitIndicatorID)
      .attr("class", "buttonPartitionIndicator")
      .attr("cx", indicatorX[1] - (indicatorX[1] - indicatorX[0]) / 2)
      .attr("cy", splitPos)
      .attr("r", (indicatorX[1] - indicatorX[0]) / 2)
      .attr("fill", "black");
  }
}

const constructButtonIndicatorIDs = (indicatorID) => {
  const buttonPrefix = "button_";
  const splitPrefix = "button_split_";
  return [buttonPrefix + indicatorID, splitPrefix + indicatorID];
};

function buttonContextMenu(chart, brushKey, x, y, alreadyAssigned) {
  const menuWidth = alreadyAssigned ? 150 : 100;
  const menuHeight = 30;
  const fontSize = 12;
  const roundness = 6;

  const btn = d3.select("#" + chart.p.buttonTreeIDPrefix + brushKey);

  if (!d3.select("#buttonContextMenu").empty()) {
    d3.select("#buttonContextMenu").remove();
    d3.select("#buttonContextMenuText").remove();
  }
  let menu = svg
    .append("rect")
    .attr("id", "buttonContextMenu")
    .attr("x", x)
    .attr("y", y)
    .attr("rx", roundness)
    .attr("ry", roundness)
    .attr("width", menuWidth)
    .attr("height", menuHeight)
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .attr("fill", "white")
    .attr("cursor", "pointer")
    .on("click", () => {
      if (alreadyAssigned) {
        removeWorkbenchBrushViaBrushKey(chart, brushKey);
      } else {
        addWorkBenchbrush(chart, brushKey);
      }
      btn.attr("stroke", "black");
      btn.attr("stroke-width", 1);
      menu.remove();
      text.remove();
    });

  let text = svg
    .append("text")
    .attr("id", "buttonContextMenuText")
    .attr("x", x + menuWidth / 2)
    .attr("y", y + menuHeight / 2 + fontSize / 2)
    .attr("font-size", fontSize)
    .attr("cursor", "pointer")
    .attr("text-anchor", "middle")
    .text(() => {
      if (alreadyAssigned) {
        return "Remove from Workbench";
      } else {
        return "Add to Workbench";
      }
    })
    .on("click", () => {
      if (alreadyAssigned) {
        removeWorkbenchBrushViaBrushKey(chart, brushKey);
      } else {
        addWorkBenchbrush(chart, brushKey);
      }
      btn.attr("stroke", "black");
      btn.attr("stroke-width", 1);
      menu.remove();
      text.remove();
    });

  setTimeout(() => {
    menu.remove();
    text.remove();
    btn.attr("stroke", "black");
    btn.attr("stroke-width", 1);
  }, 5000);
}
