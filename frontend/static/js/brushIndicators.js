import {
  getBrushConfigKey,
  getBrushStateWithoutKey,
  getBrushState,
  getFamilyOfBrush,
  getBrushIndicators,
  setBrushIndicators,
  getBrushPartitionFromKey,
  getButtonRefFromList,
  setButtonRefInList,
} from "./drawChart";

import * as d3 from "d3";
import { drawButtonIndicator } from "./buttons";

const constructIndicatorID = (parentOverviewID, brushID) => {
  const indicatorIDPrefix = "idc_";
  const newIndicatorID = indicatorIDPrefix + parentOverviewID + "_" + brushID;
  return newIndicatorID;
};

export function cascadingBrushIndicatorUpdate(
  chart,
  overviewNr,
  brushPartition
) {
  const referenceLength = chart.p.tokenExt;

  const rootBrushKey = getBrushConfigKey(chart, overviewNr, brushPartition);

  const rootBrushData = getBrushState(chart, rootBrushKey);

  if (!rootBrushKey || !rootBrushData) return 0;

  const rootBrushRanges = rootBrushData["selection"];

  const root_L = rootBrushRanges[1] - rootBrushRanges[0];

  const root_X = rootBrushRanges[0];

  let currOverviewDepth = overviewNr;

  let indicatorsToUpdate = [];

  let splitsToUpdate = [];

  let successorStack = [
    { id: rootBrushKey, L_transf: root_L, X_transf: root_X },
  ];

  while (successorStack.length > 0) {
    let nextNode = successorStack.shift();

    let currBrushID = nextNode["id"];
    let L_parent_transf = nextNode["L_transf"];
    let X_parent_transf = nextNode["X_transf"];

    let childrenKeys = getFamilyOfBrush(chart, currBrushID)["children"];

    if (childrenKeys.size > 0) {
      childrenKeys.forEach((childKey, idx) => {
        let childBrushState = getBrushState(chart, childKey);

        let POS_curr = childBrushState["selection"];

        let convertedPosition = projection(
          referenceLength,
          L_parent_transf,
          X_parent_transf,
          POS_curr
        );

        let L_current_transf = convertedPosition[1] - convertedPosition[0];
        let X_current_transf = convertedPosition[0];

        indicatorsToUpdate.push({
          id: childKey,
          pos: convertedPosition,
          depth: currOverviewDepth + 1,
        });
        successorStack.push({
          id: childKey,
          L_transf: L_current_transf,
          X_transf: X_current_transf,
        });

        let childExtend = childBrushState["overlay"];
        if (childExtend[1] < chart.p.tokenExt) {
          let convertedChildExtend = projection(
            referenceLength,
            L_parent_transf,
            X_parent_transf,
            childExtend
          );
          splitsToUpdate.push({
            idx,
            pos: convertedChildExtend[1] + 1,
            depth: currOverviewDepth + 1,
          });
        }
      });
    }

    currOverviewDepth += 1;
  }

  let brushIndicators = getBrushIndicators(chart, rootBrushKey);

  let partitionIndicators = brushIndicators
    ? brushIndicators["partitions"]
    : [];
  let splitIndicators = brushIndicators ? brushIndicators["splits"] : [];

  if (partitionIndicators.length > 0) {
    partitionIndicators.forEach((indicator) => indicator.remove());
  }

  if (indicatorsToUpdate.length > 0) {
    const height = chart.p.indicatorH;

    partitionIndicators = indicatorsToUpdate.map((successor) => {
      let position = successor["pos"];
      let depth = successor["depth"];
      let indicatorID = constructIndicatorID(overviewNr, successor["id"]);

      let width = position[1] - position[0];

      let y = chart.p.indicatorYFunction(depth - 1);

      let color = chart.p.indicatorShader(depth - 1);

      return chart.overviews[overviewNr]["brushGroup"][brushPartition]
        .select("svg")
        .append("rect")
        .attr("class", "partitionIndicator")
        .attr("id", indicatorID)
        .attr("x", position[0])
        .attr("y", y)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", color);
    });
  }

  if (splitIndicators.length > 0) {
    splitIndicators.forEach((split) => split.remove());
  }

  if (splitsToUpdate.length > 0) {
    const circleSize = chart.p.splitIndicatorSize;

    splitIndicators = splitsToUpdate.map((split) => {
      let position = split["pos"];
      let depth = split["depth"];
      let y = chart.p.indicatorYFunction(depth - 1);

      return chart.overviews[overviewNr]["brushGroup"][brushPartition]
        .select("svg")
        .append("circle")
        .attr("class", "splitIndicator")
        .attr("cx", position)
        .attr("cy", y + circleSize / 2)
        .attr("r", circleSize)
        .attr("fill", "black");
    });
  }

  setBrushIndicators(chart, rootBrushKey, {
    partitions: partitionIndicators,
    splits: splitIndicators,
  });
}

export function projection(L_ref, L_parent_transf, X_parent_transf, POS_curr) {
  const pos_transformed = POS_curr.map((X) => {
    const X_transformed = X_parent_transf + (X / L_ref) * L_parent_transf;
    return X_transformed;
  });
  return pos_transformed;
}

export function ascendingBrushIndicatorUpdate(
  chart,
  overviewNr,
  brushPartition
) {
  const rootBrushKey = getBrushConfigKey(chart, overviewNr, brushPartition);

  if (!rootBrushKey) return 0;

  let currBrushID = rootBrushKey;

  let parentOverviewDepth = overviewNr - 1;

  let parentNodeKey = getFamilyOfBrush(chart, currBrushID)["parent"];

  while (parentNodeKey && parentOverviewDepth >= 0) {
    let brushPartition = getBrushPartitionFromKey(parentNodeKey);

    cascadingBrushIndicatorUpdate(chart, parentOverviewDepth, brushPartition);

    currBrushID = parentNodeKey;
    parentNodeKey = getFamilyOfBrush(chart, currBrushID)["parent"];
    parentOverviewDepth -= 1;
  }
}

export function cascadingButtonIndicatorUpdate(
  chart,
  overviewNr,
  rootBrushKey
) {
  //const rootBrushKey = getBrushConfigKey(chart, overviewNr, brushPartition);

  const rootBrushData = getBrushState(chart, rootBrushKey);

  const rootButtonData = getButtonRefFromList(chart, rootBrushKey);

  if (!rootBrushKey || !rootButtonData || !rootBrushData) return 0;

  const rootButtonY = rootButtonData["y"];

  const rootButtonHeight = rootButtonData["h"];

  const rootButtonX = rootButtonData["x"];

  const rootButtonWidth = rootButtonData["w"];

  const brushRefExtend =
    rootBrushData["overlay"][1] - rootBrushData["overlay"][0];

  const rootOverviewHeight = chart.p.overviewExt;

  let childrenKeys = getFamilyOfBrush(chart, rootBrushKey)["children"];

  if (childrenKeys.size > 0) {
    childrenKeys.forEach((childKey, idx) => {
      let indicatorID = constructIndicatorID(overviewNr, childKey);

      let childIndicator = d3.select("#" + indicatorID);

      let rootIndicatorXPosition = [
        parseInt(childIndicator.attr("x")),
        parseInt(childIndicator.attr("x")) +
          parseInt(childIndicator.attr("width")),
      ];

      let rootIndicatorYPosition = [
        parseInt(childIndicator.attr("y")),
        parseInt(childIndicator.attr("y")) +
          parseInt(childIndicator.attr("height")),
      ];

      let convertedY = projection(
        brushRefExtend,
        rootButtonHeight,
        rootButtonY,
        rootIndicatorXPosition
      );

      /* let convertedX = projection(
        rootOverviewHeight,
        rootButtonWidth,
        rootButtonX,
        rootIndicatorYPosition
      ); */

      let convertedX = [
        rootButtonX + (1 / 4) * rootButtonWidth,
        rootButtonX + (3 / 4) * rootButtonWidth,
      ];

      drawButtonIndicator(chart, convertedX, convertedY, indicatorID);

      //draw indicator in button: Need button x, width to determine pos. of indicator

      //TODO

      /* let childExtend = childBrushState["overlay"];
      if (childExtend[1] < chart.p.tokenExt) {
        let convertedChildExtend = projection(
          referenceLength,
          L_parent_transf,
          X_parent_transf,
          childExtend
        );
        splitsToUpdate.push({
          idx,
          pos: convertedChildExtend[1] + 1,
          depth: currOverviewDepth + 1,
        });
      } */
    });
  }

  /* let brushIndicators = getBrushIndicators(chart, rootBrushKey);

  let partitionIndicators = brushIndicators
    ? brushIndicators["partitions"]
    : [];
  let splitIndicators = brushIndicators ? brushIndicators["splits"] : [];

  if (partitionIndicators.length > 0) {
    partitionIndicators.forEach((indicator) => indicator.remove());
  }

  if (indicatorsToUpdate.length > 0) {
    const height = chart.p.indicatorH;

    partitionIndicators = indicatorsToUpdate.map((successor) => {
      let position = successor["pos"];
      let depth = successor["depth"];
      let indicatorID = constructIndicatorID(overviewNr, successor["id"]);

      let width = position[1] - position[0];

      let y = chart.p.indicatorYFunction(depth - 1);

      let color = chart.p.indicatorShader(depth - 1);

      return chart.overviews[overviewNr]["brushGroup"][brushPartition]
        .select("svg")
        .append("rect")
        .attr("class", "partitionIndicator")
        .attr("id", indicatorID)
        .attr("x", position[0])
        .attr("y", y)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", color);
    });
  }

  if (splitIndicators.length > 0) {
    splitIndicators.forEach((split) => split.remove());
  }

  if (splitsToUpdate.length > 0) {
    const circleSize = chart.p.splitIndicatorSize;

    splitIndicators = splitsToUpdate.map((split) => {
      let position = split["pos"];
      let depth = split["depth"];
      let y = chart.p.indicatorYFunction(depth - 1);

      return chart.overviews[overviewNr]["brushGroup"][brushPartition]
        .select("svg")
        .append("circle")
        .attr("class", "splitIndicator")
        .attr("cx", position)
        .attr("cy", y + circleSize / 2)
        .attr("r", circleSize)
        .attr("fill", "black");
    });
  } */
}

export function ascendingButtonIndicatorUpdate(
  chart,
  overviewNr,
  brushPartition
) {
  const rootBrushKey = getBrushConfigKey(chart, overviewNr, brushPartition);

  if (!rootBrushKey) return 0;

  let currBrushID = rootBrushKey;

  let parentOverviewDepth = overviewNr - 1;

  let parentNodeKey = getFamilyOfBrush(chart, currBrushID)["parent"];

  while (parentNodeKey && parentOverviewDepth >= 0) {
    cascadingButtonIndicatorUpdate(chart, parentOverviewDepth, parentNodeKey);

    currBrushID = parentNodeKey;
    parentNodeKey = getFamilyOfBrush(chart, currBrushID)["parent"];
    parentOverviewDepth -= 1;
  }
}
