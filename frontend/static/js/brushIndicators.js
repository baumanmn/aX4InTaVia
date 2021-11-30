import {
  getBrushConfigKey,
  getBrushStateWithoutKey,
  getBrushState,
  getFamilyOfBrush,
  getBrushIndicators,
  setBrushIndicators,
  getBrushPartitionFromKey,
} from "./drawChart";

import * as d3 from "d3";

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

function projection(L_ref, L_parent_transf, X_parent_transf, POS_curr) {
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

export function ascendingBrushIndicatorUpdate2(
  chart,
  overviewNr,
  brushPartition
) {
  const referenceLength = chart.p.tokenExt;

  const rootBrushKey = getBrushConfigKey(chart, overviewNr, brushPartition);

  const rootBrushData = getBrushState(chart, rootBrushKey);

  if (!rootBrushKey || !rootBrushData) return 0;

  const rootBrushRanges = rootBrushData["selection"];

  let parentOverviewDepth = overviewNr - 1;

  let currBrushID = rootBrushKey;

  let transformed_curr_pos = rootBrushRanges;

  let parentNodeKey = getFamilyOfBrush(chart, currBrushID)["parent"];

  while (parentNodeKey && parentOverviewDepth >= 0) {
    let parentBrushData = getBrushState(chart, parentNodeKey);

    let X_parent = parentBrushData["selection"][0];

    let L_parent =
      parentBrushData["selection"][1] - parentBrushData["selection"][0];

    transformed_curr_pos = projection(
      referenceLength,
      L_parent,
      X_parent,
      transformed_curr_pos
    );

    let brushIndicators = getBrushIndicators(chart, parentNodeKey);

    let targetIndicatorID = constructIndicatorID(
      parentOverviewDepth,
      rootBrushKey
    );

    console.log("---");
    console.log("ov: " + parentOverviewDepth);
    if (brushIndicators && brushIndicators.length > 0) {
      brushIndicators.map((indicator, i) => {
        let currentID = indicator.attr("id");
        console.log(currentID);
        if (currentID === targetIndicatorID) {
          brushIndicators[i].attr("x", transformed_curr_pos[0]);
          brushIndicators[i].attr(
            "width",
            transformed_curr_pos[1] - transformed_curr_pos[0]
          );
        }
      });
    }
    console.log("---");

    setBrushIndicators(chart, parentNodeKey, brushIndicators);

    parentOverviewDepth -= 1;
    currBrushID = parentNodeKey;
    parentNodeKey = getFamilyOfBrush(chart, currBrushID)["parent"];
  }
}
