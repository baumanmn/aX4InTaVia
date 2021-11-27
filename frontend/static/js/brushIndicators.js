import {
  getBrushConfigKey,
  getBrushStateWithoutKey,
  getBrushState,
  getFamilyOfBrush,
  getBrushIndicators,
  setBrushIndicators,
} from "./drawChart";

import * as d3 from "d3";

export function cascadingBrushIndicatorUpdate(
  chart,
  overviewNr,
  brushPartition
) {
  console.log("---call----");
  const referenceLength = chart.p.tokenExt;

  const rootBrushKey = getBrushConfigKey(chart, overviewNr, brushPartition);

  const rootBrushData = getBrushState(chart, rootBrushKey);

  if (!rootBrushKey || !rootBrushData) return 0;

  const rootBrushRanges = rootBrushData["selection"];
  console.log(rootBrushRanges);

  const root_L = rootBrushRanges[1] - rootBrushRanges[0];

  const root_X = rootBrushRanges[0];

  let currOverviewDepth = overviewNr;

  let indicators = [];

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
      childrenKeys.forEach((childKey) => {
        let POS_curr = getBrushState(chart, childKey)["selection"];

        let convertedPosition = projection(
          referenceLength,
          L_parent_transf,
          X_parent_transf,
          POS_curr
        );

        let L_current_transf = convertedPosition[1] - convertedPosition[0];
        let X_current_transf = convertedPosition[0];

        indicators.push({
          pos: convertedPosition,
          depth: currOverviewDepth + 1,
        });
        successorStack.push({
          id: childKey,
          L_transf: L_current_transf,
          X_transf: X_current_transf,
        });
      });
    }

    currOverviewDepth += 1;
  }

  let brushIndicators = getBrushIndicators(chart, rootBrushKey);
  if (brushIndicators && brushIndicators.length > 0) {
    brushIndicators.forEach((indicator) => indicator.remove());
  }

  const height = chart.p.indicatorH;

  if (indicators.length > 0) {
    brushIndicators = indicators.map((successor) => {
      let position = successor["pos"];
      let depth = successor["depth"];

      let width = position[1] - position[0];

      let y = chart.p.indicatorYFunction(depth - 1);

      return chart.overviews[overviewNr]["brushGroup"][brushPartition]
        .select("svg")
        .append("rect")
        .attr("class", "stateRect")
        .attr("x", position[0])
        .attr("y", y)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "red");
    });
  }

  setBrushIndicators(chart, rootBrushKey, brushIndicators);
}

function projection(L_ref, L_parent_transf, X_parent_transf, POS_curr) {
  const pos_transformed = POS_curr.map((X) => {
    const X_transformed = X_parent_transf + (X / L_ref) * L_parent_transf;
    return X_transformed;
  });
  return pos_transformed;
}

export function ascendingBrushIndicatorUpdate() {}

export function cascadingSplitIndicatorUpdate() {}

export function ascendingSplitIndicatorUpdate() {}
