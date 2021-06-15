import $ from "jquery";
import "jquery-ui-bundle";
/* import { setUpSplitBrushes } from "./brushSetup.js"; */
import { view } from "./view.js";
import { convertLastOverviewPosition } from "./overview.js";

export let view0;
export let view1;
export let view2;
export let bandInstance;
export let bandInstance2;
export let monitor;
export let bigSplit;
export let smallSplit;

export let controller = (function () {
  function init(textDivID, chart) {
    bigSplit = false;
    smallSplit = false;

    let stackedSplit = false;
    let stopOn = "currentStop"; // global variable to set on which word the bigSplit should occur
    let container = "#" + textDivID;
    //bandInstance = rubberBand.getInstance(textDivID);
    view0 = view.initView(textDivID, "view0", chart);
    let globalWordC = view0.getWordCount();
    //const splitSpace = $(container).height() - bandInstance.getHeight();
    //const splitSpace = $(container).height(); --> for landscape mode
    const splitSpace = view0.getParentHeight() - 10;

    /**
     * sets the height of the views according to their content:
     * case 1: both views contain enough text to exceed the space they're given
     *         --> maximum space for both views is bigSplit exactly in half
     * case 2: one of the views has not enough content to fill the space it is given
     *         --> the views height is set to exactly match the content length, the other view is granted the 'remaining' height
     */
    function setViewHeight() {
      return 0;
      /* view0.setHeight("auto");
      view1.setHeight("auto"); */
      if (bigSplit == false) {
        view0.setHeight(splitSpace);
      } else {
        if (smallSplit === false) {
          let upperHeight = view0.getHeight();
          let bottomHeight = view1.getHeight();
          let halfSpace = Math.floor(splitSpace / 2);
          //content of both views do not fit within (half the) available space
          if (upperHeight > halfSpace && bottomHeight > halfSpace) {
            view0.setHeight(halfSpace);
            view1.setHeight(halfSpace);
            //content of view0 does not fit within (half the) available space
          } else if (upperHeight > halfSpace && bottomHeight <= halfSpace) {
            if (bottomHeight < halfSpace) {
              view0.setHeight(halfSpace + (halfSpace - bottomHeight));
              view1.setHeight(bottomHeight);
            } else {
              view0.setHeight(halfSpace);
              view1.setHeight(halfSpace);
            }
            //content of view1 does not fit within (half the) available space
          } else if (bottomHeight > halfSpace && upperHeight <= halfSpace) {
            if (upperHeight < halfSpace) {
              view1.setHeight(halfSpace + (halfSpace - upperHeight));
              view0.setHeight(upperHeight);
            } else {
              view0.setHeight(halfSpace);
              view1.setHeight(halfSpace);
            }
            //miscellanous
          } else {
            view0.setHeight(halfSpace);
            view1.setHeight(halfSpace);
          }
        } else {
          /* 
              (Space of the container) - 
              ((both rubberband heights) + 
              (10 magix pixel to prevent overlap of div and text)) 
              divided by three 
              -
              CHANGE ONETHIRDSPACE IF ANYTHING PUT BETWEEN VIEWS
              */
          /* let oneThirdSpace = Math.floor((splitSpace - (110)) / 3); */
          let oneThirdSpace = Math.floor(splitSpace / 3);
          view0.setHeight(oneThirdSpace);
          view1.setHeight(oneThirdSpace);
          view2.setHeight(oneThirdSpace);
        }
      }
    }

    /**
     * set stop mode : CHANGE FROM VIEW TO HERE
     * @param {String} stop - the stop mode
     */
    function setStop(stop) {
      $("#" + stopOn).val("inactive");
      stopOn = stop;
      $("#" + stopOn).val("active");
    }

    /**
     * factory function to set word counts
     * @param {number} globaL - global word count
     * @param {number} v0C - view0 word count
     * @param {number} v1C - view1 word count
     */
    function setWordCount(global, v0C, v1C) {
      if (global) {
        globalWordC = global;
      }
      if (v0C) {
        view0.setWordCount(v0C);
      } else {
        view0.setWordCount(global);
      }
      if (bigSplit == true && v1C) {
        view1.setWordCount(v1C);
      } else {
        view1.setWordCount(global);
      }
    }

    /**
     * get the actual amount of words hidden between the views
     * @param {number} first - id of the first visible span in the bottom view
     * @param {number} last - id of the last visible span in the upper view
     * @returns {number} - word amount
     */
    function getWordAmount(first, last) {
      let current;
      let count = 0;
      first++;
      last--;
      for (let i = first; i <= last; i++) {
        current = "#span" + i;
        if (!$(current).hasClass("text_whitespace")) {
          count++;
        }
      }
      return count;
    }

    return {
      synchronizeView: function (chart, viewID) {
        let overlayRange = chart.assignedRangeForViews[viewID][1];
        let start = overlayRange[0];
        start =
          chart.d.spanIDTable[
            chart.d.bins[convertLastOverviewPosition(chart, start)].tokens[0].id
          ];
        let end = overlayRange[1];

        //HACK
        end = Math.min(end, chart.d.bins.length - 1);

        end =
          chart.d.spanIDTable[
            chart.d.bins[convertLastOverviewPosition(chart, end) - 1].tokens[0]
              .id
          ];
        if (viewID === 0) {
          view0.emptyContent();
          view0.appendContent(chart.d.spans.slice(start, end));
        } else if (viewID === 1) {
          if (bigSplit == true) {
            view1.emptyContent();
            view1.appendContent(chart.d.spans.slice(start, end));
          } else {
            view1 = view.newView(
              "view1",
              chart.d.spans.slice(start, end),
              textDivID,
              chart
            );
            bigSplit = true;
          }
        } else {
          if (smallSplit == true) {
            view2.emptyContent();
            view2.appendContent(chart.d.spans.slice(start, end));
          } else {
            view2 = view.newView(
              "view2",
              chart.d.spans.slice(start, end),
              "view1",
              chart
            );
            smallSplit = true;
          }
        }
        setViewHeight();
      },

      updateSingleView: function (chart, viewID, overview = 2) {
        let currentOverview;
        if (overview === 0) {
          currentOverview = chart.overviews[0]["brushGroup"];
        } else if (overview === 1) {
          currentOverview = chart.overviews[1]["brushGroup"];
        } else {
          currentOverview = chart.overviews[2]["brushGroup"];
        }
        let start = parseInt(
          currentOverview[viewID].select(".overlay").attr("x")
        );
        start =
          chart.d.spanIDTable[
            chart.d.bins[convertLastOverviewPosition(chart, start)].tokens[0].id
          ];
        let end =
          parseInt(currentOverview[viewID].select(".overlay").attr("x")) +
          parseInt(currentOverview[viewID].select(".overlay").attr("width"));
        end =
          chart.d.spanIDTable[
            chart.d.bins[convertLastOverviewPosition(chart, end) - 1].tokens[0]
              .id
          ];
        if (viewID === 0) {
          view0.emptyContent();
          view0.appendContent(chart.d.spans.slice(start, end));
        } else if (viewID === 1) {
          if (bigSplit == true) {
            view1.emptyContent();
            view1.appendContent(chart.d.spans.slice(start, end));
          } else {
            view1 = view.newView(
              "view1",
              chart.d.spans.slice(start, end),
              textDivID,
              chart
            );
            bigSplit = true;
          }
        } else {
          if (smallSplit == true) {
            view2.emptyContent();
            view2.appendContent(chart.d.spans.slice(start, end));
          } else {
            view2 = view.newView(
              "view2",
              chart.d.spans.slice(start, end),
              "view1",
              chart
            );
            smallSplit = true;
          }
        }
        setViewHeight();
      },

      resetViews: function (chart, overview = 2) {
        let currentSplits;
        if (overview === 0) {
          currentSplits = chart.overviews[0]["splits"];
        } else if (overview === 1) {
          currentSplits = chart.overviews[1]["splits"];
        } else {
          currentSplits = chart.overviews[2]["splits"];
        }
        if (bigSplit === true) {
          view1.remove();
          bigSplit = false;
          currentSplits[0] = false;
        }
        if (smallSplit === true) {
          view2.remove();
          smallSplit = false;
          currentSplits[1] = false;
        }
        setViewHeight();
      },

      getDistance: function (viewID, dir) {
        let number1 = view0.getCachedLast();
        let number2 = view1.getCachedFirst();
        if (viewID == "view0") {
          number1 = view0.getLastVisible(dir);
        } else {
          number2 = view1.getFirstVisible(dir);
        }

        return getWordAmount(number1, number2);
      },

      /**
       * Determine the actual bigSplit point according to the stop mode
       * @param {number} id - id of the bigSplit anchor
       * @returns id of the span where the text is to be bigSplit
       */
      getNextStop: function (id) {
        if (stopOn == "currentStop") {
          return id;
        }
        let initialID = id.replace(/^\D+/g, "");
        let spanID;
        let closestFullstop;
        if (stopOn == "nextStop") {
          while (true) {
            spanID = "#txt_" + initialID;
            if ($(spanID).text() == ".") {
              closestFullstop = initialID;
              break;
            }
            initialID++;
          }
        } else {
          initialID = id.replace(/^\D+/g, "");
          while (true) {
            spanID = "#txt_" + initialID;
            if ($(spanID).text() == ".") {
              closestFullstop = initialID;
              break;
            }
            initialID--;
          }
        }
        return "txt_" + closestFullstop;
      },
    };
  }

  return {
    newMonitor: function (textDivID, chart) {
      monitor = init(textDivID, chart);
    },
  };
})();

//let monitor = controller.newMonitor("container", "textDiv");

/* var a = ["#a1", "#b2"];
var b = a.map(function(e) {
    e = e.replace(/^\D+/g, '');
    return e;
}); */
