import $, { get } from "jquery";
import {
  drawHistogram,
  drawSecondOverviewBars,
  drawThirdOverviewBars,
} from "./drawBars";
import {
  installBrush,
  removeBrush,
  removeAndPrepend,
  isBrushSynchedWithText,
  checkAndUpdateAssignment,
  currentlyActiveBrush,
} from "./brushSetup";
import {
  stateEncoder,
  setRangesWithID,
  setPartitionAsTrue,
  drawStateRectangle,
  drawSplitIndicator,
  resetIndicator,
  updateAllIndicators,
  updateStateRectangle,
  updateState,
  updateAll,
  setSplitFlag,
  indicatorUpdatePipeline,
} from "./overviewState";
import { sliderReconfigurationCaller, resetSlider } from "./slider";
import { monitor } from "./controller.js";
import {
  addMultipleTextviews,
  cascadingProjection,
  updateTextArea,
} from "./textArea";
import {
  drawButtonRectangle,
  drawGrandButtonRectangle,
  updateAllGrandButtonRectangles,
  drawNameTBDdRectangle,
  drawNameTBDdCircle,
  renderButton,
  drawButtonTree,
} from "./buttons";
import {
  checkIfBrushIsActiveNode,
  getBrushConfigKey,
  getFamilyOfBrush,
  redrawCurrentActivation,
} from "./drawChart";
import { setAnnotationWindows } from "./splitAnnotationWindow";

/**
 * Set the currently active overview, that needs to be synched witht he annotation view.
 * The function determines the bins/tokens to be drawn in the annotation view and calls the appropriate drawing function,
 * depending on the overview, that has been activated.
 *
 * THIS NEEDS TO BE REWRITTEN
 * @param {*} chart
 * @param {*} brush
 * @param {*} overview
 */
export function setActiveOverview(chart, brush, overview = 1) {
  var overviewBrush;
  var overviewRects;
  var caller;
  if (
    overview === 1 &&
    chart.overviews[1] &&
    Object.keys(chart.overviews[1]).length > 0 &&
    chart.overviews[1]["backgroundRects"]
  ) {
    overviewBrush = chart.overviews[1]["brushGroup"][brush];
    overviewRects = chart.overviews[1]["backgroundRects"]; //chart.overviewRects2
    caller = drawSecondOverviewBars;
  }
  if (
    overview === 2 &&
    chart.overviews[2] &&
    Object.keys(chart.overviews[2]).length > 0 &&
    chart.overviews[1]["backgroundRects"]
  ) {
    overviewBrush = chart.overviews[2]["brushGroup"][brush];
    overviewRects = chart.overviews[2]["backgroundRects"]; //chart.overviewRects3
    caller = drawThirdOverviewBars;
  }
  if (overviewBrush === null || overviewBrush === undefined) {
    return 0;
  }
  var min = Math.max(0, parseInt(overviewBrush.select(".selection").attr("x")));
  var max = min + parseInt(overviewBrush.select(".selection").attr("width"));
  var bins = [min, max];
  var binMax = Math.min(chart.d.bins.length - 1, max); //if max equals overall bin size subtract 1
  var tokenMin = chart.d.bins[min].tokens[0].id;
  var tokenMax =
    chart.d.bins[binMax].tokens[chart.d.bins[binMax].tokens.length - 1].id;
  var tokens = [tokenMin, tokenMax];
  overviewRects.selectAll("rect").remove();
  caller(chart, bins, tokens);
}

export function updatePartition(chart, brushRanges, overviewID, ids) {
  let brushID;
  if (overviewID === 0) {
    brushID = ids[0];
    setRangesWithID(0, {
      id: [brushID],
      overlay: brushRanges[0],
      selection: brushRanges[1],
    });
    removeBrush(chart, 0, brushID);
    installBrush(chart, 0, {
      brushNr: brushID,
      overlay: brushRanges[0],
      selection: brushRanges[1],
    });
    setActiveOverview(chart, brushID);
    setActiveOverview(chart, stateEncoder[brushID].children.childActive, 2); //to do

    indicatorUpdatePipeline(chart, {
      // TO DO FOR MISSING OV1 RECTANGLES
      1: {
        brushIndices: [0, 1, 2],
        updateAllIndicators: true,
      },
      2: {
        updateAllIndicators: true,
      },
    });

    drawNameTBDdRectangle(chart, brushID);
    updateAll(chart, brushID);
    updateAllGrandButtonRectangles(brushID);
    checkAndUpdateSplit(chart, overviewID, ids);
    checkAndUpdateAssignment(chart, 0, ids, brushRanges[1]);
  } else if (overviewID === 1) {
    brushID = ids[1];
    setRangesWithID(1, {
      id: ids,
      overlay: brushRanges[0],
      selection: brushRanges[1],
    });
    setSplitFlag(1, ids, true);
    if (stateEncoder.parentActive === ids[0]) {
      removeBrush(chart, 1, brushID);
      installBrush(chart, 1, {
        brushNr: brushID,
        overlay: brushRanges[0],
        selection: brushRanges[1],
      });
      updateStateRectangle(chart, ids[0], brushID, brushRanges[1], 1);

      indicatorUpdatePipeline(chart, {
        2: {
          brushIndices: [0, 1, 2],
          updateAllIndicators: true,
        },
      });
    }
    setActiveOverview(chart, ids[0], 1);
    checkAndUpdateSplit(chart, overviewID, ids);
    checkAndUpdateAssignment(chart, 1, ids, brushRanges[1]);
    drawButtonRectangle(1, ids);
    updateAllGrandButtonRectangles(ids[0]);
  } else {
    brushID = ids[2];
    //updateState(2, ids, brushRanges[1], brushRanges[0], false);
    setRangesWithID(2, {
      id: ids,
      overlay: brushRanges[0],
      selection: brushRanges[1],
    });
    setSplitFlag(2, ids, true);
    if (
      stateEncoder.parentActive === ids[0] &&
      stateEncoder[ids[0]].children.childActive === ids[1]
    ) {
      removeBrush(chart, 2, brushID);
      installBrush(chart, 2, {
        brushNr: brushID,
        overlay: brushRanges[0],
        selection: brushRanges[1],
      });
      updateStateRectangle(chart, ids[1], brushID, brushRanges[1], 2);
    }
    checkAndUpdateSplit(chart, overviewID, ids);
    checkAndUpdateAssignment(chart, 2, ids, brushRanges[1]);
    drawButtonRectangle(2, ids);
    drawGrandButtonRectangle(ids);
  }
  updateTextArea(chart);
}

/**
 * Reconfigures the brushes according to new partitioning of brushes,
 * i.e. recalculate boundaries of brushes, re-add sliders and reconfigure the views bound to each brush
 * @param {*} chart
 * @param {number} splitPos new partition position, i.e. slider position
 * @param {number} firstBrush the left side brush (can be brush 1 or brush 2)
 * @param {number} secondBrush the right side brush (can be brush 2 or brush 3)
 * @param {number} sliderID the id of the corresponding slider (can be 0 or 1)
 * @param {number} overview the id of the corresponding overview
 */
export function reconfigurePartitions(
  chart,
  splitPos,
  firstBrush,
  secondBrush,
  sliderID = 0,
  overview = 0
) {
  //firstly redraw affected brushes and slider
  removeAndPrepend(chart, sliderID, overview, firstBrush, secondBrush);
  sliderReconfigurationCaller(chart, sliderID, overview, splitPos);

  /**
   * handle chain of effects of adjusted partitioning:
   *
   * (i) redraw bars within active overview(s)
   * (ii) update stateRectangle within parent and grandparent views
   * (iii) update partitioning indicators within parent and grandparent views
   * (iv) update text views
   *
   * (ii and iii) are slightly different depending on the overview
   */
  let overview1_active = stateEncoder.parentActive;
  let overview2_active = stateEncoder[overview1_active].children.childActive;
  if (overview === 0) {
    setActiveOverview(chart, currentlyActiveBrush);
    setActiveOverview(chart, overview2_active, 2); //to do
    setRangesWithID(0, {
      id: sliderID,
      overlay: [firstBrush[0], firstBrush[1]],
      selection: [firstBrush[2], firstBrush[3]],
    });
    setRangesWithID(0, {
      id: sliderID + 1,
      overlay: [secondBrush[0], secondBrush[1]],
      selection: [secondBrush[2], secondBrush[3]],
    });

    indicatorUpdatePipeline(chart, {
      1: {
        brushIndices: [0, 1, 2],
        updateAllIndicators: true,
      },
      2: {
        updateAllIndicators: true,
      },
    });
    renderButton(chart, 0, 0, sliderID + 1);
    drawNameTBDdRectangle(chart, sliderID);
    drawNameTBDdRectangle(chart, sliderID + 1);
    drawNameTBDdCircle(chart, sliderID);
    updateAllGrandButtonRectangles(sliderID);
    updateAllGrandButtonRectangles(sliderID + 1);
    checkAndUpdateSplit(chart, overview, [sliderID]);
    checkAndUpdateSplit(chart, overview, [sliderID + 1]);
  } else if (overview === 1) {
    setActiveOverview(chart, overview1_active, 2);
    updateStateRectangle(
      chart,
      overview1_active,
      sliderID,
      [firstBrush[2], firstBrush[3]],
      1
    );
    updateStateRectangle(
      chart,
      overview1_active,
      sliderID + 1,
      [secondBrush[2], secondBrush[3]],
      1
    );

    setRangesWithID(1, {
      id: [overview1_active, sliderID],
      overlay: [firstBrush[0], firstBrush[1]],
      selection: [firstBrush[2], firstBrush[3]],
    });
    setSplitFlag(1, [overview1_active, sliderID], true);
    setRangesWithID(1, {
      id: [overview1_active, sliderID + 1],
      overlay: [secondBrush[0], secondBrush[1]],
      selection: [secondBrush[2], secondBrush[3]],
    });
    setSplitFlag(1, [overview1_active, sliderID + 1], true);

    drawSplitIndicator(chart, sliderID, splitPos, 1);
    indicatorUpdatePipeline(chart, {
      /* 1 : {
        "drawSplitIndicators" : true,
        "brushID" : sliderID,
        "splitPos" : splitPos,
      }, */
      2: {
        brushIndices: [0, 1, 2],
        updateAllIndicators: true,
      },
    });

    checkAndUpdateSplit(chart, overview, [overview1_active, sliderID]);
    checkAndUpdateSplit(chart, overview, [overview1_active, sliderID + 1]);
    renderButton(chart, 1, overview1_active, sliderID + 1);
    drawButtonRectangle(1, [overview1_active, sliderID], splitPos);
    drawButtonRectangle(1, [overview1_active, sliderID + 1]);
    updateAllGrandButtonRectangles(overview1_active);
  } else {
    updateStateRectangle(
      chart,
      overview2_active,
      sliderID,
      [firstBrush[2], firstBrush[3]],
      2
    );
    updateStateRectangle(
      chart,
      overview2_active,
      sliderID + 1,
      [secondBrush[2], secondBrush[3]],
      2
    );
    setRangesWithID(2, {
      id: [overview1_active, overview2_active, sliderID],
      overlay: [firstBrush[0], firstBrush[1]],
      selection: [firstBrush[2], firstBrush[3]],
    });
    setSplitFlag(2, [overview1_active, overview2_active, sliderID], true);
    setRangesWithID(2, {
      id: [overview1_active, overview2_active, sliderID + 1],
      overlay: [secondBrush[0], secondBrush[1]],
      selection: [secondBrush[2], secondBrush[3]],
    });
    setSplitFlag(2, [overview1_active, overview2_active, sliderID + 1], true);
    drawSplitIndicator(chart, sliderID, splitPos, 2);
    renderButton(
      chart,
      2,
      3 * overview1_active + overview2_active,
      sliderID + 1
    );
    checkAndUpdateSplit(chart, overview, [
      overview1_active,
      overview2_active,
      sliderID,
    ]);
    checkAndUpdateSplit(chart, overview, [
      overview1_active,
      overview2_active,
      sliderID + 1,
    ]);
    drawButtonRectangle(2, [overview1_active, overview2_active, sliderID]);
    drawButtonRectangle(2, [overview1_active, overview2_active, sliderID + 1]);
    drawGrandButtonRectangle([overview1_active, overview2_active, sliderID]);
    drawGrandButtonRectangle([
      overview1_active,
      overview2_active,
      sliderID + 1,
    ]);
  }
  //drawButtonTree(chart);
  redrawCurrentActivation(chart);
  if (chart.nodeActivityMode === "overview") {
    const brushKey = getBrushConfigKey(chart, overview, sliderID);
    if (checkIfBrushIsActiveNode(chart, brushKey)) {
      let activeNodes = [brushKey];
      let familyData = getFamilyOfBrush(chart, brushKey);
      if (familyData && familyData["siblings"].size > 0) {
        familyData = Array.from(familyData["siblings"]);
        activeNodes = activeNodes.concat(familyData);
        activeNodes.sort();
      }
      setAnnotationWindows(chart, activeNodes);
      addMultipleTextviews(chart, activeNodes);
    }
  }
  if (
    chart.overviews[overview + 1] &&
    chart.overviews[overview + 1]["backgroundRects"]
  ) {
    let convertedBrushData = cascadingProjection(
      chart,
      getBrushConfigKey(chart, overview, sliderID)
    );
    drawHistogram(chart, convertedBrushData[1], overview + 1);
  }
}

export function checkAndUpdateSplit(chart, overviewID, key) {
  if (!monitor) return 0;
  $(function () {
    let isSynched = isBrushSynchedWithText(chart, overviewID, key);
    if (isSynched[0] === true) {
      monitor.synchronizeView(chart, isSynched[1]);
      updateTextArea(chart);
    }
  });
}

/**
 *
 * helper function to translate the token/overlay range
 * within overview 3 to the corresponding selection ranges in overview 2 and overview 1
 * @param {*} chart
 * @param {number} position
 */
export function convertLastOverviewPosition(chart, position, viewKey) {
  /* let key;
  let new_position = position;
  if (viewKey === 0) {
    key = chart.selectedBrushForView0[1];
  } else if (viewKey === 1) {
    key = chart.selectedBrushForView1[1];
  } else {
    key = chart.selectedBrushForView2[1];
  } */

  let brushKey = chart.textViews[viewKey]["brushKey"];
  let new_position = position;

  if (brushKey.length > 2) {
    let grandParent = brushKey[0];
    let parent = brushKey[1];
    let px = stateEncoder.tokenRange[grandParent][0];
    let pw = stateEncoder.tokenRange[grandParent][1] - px;
    let l = chart.p.tokenExt;
    let m = px + Math.round((position * pw) / l);
    let gx = stateEncoder[grandParent].tokenRange[parent][0];
    let gw = stateEncoder[grandParent].tokenRange[parent][1] - gx;
    new_position = gx + Math.round((m * gw) / l);
  } else if (brushKey.length > 1) {
    let parent = brushKey[0];
    let px = stateEncoder.tokenRange[parent][0];
    let pw = stateEncoder.tokenRange[parent][1] - px;
    let l = chart.p.tokenExt;
    new_position = px + Math.round((position * pw) / l);
  }
  return new_position;
}

/**
 * Reset the information about Overview 2 within the state Object,
 * i.e. if the active parent brush in Overview 1 has been changed,
 * which induces a new partitioning within Overview 2 (basically reloading the state for the (re-)activated brush).
 * @param {*} chart
 * @param {number} id ID of the (new) active Brush in [[OVERVIEW 1]]
 */
export function resetSecondOverviewAndStateRects(chart, id = 0) {
  //chart.overview2
  //let brushIDs = chart.overviews[1]["brushID"];
  for (
    let selector = 0;
    selector < chart.overviews[1]["brushGroup"].length;
    selector++
  ) {
    //d3.select("#" + brushIDs[selector]).remove();
    if (chart.overviews[1]["brushGroup"][selector] !== null)
      chart.overviews[1]["brushGroup"][selector].remove();
  }
  /* chart.overviews[1]["svg"].select("#second_brushG").remove();
  chart.overviews[1]["svg"].select("#second_brushG2").remove();
  chart.overviews[1]["svg"].select("#second_brushG3").remove(); */

  let toBeSet = stateEncoder[id].viewsSet; //these are the partitions that need to be reconstructed within Overview 2
  let noneSet = true;
  resetIndicator(1);

  /**
   * We cycle through and reload the partitions of Overview 2 associated with the reactived brush in Overview 1.
   * For that we redraw the brushes according to the stored ranges and the corresponding rectangles and circular indicators.
   */
  for (let i = 0; i < toBeSet.length; i++) {
    if (toBeSet[i] === true) {
      let binRange = stateEncoder[id].tokenRange[i];
      let overlayRange = stateEncoder[id].overlayRange[i];
      removeBrush(chart, 1, i);
      installBrush(chart, 1, {
        brushNr: i,
        overlay: overlayRange,
        selection: binRange,
      });

      drawStateRectangle(chart, id, i, binRange, 1);
      noneSet = false; //we set this to false iff there has been stored at least one partitioning
    }
  }
  /**
   * Handle initial case where no former state has been saved.
   * noneSet is only true if there was no partitioning of Overview 2 associated witht the (re-)actived brush in Overview 1
   * In this case we only redraw the brush with initial ranges and do not reconstruct any rectangles or indicators.
   */
  if (noneSet === true) {
    installBrush(chart, 1, {
      brushNr: 0,
      overlay: [0, chart.p.tokenExt],
      selection: [0, chart.p.tokenExt],
    });
    //installSecondOVBrush(chart, 0, chart.p.tokenExt, 0, chart.p.tokenExt, 0);
    setPartitionAsTrue(id, 0);
    resetSlider(chart, 1);
  } else {
    /**
     * If a former partitioning has been reconstructed, the sliders need to be repositioned accordingly.
     * Furthermore the views need to be synched with the reconstructed partitioning.
     */
    if (toBeSet[1] === true) {
      //Overview 2 has been partitioned once with slider 1
      sliderReconfigurationCaller(
        chart,
        0,
        1,
        stateEncoder[id].overlayRange[1][0]
      );
      if (toBeSet[2] === true) {
        //Overview 2 has been partitioned twice additionally with slider 2
        sliderReconfigurationCaller(
          chart,
          1,
          1,
          stateEncoder[id].overlayRange[2][0]
        );
      } else {
        resetSlider(chart, 1, false, 1);
      }
    } else {
      resetSlider(chart, 1);
    }
    //updateAllSplits(chart);
    updateAllIndicators(chart, 1);
    updateAllIndicators(chart, 2);
  }
}

/**
 * @see {@link resetSecondOverviewAndStateRects} as this function behaves similarly and reconstructs the partitioning of Overview 3
 * @param {*} chart
 * @param {number} id ID of the (re-)activated brush in [[OVERVIEW 2]]
 */
export function resetThirdOverviewAndStateRects(chart, id = 0) {
  let grandParentID = stateEncoder.parentActive;
  let currStateEncoder = stateEncoder[grandParentID].children; //slightly laborious way of figuring out which brush in Overview 1 is currently active and accessing the appropriate layer within the state object
  //chart.overview3
  //let brushIDs = chart.overviews[2]["brushID"];
  for (
    let selector = 0;
    selector < chart.overviews[2]["brushGroup"].length;
    selector++
  ) {
    //d3.select("#" + brushIDs[selector]).remove();
    if (chart.overviews[2]["brushGroup"][selector] !== null)
      chart.overviews[2]["brushGroup"][selector].remove();
  }
  /* chart.overviews[2]["svg"].select("#third_brushG").remove();
  chart.overviews[2]["svg"].select("#third_brushG2").remove();
  chart.overviews[2]["svg"].select("#third_brushG3").remove(); */
  chart.overviews[2]["brushGroup"] = [null, null, null];

  let setOfPartitionsInChildOverview = currStateEncoder[id].viewsSet;
  let noBrushInChildOverviewActive = true;
  //monitor.resetViews(chart);
  resetIndicator(2);

  /**
   * Cycle through the stored partitionings of Overview 3 associated with the (re-activated) brush in Overview 2.
   * Reconstruct those partitions by redrawing the brushes, redrawing the rectangular and circular indicators and synching the views.
   */
  for (let i = 0; i < setOfPartitionsInChildOverview.length; i++) {
    if (setOfPartitionsInChildOverview[i] === true) {
      let binRange = currStateEncoder[id].tokenRange[i];
      let overlayRange = currStateEncoder[id].overlayRange[i];
      removeBrush(chart, 2, 2);
      installBrush(chart, 2, {
        brushNr: i,
        overlay: overlayRange,
        selection: binRange,
      });
      //monitor.updateSingleView(chart, i);
      drawStateRectangle(chart, id, i, binRange, 2);
      noBrushInChildOverviewActive = false;
    }
  }
  /**
   * Handle initial case where no former state has been saved.
   * noBrushInChildOverviewActive is only true if there was no partitioning of Overview 2 associated witht the (re-)actived brush in Overview 1
   * In this case we only redraw the brush with initial ranges and do not reconstruct any rectangles or indicators.
   * We additionally reset the views to one single view.
   */
  if (noBrushInChildOverviewActive === true) {
    //installThirdOVBrush(chart, 0, chart.p.tokenExt, 0, chart.p.tokenExt, 0);
    installBrush(chart, 2, {
      brushNr: 0,
      overlay: [0, chart.p.tokenExt],
      selection: [0, chart.p.tokenExt],
    });
    setPartitionAsTrue(id, 0, 2);
    resetSlider(chart, 2);
    //monitor.updateSingleView(chart, 0);
    //renderButton([grandParentID, id, 0], true);
  } else {
    /**
     * If a former partitioning has been reconstructed, the sliders need to be repositioned accordingly.
     * Furthermore the views need to be synched with the reconstructed partitioning.
     */
    if (setOfPartitionsInChildOverview[1] === true) {
      sliderReconfigurationCaller(
        chart,
        0,
        2,
        currStateEncoder[id].overlayRange[1][0]
      );
      if (setOfPartitionsInChildOverview[2] === true) {
        sliderReconfigurationCaller(
          chart,
          1,
          2,
          currStateEncoder[id].overlayRange[2][0]
        );
      } else {
        resetSlider(chart, 2, false, 1);
      }
    } else {
      resetSlider(chart, 2);
    }
    //updateAllSplits(chart);
    updateAllIndicators(chart, 2);
  }
  //updateTextArea(chart); ALREADY PART OF UPDATEALLSPLITS
}
