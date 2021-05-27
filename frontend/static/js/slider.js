import * as d3 from "d3";
import $ from "jquery";
import { reconfigurePartitions } from "./overview";

export const initPos = 1419; //hardcoded end of brush

/**
 * slider object for the first overview
 * @param sliderObj the draggable part
 * @param sliderBar the black bar
 * @param pos current position of the slider
 * @param posRef former position of slider (to determine movement direction)
 * @param initPos initial position of slider
 * @param lastHighlighted lastly hovered token that was highlighted
 * @param lastHighlightedColor
 * @param boundBrush1 the left side brush of the partitioning
 * @param boundBrush2 the right side brush of the partitioning
 */
export var slider = [
  {
    sliderObj: "",
    sliderBar: "",
    pos: initPos,
    posRef: 0,
    initPos: initPos,
    lastHighlighted: 0,
    lastHighlightedColor: "white",
    boundBrush1: "",
    boundBrush2: "",
  },

  {
    sliderBar: "",
    sliderObj: "",
    pos: initPos,
    posRef: 0,
    initPos: initPos,
    lastHighlighted: 0,
    lastHighlightedColor: "white",
    boundBrush1: "",
    boundBrush2: "",
  },
];

/**
 *
 * slider object for the second overview
 * @see {@link slider} for parameter details
 */
export var secondSlider = [
  {
    sliderObj: "",
    sliderBar: "",
    pos: initPos,
    posRef: 0,
    initPos: initPos,
    lastHighlighted: 0,
    lastHighlightedColor: "white",
    boundBrush1: "",
    boundBrush2: "",
  },

  {
    sliderBar: "",
    sliderObj: "",
    pos: initPos,
    posRef: 0,
    initPos: initPos,
    lastHighlighted: 0,
    lastHighlightedColor: "white",
    boundBrush1: "",
    boundBrush2: "",
  },
];

/**
 *
 * slider object for the third overview
 * @see {@link slider} for parameter details
 */
export var thirdSlider = [
  {
    sliderObj: "",
    sliderBar: "",
    pos: initPos,
    posRef: 0,
    initPos: initPos,
    lastHighlighted: 0,
    lastHighlightedColor: "white",
    boundBrush1: "",
    boundBrush2: "",
  },

  {
    sliderBar: "",
    sliderObj: "",
    pos: initPos,
    posRef: 0,
    initPos: initPos,
    lastHighlighted: 0,
    lastHighlightedColor: "white",
    boundBrush1: "",
    boundBrush2: "",
  },
];

/**
 *
 * add a slider to the specified overview on the specified position
 * @param {*} chart
 * @param {number} overviewID
 * @param {number} id ID of the slider ({0, 1})
 * @param {number} splitPos partitioning point in the overview
 */
function addSlider(chart, overviewID, id, splitPos) {
  chart.p.sliderWidth = 2;
  chart.p.sliderHandleWidth = 20;
  chart.p.sliderHeight = 40;

  if (overviewID === 0) {
    var currChart = chart.overviews[0]["slider"]["svg"]; //chart.slider
    var currOverview = chart.overviews[0]["stripGroup"]; //chart.overview
    var currSlider = slider[0];
    var currID = "slider";
    var currBar = "sliderBar";
    if (id === 1) {
      currSlider = slider[1];
      currID = currID + "2";
      currBar = currBar + "2";
    }
  } else if (overviewID === 1) {
    var currChart = chart.overviews[1]["slider"]["svg"]; //chart.slider2
    var currOverview = chart.overviews[1]["stripGroup"]; //chart.overview2
    var currSlider = secondSlider[0];
    var currID = "secondSlider";
    var currBar = "secondSliderBar";
    if (id === 1) {
      currSlider = secondSlider[1];
      currID = currID + "2";
      currBar = currBar + "2";
    }
  } else {
    var currChart = chart.overviews[2]["slider"]["svg"]; //chart.slider3;
    var currOverview = chart.overviews[2]["stripGroup"]; //chart.overview3
    var currSlider = thirdSlider[0];
    var currID = "thirdSlider";
    var currBar = "thirdSliderBar";
    if (id === 1) {
      currSlider = thirdSlider[1];
      currID = currID + "2";
      currBar = currBar + "2";
    }
  }
  currSlider.pos = splitPos;
  currSlider.posRef = 0;
  currSlider.sliderObj = currChart
    .append("rect")
    .attr("id", currID)
    .attr("class", "slider")
    .attr("x", splitPos - chart.p.sliderHandleWidth / 2)
    .attr("y", chart.p.overviewExt)
    .attr("width", chart.p.sliderHandleWidth)
    .attr("height", 12.5);

  currSlider.sliderBar = currOverview
    .append("rect")
    .attr("id", currBar)
    .attr("x", splitPos)
    .attr("y", 0)
    .attr("width", chart.p.sliderWidth)
    .attr("height", chart.p.overviewExt);
}

/**
 *
 * [This function is called when the sliders are initally moved into the overview]
 * Initially bind a slider in the specified overview on the specified position to its left and right side brushes
 * When the slider is moved via dragging, the new partitioning and the resuling brush ranges are calculated
 * and the corresponding updates are propagated
 * @param {*} chart
 * @param {*} splitPos New partitioning position and position of the slider
 * @param {*} overviewID The overview where all of the following is happening
 * @param {*} id ID specifying if the first or the second slider of the overview was moved
 */
export function bindSliderToBrushes(chart, splitPos, overviewID, id) {
  addSlider(chart, overviewID, id, splitPos);
  //depending on which brush was shortened due to slider movement,
  //the corresponding overlay and selection ranges change
  //which also results in the change of the synched text view
  var view = id === 0 ? "view0" : "view1";
  if (overviewID === 0) {
    var currSlider = slider[0];
    var otherSlider = slider[1];
    if (id === 1) {
      currSlider = slider[1];
      otherSlider = slider[0];
    }
  } else if (overviewID === 1) {
    if (id === 0) {
      var currSlider = secondSlider[0];
      var otherSlider = secondSlider[1];
    } else {
      var currSlider = secondSlider[1];
      var otherSlider = secondSlider[0];
    }
  } else {
    if (id === 0) {
      var currSlider = thirdSlider[0];
      var otherSlider = thirdSlider[1];
    } else {
      var currSlider = thirdSlider[1];
      var otherSlider = thirdSlider[0];
    }
  }
  var dragHandler = d3
    .drag()
    //record change in slider position (needed for calc. new partitioning)
    .on("drag", function (e) {
      currSlider.sliderObj.attr(
        "x",
        parseInt(d3.event.x) - chart.p.sliderHandleWidth / 2
      );
      currSlider.sliderBar.attr("x", parseInt(d3.event.x));
      currSlider.posRef = currSlider.pos;
      currSlider.pos = parseInt(d3.event.x);
      currSlider.lastHighlighted = currSlider.pos;
    })
    .on("end", function () {
      //determine the left side and right side brushes of the respective overviews
      if (overviewID === 0) {
        var leftBrush = chart.overviews[0]["brushGroup"][id];
        var rightBrush = chart.overviews[0]["brushGroup"][parseInt(id + 1)];
      } else if (overviewID === 1) {
        var leftBrush = chart.overviews[1]["brushGroup"][id];
        var rightBrush = chart.overviews[1]["brushGroup"][parseInt(id + 1)];
      } else {
        var leftBrush = chart.overviews[2]["brushGroup"][id];
        var rightBrush = chart.overviews[2]["brushGroup"][parseInt(id + 1)];
      }

      //change in partitioning requires updating the ranges of the affected brushes
      var leftBrushLeftBorder = 0;
      var leftBrushRightBorder = currSlider.pos;
      var rightBrushLeftBorder = currSlider.pos + chart.p.sliderWidth;
      var rightBrushRightBorder = chart.p.tokenExt;

      //covering the case that the second slider was moved
      if (id === 1) {
        leftBrushLeftBorder = otherSlider.pos + chart.p.sliderWidth;
        leftBrushRightBorder = currSlider.pos;
        rightBrushLeftBorder = currSlider.pos + chart.p.sliderWidth;
        rightBrushRightBorder = chart.p.tokenExt;

        //check if the second slider oversteps the partitiong boundary of the first slider and reset if that is the case
        //we do not need to check this for the first slider, as initially there is no second slider active
        if (checkBoundary(overviewID) === true) {
          currSlider.sliderObj.remove();
          currSlider.sliderBar.remove();
          bindSliderToBrushes(chart, chart.p.tokenExt, overviewID, 1);
          return false;
        }
      }
      currSlider.boundBrush1 = leftBrush;
      currSlider.boundBrush2 = rightBrush;
      currSlider.initPos = currSlider.pos;

      //determine current range of left side brush
      var brush1SelectionX = parseInt(leftBrush.select(".selection").attr("x"));
      var brush1SelectionEnd =
        parseInt(leftBrush.select(".selection").attr("x")) +
        parseInt(leftBrush.select(".selection").attr("width"));

      //set the new ranges of left and right side brushes
      var brush1Ranges = [
        leftBrushLeftBorder,
        leftBrushRightBorder,
        Math.min(leftBrushLeftBorder, brush1SelectionX),
        Math.min(leftBrushRightBorder, brush1SelectionEnd),
      ];
      //remember: this is the initial binding of the slider, i.e. the initial partitioning
      //so the second brush is freshly drawn, hence we do not need to distinguish selection and overlay ranges
      var brush2Ranges = [
        rightBrushLeftBorder,
        rightBrushRightBorder,
        rightBrushLeftBorder,
        rightBrushRightBorder,
      ];

      //propagate new partitioning and redraw brushes, adjust views, ...
      $(function () {
        reconfigurePartitions(
          chart,
          view,
          currSlider.pos,
          brush1Ranges,
          brush2Ranges,
          id,
          overviewID
        );
      });
    });
  dragHandler(currSlider.sliderObj);
}

/**
 * [This function is called when a slider is already bound and established and then moved]
 * reconfigures either of the two sliders
 * first slider sits between brush1 (leftmost brush) and brush2 (middle brush)
 * second slider sits between brush2 and brush3 (rightmost brush)
 * @param {chart} chart - the chart object
 * @param {number} splitPos - the position of the new partitioning
 * @param {number} overviewID - id of the corresponding overview
 * @param {number} id - id of the corresponding slider (0 - slider1, 1 - slider2)
 */
export function reconfigureSlider(chart, splitPos, overviewID, id) {
  addSlider(chart, overviewID, id, splitPos);
  //we have to assume that affected overview is already partitioned twice
  //i.e. three brushes exist, which also means that the movement of a single slider
  //might change the ranges of up to two brushes and their respective synched views
  var leftView = id === 0 ? "view0" : "view1";
  var rightView = id === 0 ? "view1" : "view2";
  if (overviewID === 0) {
    var leftSlider = slider[0];
    var rightSlider = slider[1];
    var currSlider = id === 0 ? slider[0] : slider[1];
  } else if (overviewID === 1) {
    var leftSlider = secondSlider[0];
    var rightSlider = secondSlider[1];
    var currSlider = id === 0 ? secondSlider[0] : secondSlider[1];
  } else {
    var leftSlider = thirdSlider[0];
    var rightSlider = thirdSlider[1];
    var currSlider = id === 0 ? thirdSlider[0] : thirdSlider[1];
  }
  var dragHandler = d3
    .drag()
    .on("drag", function (e) {
      //record change in slider position (needed for calc. new partitioning)
      var newX = parseInt(d3.event.x) - chart.p.sliderHandleWidth / 2;
      var newBarX = parseInt(d3.event.x);
      currSlider.sliderObj.attr("x", newX);
      currSlider.sliderBar.attr("x", newBarX);
      currSlider.posRef = currSlider.pos;
      currSlider.pos = newBarX;
      currSlider.lastHighlighted = currSlider.pos;
    })
    .on("end", function () {
      //check if the moved slider oversteps the partitioning boundaries of the non affected slider and reset if so
      if (checkBoundary(overviewID) === true) {
        currSlider.sliderObj.remove();
        currSlider.sliderBar.remove();
        reconfigureSlider(chart, currSlider.initPos, overviewID, id);
        return false;
      }
      currSlider.initPos = currSlider.pos;

      //determine the left side and right side brushes of the respective overviews
      if (overviewID === 0) {
        currSlider.boundBrush1 = chart.overviews[0]["brushGroup"][id];
        currSlider.boundBrush2 =
          chart.overviews[0]["brushGroup"][parseInt(id + 1)];
      } else if (overviewID === 1) {
        currSlider.boundBrush1 = chart.overviews[1]["brushGroup"][id];
        currSlider.boundBrush2 =
          chart.overviews[1]["brushGroup"][parseInt(id + 1)];
      } else {
        currSlider.boundBrush1 = chart.overviews[2]["brushGroup"][id];
        currSlider.boundBrush2 =
          chart.overviews[2]["brushGroup"][parseInt(id + 1)];
      }

      //determine current ranges of the affected brushes
      var brush1SelectionX = parseInt(
        currSlider.boundBrush1.select(".selection").attr("x")
      );
      var brush1SelectionEnd =
        parseInt(currSlider.boundBrush1.select(".selection").attr("x")) +
        parseInt(currSlider.boundBrush1.select(".selection").attr("width"));
      var brush2SelectionX = parseInt(
        currSlider.boundBrush2.select(".selection").attr("x")
      );
      var brush2SelectionEnd =
        parseInt(currSlider.boundBrush2.select(".selection").attr("x")) +
        parseInt(currSlider.boundBrush2.select(".selection").attr("width"));
      var brush2OverlayX = parseInt(
        currSlider.boundBrush2.select(".overlay").attr("x")
      );
      /**
       * the left overlay border of the left brush:
       * 0, if left brush is brush1
       * the first sliders pos., else
       */
      var leftMost = id === 0 ? 0 : leftSlider.pos + chart.p.sliderWidth;

      /**
       * the left overlay border of the right brush
       * e.g. either brush2 or brush3
       */
      var left = currSlider.pos + chart.p.sliderWidth;
      /**
       * the right overlay border of the left brush
       * e.g brush1 or brush2
       *
       */
      var right = currSlider.pos;
      /**
       * the right overlay border of the right brush:
       * end of chart, if right brush is brush3
       * or right brush is brush2 and brush3 does not exist yet
       * the second sliders pos., else
       */
      var rightMost;
      var is_splitTrue;
      if (overviewID === 0) {
        is_splitTrue = chart.overviews[0]["splits"][1];
      } else if (overviewID === 1) {
        is_splitTrue = chart.overviews[1]["splits"][1];
      } else {
        is_splitTrue = chart.overviews[2]["splits"][1];
      }
      if (id === 1 || is_splitTrue === false) {
        rightMost = chart.p.tokenExt;
      } else {
        rightMost = rightSlider.pos;
      }

      //set the new brush ranges
      //we make some distinctions whether the former selection ranges where shortened by the new slider position
      var brush1Move = [
        leftMost,
        right,
        brush1SelectionX,
        Math.min(brush1SelectionEnd, right),
      ];
      if (currSlider.pos < brush1SelectionX) {
        brush1Move[2] = leftMost;
        brush1Move[3] = right;
      }
      var brush2Move = [
        left,
        rightMost,
        Math.max(brush2SelectionX, left),
        brush2SelectionEnd,
      ];
      if (currSlider.pos > brush2SelectionEnd) {
        brush2Move[2] = left;
        brush2Move[3] = rightMost;
      }

      //moving the slider will either change the overlay range of the left side or the ride side brush
      //correspondingly the synched views will need to be updates
      if (currSlider.pos > brush2OverlayX) {
        $(function () {
          reconfigurePartitions(
            chart,
            rightView,
            currSlider.pos,
            brush1Move,
            brush2Move,
            id,
            overviewID
          );
        });
      } else {
        $(function () {
          reconfigurePartitions(
            chart,
            leftView,
            currSlider.pos,
            brush1Move,
            brush2Move,
            id,
            overviewID
          );
        });
      }
    });
  dragHandler(currSlider.sliderObj);
}

/**
 *
 * helper function to determine if either of the two sliders of an overview
 * overstep the partitioning boundaries of the other slider
 * @param {number} overviewID the affected overview
 */
function checkBoundary(overviewID) {
  if (overviewID === 0) {
    if (slider[0].pos >= slider[1].pos) {
      return true;
    }
  } else if (overviewID === 1) {
    if (secondSlider[0].pos >= secondSlider[1].pos) {
      return true;
    }
  } else {
    if (thirdSlider[0].pos >= thirdSlider[1].pos) {
      return true;
    }
  }
}

/**
 *
 * Helper function that removes and re-inserts the specified slider(s)
 * @param {*} chart
 * @param {number} sliderID
 * @param {number} overview
 * @param {number} splitPos
 */
export function sliderReconfigurationCaller(
  chart,
  sliderID,
  overview,
  splitPos
) {
  if (sliderID != 0 && sliderID != 1) {
    new Error("INVALID SLIDER ID!");
  }
  if (overview === 0) {
    slider[sliderID].sliderObj.remove();
    slider[sliderID].sliderBar.remove();
  } else if (overview === 1) {
    secondSlider[sliderID].sliderObj.remove();
    secondSlider[sliderID].sliderBar.remove();
  } else {
    thirdSlider[sliderID].sliderObj.remove();
    thirdSlider[sliderID].sliderBar.remove();
  }
  reconfigureSlider(chart, splitPos, overview, sliderID);
}

/**
 *
 * Helper function that removes either all sliders of the specified overview (all === true)
 * or a specific slider within the overview, determined via id
 * @param {*} chart
 * @param {number} overview ID of the affected overview
 * @param {boolean} all boolean that determines if all sliders are to be removed
 * @param {number} id id of the specific slider to be removed
 */
export function resetSlider(chart, overview, all = true, id = 1) {
  if (all === true) {
    if (overview === 0) {
      slider[0].sliderObj.remove();
      slider[0].sliderBar.remove();
      slider[1].sliderObj.remove();
      slider[1].sliderBar.remove();
      bindSliderToBrushes(chart, chart.p.tokenExt, 0, 1);
      bindSliderToBrushes(chart, chart.p.tokenExt, 0, 0);
    } else if (overview === 1) {
      secondSlider[0].sliderObj.remove();
      secondSlider[0].sliderBar.remove();
      secondSlider[1].sliderObj.remove();
      secondSlider[1].sliderBar.remove();
      bindSliderToBrushes(chart, chart.p.tokenExt, 1, 1);
      bindSliderToBrushes(chart, chart.p.tokenExt, 1, 0);
    } else {
      thirdSlider[0].sliderObj.remove();
      thirdSlider[0].sliderBar.remove();
      thirdSlider[1].sliderObj.remove();
      thirdSlider[1].sliderBar.remove();
      bindSliderToBrushes(chart, chart.p.tokenExt, 2, 1);
      bindSliderToBrushes(chart, chart.p.tokenExt, 2, 0);
    }
  } else {
    if (overview === 0) {
      slider[id].sliderObj.remove();
      slider[id].sliderBar.remove();
      bindSliderToBrushes(chart, chart.p.tokenExt, 0, id);
    } else if (overview === 1) {
      secondSlider[id].sliderObj.remove();
      secondSlider[id].sliderBar.remove();
      bindSliderToBrushes(chart, chart.p.tokenExt, 1, id);
    } else {
      thirdSlider[id].sliderObj.remove();
      thirdSlider[id].sliderBar.remove();
      bindSliderToBrushes(chart, chart.p.tokenExt, 2, id);
    }
  }
}
