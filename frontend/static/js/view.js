import $ from "jquery";
import { monitor } from "./controller.js";

export let view = (function () {
  function init(ID, containerID, wordCount, chart) {
    let viewCount = wordCount == undefined ? 0 : wordCount;
    let viewContainer = $("#" + containerID);

    return {
      remove: function () {
        viewContainer.remove();
      },

      appendContent: function (spans) {
        viewContainer.append(spans);
        //viewCount = viewContainer.find("span:not(.text_whitespace)").length;
      },

      emptyContent: function () {
        viewContainer.empty();
      },
    };
  }

  return {
    newView: function (newID, content, predec, chart) {
      monitor.increaseNumViews();
      let newView = $(
        '<div id="' + newID + '" class="splitView">' + "</div>"
      ).insertAfter("#" + predec);
      newView.append(content);
      let wordCount = 0;
      return init(newID, newID, wordCount, chart);
    },

    initView: function (containerID, newID, chart) {
      let newView = $("#" + containerID);
      newView.addClass("splitView");
      let wordCount = 0;
      return init(newID, containerID, wordCount, chart);
    },
  };
})();
