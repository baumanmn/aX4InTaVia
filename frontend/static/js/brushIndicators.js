import {
  getBrushConfigKey,
  getBrushStateWithoutKey,
  getBrushState,
  getFamilyOfBrush,
  getBrushIndicators,
  setBrushIndicators,
} from "./drawChart";

export function cascadingBrushIndicatorUpdate(
  chart,
  overviewNr,
  brushPartition
) {
  const referenceLength = chart.p.tokenExt;

  const rootBrushKey = getBrushConfigKey(chart, overviewNr, brushPartition);

  const rootBrushRanges = getBrushState(chart, rootBrushKey)["selection"];

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
    let L_parent_transf = nextNode["L_parent_transf"];
    let X_parent_transf = nextNode["X_parent_transf"];

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

  let endOfSVG = chart.p.overviewExt; //-10 missing if i_d = 1 (see below)
  let init_height = 10;

  if (successorStack.length > 0) {
    brushIndicators = successorStack.map((successor) => {
      let position = successor["pos"];
      let depth = successor["depth"];

      let inverse_depth = Math.min(1, chart.p.maxNumOverviews - depth - 1);
      let y = endOfSVG / inverse_depth;
      let height = init_height / depth;

      return chart.overviews[overviewNr]["brushGroup"]
        .select("svg")
        .append("rect")
        .attr("class", "stateRect")
        .attr("x", position[0])
        .attr("y", y)
        .attr("width", position[1])
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
