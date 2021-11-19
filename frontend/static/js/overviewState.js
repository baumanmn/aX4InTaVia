import * as d3 from "d3";
import "jquery-ui-bundle";
import { slider, secondSlider, thirdSlider, initPos } from "./slider";

/**
 *
 * Cumulative state object, basically a tree, which encodes and saves all overview information.
 * The first layer assigns each brush of overview 1 an ID ({0, 1, 2}).
 * The ID is then assigned all information about its corresponding partitions in overview 2 and 3.
 * This pattern is repeated within the next layer with the Brushes of Overview 2 and 3.
 * The relevant informations stored are:
 * - Which of the potentially 3 brushes within an overview are active
 * - The Selection/Tokenrange of each of these brushes
 * - The Overlayrange of each of these brushes
 * - The rectangular objects encoding the partitioning of the lower tier overviews within their "parent" brush
 * - The partitioning point indicidators for the aforementioned overviews
 *
 *
 */
export var stateEncoder = {
  circleSize: 8, //MB TODO move to chart.p?
  parentActive: 0, //ID of the active brush within OVERVIEW 1
  tokenRange: {
    //Tokenranges of the associated brushes in OVERVIEW 1 MB ids?
    0: [0, -1],
    1: [0, -1],
    2: [0, -1],
  },
  overlayRange: {
    //Overlayranges of the associated brushes in OVERVIEW 1
    0: [0, -1],
    1: [0, -1],
    2: [0, -1],
  },
  0: {
    //All information regarding [[Brush 1]] in OVERVIEW 1 and its child and grandchild partitions
    viewsSet: [false, false, false], //Boolean flags denoting which of the brushes in OVERVIEW 2 are initialized
    tokenRange: {
      //Tokenranges of the associated brushes in OVERVIEW 2
      0: [0, -1],
      1: [0, -1],
      2: [0, -1],
    },
    overlayRange: {
      //Overlayranges of the associated brushes in OVERVIEW 2
      0: [0, -1],
      1: [0, -1],
      2: [0, -1],
    },
    childOverviewRectangles: ["", "", ""], //rectangles encoding OVERVIEW 2 Brush Selections within Brush 1 in OVERVIEW 1
    grandchildOverviewRectangles: ["", "", ""], //rectangles encoding OVERVIEW 3 Brush Selections " " //MB why not 9?
    childSplitIndicator: ["", ""], //circles encoding OVERVIEW 2 partitioning points " "
    grandChildSplitIndicator: ["", ""], //circles encoding OVERVIEW 3 partitioning points " "
    children: {
      //Information regarding Brushes in OVERIVEW 2 associated with Brush 1 in OVERVIEW 1
      childActive: 0, //ID of the active brush within OVERVIEW 2 associated with Brush 1 in Overview 1
      0: {
        //Read this as: Info. regarding children in OVERVIEW 3 associated with [[Brush 1]] in OVERVIEW 2 associated with Brush 1 in OVERVIEW 1
        viewsSet: [false, false, false], //Boolean flags denoting which of the brushes in OVERVIEW 3 are initialized
        tokenRange: {
          //Tokenranges of the associated brushes in OVERVIEW 3
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        overlayRange: {
          //Overlayranges of the associated brushes in OVERVIEW 3
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        childOverviewRectangles: ["", "", ""], //rectangles encoding OVERVIEW 3 Brush Selections within Brush 1 in OVERVIEW 2
        childSplitIndicator: ["", ""],
      },
      1: {
        //Read this as: Info. regarding children in OVERVIEW 3 associated with [[Brush 2]] in OVERVIEW 2 associated with Brush 1 in OVERVIEW 1
        viewsSet: [false, false, false],
        tokenRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        overlayRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        childOverviewRectangles: ["", "", ""],
        childSplitIndicator: ["", ""],
      },
      2: {
        viewsSet: [false, false, false],
        tokenRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        overlayRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        childOverviewRectangles: ["", "", ""],
        childSplitIndicator: ["", ""],
      },
    },
  },
  1: {
    //All information regarding [[Brush 2]] in OVERVIEW 1 and its child and grandchild partitions
    viewsSet: [false, false, false],
    tokenRange: {
      0: [0, -1],
      1: [0, -1],
      2: [0, -1],
    },
    overlayRange: {
      0: [0, -1],
      1: [0, -1],
      2: [0, -1],
    },
    childOverviewRectangles: ["", "", ""],
    grandchildOverviewRectangles: ["", "", ""],
    childSplitIndicator: ["", ""],
    grandChildSplitIndicator: ["", ""],
    children: {
      childActive: 0,
      0: {
        viewsSet: [false, false, false],
        tokenRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        overlayRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        childOverviewRectangles: ["", "", ""],
        childSplitIndicator: ["", ""],
      },
      1: {
        viewsSet: [false, false, false],
        tokenRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        overlayRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        childOverviewRectangles: ["", "", ""],
        childSplitIndicator: ["", ""],
      },
      2: {
        viewsSet: [false, false, false],
        tokenRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        overlayRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        childOverviewRectangles: ["", "", ""],
        childSplitIndicator: ["", ""],
      },
    },
  },
  2: {
    viewsSet: [false, false, false],
    tokenRange: {
      0: [0, -1],
      1: [0, -1],
      2: [0, -1],
    },
    overlayRange: {
      0: [0, -1],
      1: [0, -1],
      2: [0, -1],
    },
    childOverviewRectangles: ["", "", ""],
    grandchildOverviewRectangles: ["", "", ""],
    childSplitIndicator: ["", ""],
    grandChildSplitIndicator: ["", ""],
    children: {
      childActive: 0,
      0: {
        viewsSet: [false, false, false],
        tokenRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        overlayRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        childOverviewRectangles: ["", "", ""],
        childSplitIndicator: ["", ""],
      },
      1: {
        viewsSet: [false, false, false],
        tokenRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        overlayRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        childOverviewRectangles: ["", "", ""],
        childSplitIndicator: ["", ""],
      },
      2: {
        viewsSet: [false, false, false],
        tokenRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        overlayRange: {
          0: [0, -1],
          1: [0, -1],
          2: [0, -1],
        },
        childOverviewRectangles: ["", "", ""],
        childSplitIndicator: ["", ""],
      },
    },
  },
};

/**
 *
 * Helper function that initializes all token and overlay ranges
 * @param {*} chart
 */
export function initializeStates(chart) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      stateEncoder[i].tokenRange[j] = [0, chart.p.tokenExt];
      stateEncoder[i].overlayRange[j] = [0, chart.p.tokenExt];
      for (let k = 0; k < 3; k++) {
        stateEncoder[i].children[j].tokenRange[k] = [0, chart.p.tokenExt];
        stateEncoder[i].children[j].overlayRange[k] = [0, chart.p.tokenExt];
      }
    }
  }
}

/**
 *
 * Function for updating token and overlay ranges for specific nodes within the state tree.
 * Overview, parentID and childID specfiy the access to the node,
 * i.e. assume Brush 1 in OVERVIEW 1 is active, OVERVIEW 2 has been partitioned once (Brush 1 and 2 are live) and the same for OVERVIEW 3.
 * To update the tokenrange of Brush 1 (ID 0) in OVERVIEW 3 associated with Brush 2 (ID 1) in OVERVIEW 2 associated with Brush 1 (ID 0) in OVERVIEW 1,
 * one needs to acess stateEncoder[0].children[1].tokenRange[0]
 * @param {*} overview
 * @param {number} parentID
 * @param {number} childID
 * @param {list} binRange
 * @param {list} overlayRange
 * @param {boolean} removal
 */
export function updateState(
  overview,
  ids = null,
  binRange = null, //MB what if the strips are not aggregated?
  overlayRange = null,
  removal = false
) {
  let currStateEncoder;
  let grandParentID;
  let parentID;
  let childID;
  if (overview === 0) {
    childID = ids[0];
    currStateEncoder = stateEncoder;
  }
  if (overview === 1) {
    parentID = ids[0];
    childID = ids[1];
    currStateEncoder = stateEncoder[parentID];
    currStateEncoder.viewsSet[childID] = !removal;
  }
  if (overview === 2) {
    grandParentID = ids[0];
    parentID = ids[1];
    childID = ids[2];
    currStateEncoder = stateEncoder[grandParentID].children;
    currStateEncoder = currStateEncoder[parentID];
    currStateEncoder.viewsSet[childID] = !removal;
  }
  if (binRange != null) {
    currStateEncoder.tokenRange[childID] = binRange;
  }
  if (overlayRange != null) {
    currStateEncoder.overlayRange[childID] = overlayRange;
  }
}

/**
 * Function for saving token and overlay ranges for specific nodes within the state tree.
 * Overview, parentID and childID specfiy the access to the node,
 * i.e. assume Brush 1 in OVERVIEW 1 is active, OVERVIEW 2 has been partitioned once (Brush 1 and 2 are live) and the same for OVERVIEW 3.
 * To update the tokenrange of Brush 1 (ID 0) in OVERVIEW 3 associated with Brush 2 (ID 1) in OVERVIEW 2 associated with Brush 1 (ID 0) in OVERVIEW 1,
 * one needs to acess stateEncoder[0].children[1].tokenRange[0]
 * @param {*} parentID
 * @param {*} childID
 * @param {*} binRange
 * @param {*} overlay
 * @param {*} overview
 */
export function saveState(
  parentID,
  childID,
  binRange,
  overlay = false,
  overview = 1
) {
  let currStateEncoder = stateEncoder;
  if (overview === 2) {
    currStateEncoder = stateEncoder[stateEncoder.parentActive].children;
  }
  currStateEncoder[parentID].viewsSet[childID] = true;
  if (overlay === false) {
    currStateEncoder[parentID].tokenRange[childID] = binRange;
  } else {
    currStateEncoder[parentID].overlayRange[childID] = binRange;
  }
}

/**
 * Set a specific brush (and its state) in the given overview as active
 * @param {*} active
 * @param {*} overview
 */
export function setBrushStateActiveInOverview(active, overview = 0) {
  if (overview === 0) {
    stateEncoder.parentActive = active;
  } else if (overview === 1) {
    stateEncoder[stateEncoder.parentActive].children.childActive = active;
  } else {
  }
}

export function setPartitionAsTrue(parentID, childID, overview = 1) {
  let currStateEncoder =
    overview === 1
      ? stateEncoder
      : stateEncoder[stateEncoder.parentActive].children;
  currStateEncoder[parentID].viewsSet[childID] = true;
}

/**
 *
 * Draw the circular partitioning Indicators of the child (and grandchild) brushes within the specified overview.
 * Overview === 1 means: Draw the indicators for the brushes of Overview 2 in Overview 1.
 * Overview === 2 means: Draw the indicators for the brushes of Overview 3 in Overview 2 AND in Overview 1.
 * @param {} chart
 * @param {*} sliderID
 * @param {*} splitPos
 * @param {*} overview
 */
export function drawSplitIndicator(chart, sliderID, splitPos, overview = 1) {
  let currStateEncoder;
  let overviewBrush;
  let parentID;
  if (overview === 1) {
    parentID = stateEncoder.parentActive;
    currStateEncoder = stateEncoder[parentID];
    overviewBrush = chart.overviews[0]["brushGroup"];
  } else {
    parentID = stateEncoder[stateEncoder.parentActive].children.childActive;
    currStateEncoder =
      stateEncoder[stateEncoder.parentActive].children[parentID];
    overviewBrush = chart.overviews[1]["brushGroup"];
  }
  //hack: use brush range converter to convert slider position
  let range = convertChildRangeToParentRange(
    chart,
    parentID,
    [splitPos, splitPos],
    overview
  );
  if (currStateEncoder.childSplitIndicator[sliderID] != "") {
    currStateEncoder.childSplitIndicator[sliderID].remove();
  }
  currStateEncoder.childSplitIndicator[sliderID] = overviewBrush[parentID]
    .select("svg")
    .append("circle")
    .attr("class", "stateRect")
    .attr("cx", range[0] + 1)
    .attr("cy", chart.p.overviewExt / 2)
    .attr("r", stateEncoder.circleSize);

  if (overview === 2) {
    //draw indicators of overview 3 in associated brush in overview 1
    let gpRange = convertChildRangeToGrandparentRange(
      chart,
      stateEncoder.parentActive,
      parentID,
      [splitPos, splitPos]
    );
    if (
      stateEncoder[stateEncoder.parentActive].grandChildSplitIndicator[
        sliderID
      ] != ""
    ) {
      stateEncoder[stateEncoder.parentActive].grandChildSplitIndicator[
        sliderID
      ].remove();
    }
    stateEncoder[stateEncoder.parentActive].grandChildSplitIndicator[
      sliderID
    ] = chart.overviews[0]["brushGroup"][stateEncoder.parentActive]
      .select("svg")
      .append("circle")
      .attr("class", "stateRect")
      .attr("cx", gpRange[0] + 1)
      .attr("cy", chart.p.overviewExt / 2 + 13)
      .attr("r", stateEncoder.circleSize / 2);
  }
}

/**
 *
 * Update all indicator positions within the specified overview, e.g. if the active Brush in Overview 1 was changed
 * @param {} chart
 * @param {*} overview
 */
export function updateAllIndicators(chart, overview) {
  if (!chart.overviews[1] && !chart.overviews[2]) return 0;

  let currStateEncoder;
  let overviewBrush;
  let parentID;
  let sliderPos;
  let range;
  let gpRange;
  if (overview === 1) {
    parentID = stateEncoder.parentActive;
    currStateEncoder = stateEncoder[parentID];
    overviewBrush = chart.overviews[0]["brushGroup"];
    sliderPos = [secondSlider[0].pos, secondSlider[1].pos];
  } else {
    parentID = stateEncoder[stateEncoder.parentActive].children.childActive;
    currStateEncoder =
      stateEncoder[stateEncoder.parentActive].children[parentID];
    overviewBrush = chart.overviews[1]["brushGroup"];
    sliderPos = [thirdSlider[0].pos, thirdSlider[1].pos];

    gpRange = convertChildRangeToGrandparentRange(
      chart,
      stateEncoder.parentActive,
      parentID,
      sliderPos
    );

    if (gpRange === -1) return 0;

    /**
     * grandparnent indicators
     */
    if (
      stateEncoder[stateEncoder.parentActive].grandChildSplitIndicator[0] != ""
    ) {
      stateEncoder[
        stateEncoder.parentActive
      ].grandChildSplitIndicator[0].remove();
    }
    if (
      stateEncoder[stateEncoder.parentActive].grandChildSplitIndicator[1] != ""
    ) {
      stateEncoder[
        stateEncoder.parentActive
      ].grandChildSplitIndicator[1].remove();
    }
    //grandparent indicators
    /* gpRange = convertChildRangeToGrandparentRange(
      chart,
      stateEncoder.parentActive,
      parentID,
      sliderPos
    ); */
  }
  range = convertChildRangeToParentRange(chart, parentID, sliderPos, overview);
  if (range === -1) return 0;

  if (currStateEncoder.childSplitIndicator[0] != "") {
    currStateEncoder.childSplitIndicator[0].remove();
  }
  if (currStateEncoder.childSplitIndicator[1] != "") {
    currStateEncoder.childSplitIndicator[1].remove();
  }

  //range = convertChildRangeToParentRange(chart, parentID, sliderPos, overview);
  if (sliderPos[0] != chart.p.tokenExt) {
    currStateEncoder.childSplitIndicator[0] = overviewBrush[parentID]
      .select("svg")
      .append("circle")
      .attr("class", "stateRect")
      .attr("cx", range[0] + 1)
      .attr("cy", chart.p.overviewExt / 2)
      .attr("r", stateEncoder.circleSize);

    if (overview === 2) {
      stateEncoder[
        stateEncoder.parentActive
      ].grandChildSplitIndicator[0] = chart.overviews[0]["brushGroup"][
        stateEncoder.parentActive
      ]
        .select("svg")
        .append("circle")
        .attr("class", "stateRect")
        .attr("cx", gpRange[0] + 1)
        .attr("cy", chart.p.overviewExt / 2 + 13)
        .attr("r", stateEncoder.circleSize / 2);
    }
  }
  if (sliderPos[1] != chart.p.tokenExt) {
    currStateEncoder.childSplitIndicator[1] = overviewBrush[parentID]
      .select("svg")
      .append("circle")
      .attr("class", "stateRect")
      .attr("cx", range[1] + 1)
      .attr("cy", chart.p.overviewExt / 2)
      .attr("r", stateEncoder.circleSize);

    if (overview === 2) {
      stateEncoder[
        stateEncoder.parentActive
      ].grandChildSplitIndicator[1] = chart.overviews[0]["brushGroup"][
        stateEncoder.parentActive
      ]
        .select("svg")
        .append("circle")
        .attr("class", "stateRect")
        .attr("cx", gpRange[1] + 1)
        .attr("cy", chart.p.overviewExt / 2 + 13)
        .attr("r", stateEncoder.circleSize / 2);
    }
  }
}

/**
 * Remove all circular partitioning Indicators within the specified overview
 * @param {*} overview
 */
export function resetIndicator(overview) {
  if (overview === 1) {
    for (let i = 0; i < 3; i++) {
      if (stateEncoder[i].childSplitIndicator[0] != "") {
        stateEncoder[i].childSplitIndicator[0].remove();
      }
      if (stateEncoder[i].childSplitIndicator[1] != "") {
        stateEncoder[i].childSplitIndicator[1].remove();
      }
    }
  } else {
    for (let i = 0; i < 3; i++) {
      if (stateEncoder[i].grandChildSplitIndicator[0] != "") {
        stateEncoder[i].grandChildSplitIndicator[0].remove();
      }
      if (stateEncoder[i].grandChildSplitIndicator[1] != "") {
        stateEncoder[i].grandChildSplitIndicator[1].remove();
      }
      for (let j = 0; j < 3; j++) {
        if (stateEncoder[i].children[j].childSplitIndicator[0] != "") {
          stateEncoder[i].children[j].childSplitIndicator[0].remove();
        }
        if (stateEncoder[i].children[j].childSplitIndicator[1] != "") {
          stateEncoder[i].children[j].childSplitIndicator[1].remove();
        }
      }
    }
  }
}

/**
 *
 * Indicate the partitioning of the specified overview within the active "parent" (and "grandparent") brushes
 * Overview === 1: Draw rectangles indicating the active brushes in Overview 2 within the active Brush in Overview 1
 * Overview === 2: Draw rectangles indicating the active brushes in Overview 3 within the active Brush in Overview 2 and Overview 1
 * @param {*} chart
 * @param {*} parentID
 * @param {*} childID
 * @param {*} binRange
 * @param {*} overview
 */
export function drawStateRectangle(
  chart,
  parentID,
  childID,
  binRange,
  overview = 1
) {
  let currStateEncoder = stateEncoder;
  let overviewBrush;
  if (overview === 1) {
    overviewBrush = chart.overviews[0]["brushGroup"];
  } else {
    currStateEncoder = stateEncoder[stateEncoder.parentActive].children;
    overviewBrush = chart.overviews[1]["brushGroup"];
  }
  let range = convertChildRangeToParentRange(
    chart,
    parentID,
    binRange,
    overview
  );
  let w = range[1] - range[0];
  if (currStateEncoder[parentID].childOverviewRectangles[childID] != "") {
    currStateEncoder[parentID].childOverviewRectangles[childID].remove();
  }
  currStateEncoder[parentID].childOverviewRectangles[childID] = overviewBrush[
    parentID
  ]
    .select("svg")
    .append("rect")
    .attr("class", "stateRect")
    //.attr("x", binRange[0] + 5)
    .attr("x", range[0])
    .attr("y", chart.p.overviewExt / 3)
    .attr("width", w)
    .attr("height", 10);

  /* *
   * draw rectangle in grandparent overview
   */
  let gpRange;
  if (overview === 2) {
    gpRange = convertChildRangeToGrandparentRange(
      chart,
      stateEncoder.parentActive,
      parentID,
      binRange
    );
    let w = gpRange[1] - gpRange[0];
    if (
      stateEncoder[stateEncoder.parentActive].grandchildOverviewRectangles[
        childID
      ] != ""
    ) {
      stateEncoder[stateEncoder.parentActive].grandchildOverviewRectangles[
        childID
      ].remove();
    }
    stateEncoder[stateEncoder.parentActive].grandchildOverviewRectangles[
      childID
    ] = chart.overviews[0]["brushGroup"][stateEncoder.parentActive]
      .select("svg")
      .append("rect")
      .attr("class", "stateRect")
      //.attr("x", binRange[0] + 5)
      .attr("x", gpRange[0])
      .attr("y", chart.p.overviewExt - 10)
      .attr("width", w)
      .attr("height", 5);
  }
}

/**
 * Similar behaviour as {@link drawStateRectangle}.
 * This function is called when the rectangles are already established and possibly need to be updated,
 * i.e. if the associated brushes in the "parent" overviews are moved/updates,
 * which may lead to a change in form and  positioning of the rectangles
 * Overview === 1: Update the rectangles indicating the brushes from Overview 2
 * Overview === 2: Update the rectangles indicating the brushes from Overview 3
 * @param {*} chart
 * @param {*} parentID
 * @param {*} childID
 * @param {*} binRange
 * @param {*} overview
 */
export function updateStateRectangle(
  chart,
  parentID,
  childID,
  binRange,
  overview = 1
) {
  let currStateEncoder = stateEncoder;
  let overviewBrush;
  if (overview === 1) {
    overviewBrush = chart.overviews[0]["brushGroup"];
  } else {
    currStateEncoder = stateEncoder[stateEncoder.parentActive].children;
    overviewBrush = chart.overviews[1]["brushGroup"];
  }
  let l = binRange[0];
  let r = binRange[1];
  let w;
  let activeRange;
  if (currStateEncoder[parentID].childOverviewRectangles[childID] != "") {
    l = parseInt(
      currStateEncoder[parentID].childOverviewRectangles[childID].attr("x")
    );
    r =
      parseInt(
        currStateEncoder[parentID].childOverviewRectangles[childID].attr("x")
      ) +
      parseInt(
        currStateEncoder[parentID].childOverviewRectangles[childID].attr(
          "width"
        )
      );
    activeRange = [l, r];
    currStateEncoder[parentID].childOverviewRectangles[childID].remove();
  }
  if (l < binRange[1]) {
    activeRange = convertChildRangeToParentRange(
      chart,
      parentID,
      [binRange[0], binRange[1]],
      overview
    );
  }
  let newRange = convertChildRangeToParentRange(
    chart,
    parentID,
    binRange,
    overview
  );
  w =
    Math.min(activeRange[1], newRange[1]) -
    Math.max(activeRange[0], newRange[0]);
  currStateEncoder[parentID].childOverviewRectangles[childID] = overviewBrush[
    parentID
  ]
    .select("svg")
    .append("rect")
    .attr("class", "stateRect")
    //.attr("x", l)
    .attr("x", Math.max(activeRange[0], newRange[0]))
    .attr("y", chart.p.overviewExt / 3)
    .attr("width", w)
    .attr("height", 10);

  /**
   * update grandparent overview rectangles
   */
  if (overview === 2) {
    if (
      stateEncoder[stateEncoder.parentActive].grandchildOverviewRectangles[
        childID
      ] != ""
    ) {
      l = parseInt(
        stateEncoder[stateEncoder.parentActive].grandchildOverviewRectangles[
          childID
        ].attr("x")
      );
      r =
        parseInt(
          stateEncoder[stateEncoder.parentActive].grandchildOverviewRectangles[
            childID
          ].attr("x")
        ) +
        parseInt(
          stateEncoder[stateEncoder.parentActive].grandchildOverviewRectangles[
            childID
          ].attr("width")
        );
      activeRange = [l, r];
      stateEncoder[stateEncoder.parentActive].grandchildOverviewRectangles[
        childID
      ].remove();
    }
    if (l < binRange[1]) {
      activeRange = convertChildRangeToGrandparentRange(
        chart,
        stateEncoder.parentActive,
        parentID,
        [binRange[0], binRange[1]]
      );
    }
    let newRange = convertChildRangeToGrandparentRange(
      chart,
      stateEncoder.parentActive,
      parentID,
      binRange
    );
    w =
      Math.min(activeRange[1], newRange[1]) -
      Math.max(activeRange[0], newRange[0]);
    stateEncoder[stateEncoder.parentActive].grandchildOverviewRectangles[
      childID
    ] = chart.overviews[0]["brushGroup"][stateEncoder.parentActive]
      .select("svg")
      .append("rect")
      .attr("class", "stateRect")
      //.attr("x", l)
      .attr("x", Math.max(activeRange[0], newRange[0]))
      .attr("y", chart.p.overviewExt - 10)
      .attr("width", w)
      .attr("height", 5);
  }
}

/**
 * Similar behaviour as {@link updateStateRectangle}.
 * This is an auxillary function updating all existent rectangles at once.
 * @param {*} chart
 * @param {*} parentID
 * @param {*} overview
 */
export function updateAll(chart, parentID, overview = 1) {
  let currStateEncoder = stateEncoder;
  let overviewBrush;
  let grandParent;
  if (overview === 1) {
    overviewBrush = chart.overviews[0]["brushGroup"];
    grandParent = parentID;
  } else {
    currStateEncoder = stateEncoder[stateEncoder.parentActive].children;
    overviewBrush = chart.overviews[1]["brushGroup"];
    grandParent = stateEncoder.parentActive;
  }
  for (
    let i = 0;
    i < currStateEncoder[parentID].childOverviewRectangles.length;
    i++
  ) {
    if (currStateEncoder[parentID].childOverviewRectangles[i] != "") {
      currStateEncoder[parentID].childOverviewRectangles[i].remove();
      /* let child = chart.overviews[1]["brushGroup"][i];
            let l = parseInt(child.select(".selection").attr("x"));
            let r = l + parseInt(child.select(".selection").attr("tokenExt"));
            let range = convertChildRangeToParentRange(chart, parentID, [l, r]); */
      let tokenRange = currStateEncoder[parentID].tokenRange[i];
      let range = convertChildRangeToParentRange(
        chart,
        parentID,
        tokenRange,
        overview
      );
      let w = range[1] - range[0];
      currStateEncoder[parentID].childOverviewRectangles[i] = overviewBrush[
        parentID
      ]
        .select("svg")
        .append("rect")
        .attr("class", "stateRect")
        .attr("x", range[0])
        .attr("y", chart.p.overviewExt / 3)
        .attr("width", w)
        .attr("height", 10);
    }
    /**
     * update grandparent overview rectangles
     */

    if (stateEncoder[grandParent].grandchildOverviewRectangles[i] != "") {
      stateEncoder[grandParent].grandchildOverviewRectangles[i].remove();
      let childID = stateEncoder[grandParent].children.childActive;
      let tokenRange =
        stateEncoder[grandParent].children[childID].tokenRange[i];
      let range = convertChildRangeToGrandparentRange(
        chart,
        grandParent,
        stateEncoder[grandParent].children.childActive,
        tokenRange
      );
      let w = range[1] - range[0];
      stateEncoder[grandParent].grandchildOverviewRectangles[
        i
      ] = chart.overviews[0]["brushGroup"][grandParent]
        .select("svg")
        .append("rect")
        .attr("class", "stateRect")
        .attr("x", range[0])
        .attr("y", chart.p.overviewExt - 10)
        .attr("width", w)
        .attr("height", 5);
    }
  }
}

/**
 * Reset all "grandchild" rectangles within all brushes in Overview 1
 * @param {number} id
 */
export function removeAllGrandChildren(id = stateEncoder.parentActive) {
  for (
    let i = 0;
    i < stateEncoder[id].grandchildOverviewRectangles.length;
    i++
  ) {
    if (stateEncoder[id].grandchildOverviewRectangles[i] != "") {
      stateEncoder[id].grandchildOverviewRectangles[i].remove();
    }
  }
}

/**
 *
 * Remove the rectangles within a specified brush within the specified overview
 * @param {*} chart
 * @param {*} parentID
 * @param {*} overview
 */
export function removeAllForParent(chart, parentID, overview = 1) {
  let currStateEncoder = stateEncoder;
  let overviewBrush;
  if (overview === 1) {
    overviewBrush = chart.overviews[0]["brushGroup"];
  } else {
    currStateEncoder = stateEncoder[stateEncoder.parentActive].children;
    overviewBrush = chart.overviews[1]["brushGroup"];
  }
  let l = currStateEncoder[parentID].childOverviewRectangles.length;
  for (let i = 0; i < l; i++) {
    if (currStateEncoder[parentID].childOverviewRectangles[i] != "") {
      currStateEncoder[parentID].childOverviewRectangles[i].remove();
    }
  }
}

/**
 * Convert the range of a brush in a "child" Overview (e.g. brush 1 in Overivew 2) to corresponding range within "parent" brush (e.g. brush 1 in Overview 1)
 * @param {chartObject} chart
 * @param {number} parentID
 * @param {array} binRange
 */
function convertChildRangeToParentRange(
  chart,
  parentID,
  binRange,
  overview = 1
) {
  let parent;
  if (overview === 1) {
    parent = chart.overviews[0]["brushGroup"][parentID];
  } else {
    parent = chart.overviews[1]["brushGroup"][parentID];
  }
  if (!parent) return -1;

  let px = parseInt(parent.select(".selection").attr("x"));
  let pw = parseInt(parent.select(".selection").attr("width"));
  let m1 = binRange[0];
  let m2 = binRange[1];
  let l = chart.p.tokenExt;
  return [px + Math.round((m1 * pw) / l), px + Math.round((m2 * pw) / l)];
}

/**
 * Convert the range of a brush in a "child" Overview (e.g. brush 2 in Overview 3) to corresponding range within "grandParent" brush (e.g. brush 1 in Overview 1)
 * @param {*} chart
 * @param {*} grandparentID
 * @param {*} parentID
 * @param {*} binRange
 */
function convertChildRangeToGrandparentRange(
  chart,
  grandparentID,
  parentID,
  binRange
) {
  let parent = chart.overviews[1]["brushGroup"][parentID];
  let grandParent = chart.overviews[0]["brushGroup"][grandparentID];
  if (!parent || !grandParent) return -1;

  let px = parseInt(parent.select(".selection").attr("x"));
  let pw = parseInt(parent.select(".selection").attr("width"));
  let l = chart.p.tokenExt;
  let m1 = px + Math.round((binRange[0] * pw) / l);
  let m2 = px + Math.round((binRange[1] * pw) / l);
  let gx = parseInt(grandParent.select(".selection").attr("x"));
  let gw = parseInt(grandParent.select(".selection").attr("width"));
  return [gx + Math.round((m1 * gw) / l), gx + Math.round((m2 * gw) / l)];
}

export function getStoredRanges(overviewID, key) {
  let accessor;
  let accessKey;
  if (overviewID === 0) {
    accessor = stateEncoder;
    accessKey = key[0];
  } else if (overviewID === 1) {
    accessor = stateEncoder[key[0]];
    accessKey = key[1];
  } else {
    accessor = stateEncoder[key[0]].children[key[1]];
    accessKey = key[2];
  }
  return [accessor.tokenRange[accessKey], accessor.overlayRange[accessKey]];
}

export function setRanges(overviewNr, brushData) {
  if (overviewNr === 0) {
    stateEncoder.tokenRange[brushData["brushNr"]] = brushData["selection"];
    if (brushData["overlay"].length > 0)
      stateEncoder.overlayRange[brushData["brushNr"]] = brushData["overlay"];
  } else if (overviewNr === 1) {
    stateEncoder[stateEncoder.parentActive].tokenRange[brushData["brushNr"]] =
      brushData["selection"];
    if (brushData["overlay"].length > 0)
      stateEncoder[stateEncoder.parentActive].overlayRange[
        brushData["brushNr"]
      ] = brushData["overlay"];
  } else {
    stateEncoder[stateEncoder.parentActive].children[
      stateEncoder[stateEncoder.parentActive].children.childActive
    ].tokenRange[brushData["brushNr"]] = brushData["selection"];
    if (brushData["overlay"].length > 0)
      stateEncoder[stateEncoder.parentActive].children[
        stateEncoder[stateEncoder.parentActive].children.childActive
      ].overlayRange[brushData["brushNr"]] = brushData["overlay"];
  }
}

export function setRangesWithID(overviewNr, brushData) {
  let id = brushData["id"];
  if (overviewNr === 0) {
    stateEncoder.tokenRange[id[0]] = brushData["selection"];
    if (brushData["overlay"].length > 0)
      stateEncoder.overlayRange[id[0]] = brushData["overlay"];
  } else if (overviewNr === 1) {
    stateEncoder[id[0]].tokenRange[id[1]] = brushData["selection"];
    if (brushData["overlay"].length > 0)
      stateEncoder[id[0]].overlayRange[id[1]] = brushData["overlay"];
  } else {
    stateEncoder[id[0]].children[id[1]].tokenRange[id[2]] =
      brushData["selection"];
    if (brushData["overlay"].length > 0)
      stateEncoder[id[0]].children[id[1]].overlayRange[id[2]] =
        brushData["overlay"];
  }
}

export function setSplitFlag(overviewNr, ids, boolFlag) {
  if (overviewNr === 1) {
    stateEncoder[ids[0]].viewsSet[ids[1]] = boolFlag;
  } else {
    stateEncoder[ids[0]].children[ids[1]].viewsSet[ids[2]] = boolFlag;
  }
}

export function indicatorUpdatePipeline(chart, metaData) {
  for (let [overviewNr, data] of Object.entries(metaData)) {
    if (data["brushIndices"] !== undefined) {
      for (let idx = 0; idx < data["brushIndices"].length; idx++) {
        updateAll(chart, data["brushIndices"][idx], overviewNr);
      }
    }

    if (
      data["drawSplitIndicators"] !== undefined &&
      data["drawSplitIndicators"] === true
    ) {
      drawSplitIndicator(chart, data["brushID"], data["splitPos"], overviewNr);
    }
    if (
      data["updateAllIndicators"] !== undefined &&
      data["updateAllIndicators"] === true
    ) {
      updateAllIndicators(chart, overviewNr);
    }
  }
}
