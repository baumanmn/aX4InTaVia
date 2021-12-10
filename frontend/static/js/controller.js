import { view } from "./view.js";
import { convertLastOverviewPosition } from "./overview.js";

export let view0;
export let view1;
export let view2;
export let monitor;
export let bigSplit;
export let smallSplit;

export let controller = (function () {
  function init(textDivID, chart) {
    bigSplit = false;
    smallSplit = false;
    view0 = view.initView(textDivID, "view0", chart);
    let numViews = 1;

    return {
      getNumViews: function () {
        return numViews;
      },

      increaseNumViews: function () {
        return 0;
        console.log("inc");
        numViews += 1;
        let textArea = document.getElementsByClassName("textArea")[0];
        textArea.style.gridTemplateRows = "repeat(" + numViews + ", 1fr)";
      },

      synchronizeView: function (chart, viewID) {
        return 0;
        /* let overlayRange = chart.assignedRangeForViews[viewID][1]; */

        let overlayRange = chart.textViews[viewID]["assignedRange"][1];

        let start = overlayRange[0];
        start =
          chart.d.spanIDTable[
            chart.d.bins[convertLastOverviewPosition(chart, start, viewID)]
              .tokens[0].id
          ];
        let end = overlayRange[1];

        //HACK
        end = Math.min(end, chart.d.bins.length - 1);

        end =
          chart.d.spanIDTable[
            chart.d.bins[convertLastOverviewPosition(chart, end, viewID) - 1]
              .tokens[0].id
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
      },

      updateSingleView: function (chart, viewID, overview = 2) {
        return 0;
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
      },

      resetViews: function (chart, overview = 2) {
        return 0;
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
      },
    };
  }

  return {
    newMonitor: function (textDivID, chart) {
      monitor = init(textDivID, chart);
    },
  };
})();
