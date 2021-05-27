import $ from "jquery";
import "jquery-ui-bundle";
import { view1, bandInstance, monitor } from "./controller.js";
import { getBinIdByTokenID } from "./functions.js";

export let view = (function () {
  //TO DO: couple with available space

  function init(ID, containerID, wordCount, chart) {
    let scrollPos = 0;
    let lastVis = 0;
    let firstVis = 0;
    let viewSpans;
    let viewCount = wordCount == undefined ? 0 : wordCount;
    let viewID = ID; //abstract view ID to distinguish different splitViews
    let viewContainer = $("#" + containerID); //HMTL Object corresponding to the splitView

    /**
     * detects whether the user has scrolled up or scrolled down within a bigSplit view
     *
     * @param {number} lastScroll - change in height since the last scroll operation
     * @param {String} direction - direction of the scroll operation
     */
    function detectScroll(lastScroll, direction) {
      let currentScroll = viewContainer.scrollTop();
      if (direction == "up") {
        return currentScroll < lastScroll;
      } else {
        return currentScroll > lastScroll;
      }
    }

    return {
      getID: function () {
        return viewID;
      },

      remove: function () {
        viewContainer.remove();
      },

      adjustViewport: function (pos) {
        if (pos != undefined) {
          viewContainer.scrollTop(pos);
          scrollPos = pos;
        } else {
          //let pos = document.getElementById(containerID).scrollHeight;
          let pos = viewContainer.prop("scrollHeight");
          viewContainer.scrollTop(pos);
          scrollPos = pos;
        }
        $(window).scrollTop(0);
      },

      getScrollTop: function () {
        return viewContainer.scrollTop();
      },

      setHeight: function (height) {
        viewContainer.height(height);
      },

      getHeight: function () {
        return viewContainer.height();
      },

      setWidth: function (width) {
        viewContainer.width(width);
      },

      getWidth: function () {
        return viewContainer.width();
      },

      getParentHeight: function () {
        return viewContainer.parent().height();
      },

      getContent: function () {
        return viewContainer.find("span");
      },

      appendContent: function (spans) {
        viewContainer.append(spans);
        viewCount = viewContainer.find("span:not(.text_whitespace)").length;
      },

      emptyContent: function () {
        viewContainer.empty();
      },

      getWordCount: function () {
        return viewCount;
      },

      setWordCount: function (count) {
        viewCount = count;
      },

      resetWCache: function () {
        lastVis = viewContainer.find("span:not(.text_whitespace)").length - 1;
        firstVis = 0;
      },

      prependContent: function (spans) {
        viewContainer.prepend(spans);
      },

      setScrollFunct: function () {
        viewContainer.unbind("scroll");
        viewContainer.scroll(function () {});
      },

      setView: function () {
        let distance;
        scrollPos = 0;
        viewContainer.unbind("scroll");
        viewContainer.scroll(function () {
          if (
            viewContainer.scrollTop() >=
              viewContainer[0].scrollHeight - viewContainer.outerHeight() &&
            view1.getScrollTop() == 0
          ) {
            distance = 0;
          } else {
            //CAUTION! CYCLIC COUPLING BETWEEN VIEW AND CONTROLLER HERE
            distance =
              detectScroll(scrollPos, "up") == true
                ? monitor.getDistance(viewID, "up")
                : monitor.getDistance(viewID, "down");
            if (bandInstance.getForm() == true) {
              bandInstance.adjustBandInward(
                distance,
                viewCount,
                viewContainer.width()
              );
            } else {
              bandInstance.adjustBandStraight(
                distance,
                viewCount,
                viewContainer.width()
              );
            }
          }

          scrollPos = viewContainer.scrollTop();
          bandInstance.showDistance(distance); //TODO for view2
        });
      },

      /**
       * function for splitting a scrollable view into two new splitviews
       * @param {string} seperator - id of the bigSplit anchor
       */
      splitView: function (tokenID, propagate = false) {
        let splitContent = viewContainer.find("span"); //get all the spans of the parent object

        //seperator = "#" + monitor.getNextStop(seperator); //get the actual bigSplit seperator according to bigSplit mode
        /* seperator = "#" + seperator; */
        separator = $("#tx_t" + tokenID);

        let index = $(splitContent).index($(separator));

        let secondView = splitContent.slice(index + 1);

        splitContent = splitContent.slice(0, index + 1);

        viewContainer.empty();

        if (propagate == true) {
          viewContainer.append(secondView); //append everything following the bigSplit to the current view
          return splitContent;
        } else {
          viewContainer.append(splitContent); //append everything foregoing the bigSplit to the current view
          return secondView;
        }
      },

      refreshContent: function (begin, end) {
        let content = [];
        viewContainer.empty();
        /* for(let i = begin; i <= end; i++) {
            let currentToken = $("#tx_t_" + i);
            viewContainer.append(currentToken);
            let nextWhiteSpace = currentToken.next("span");
            while(nextWhiteSpace.hasClass("text_whitespace")) {
              viewContainer.append(nextWhiteSpace);
              nextWhiteSpace = nextWhiteSpace.next("span");
            }
        } */
      },

      getLastVisible: function (dir) {
        viewSpans = viewContainer.find("span:not(.text_whitespace)"); //the spans within the views need to be up to date
        let viewHeight =
          viewContainer.outerHeight() +
          viewContainer.position().top -
          parseInt(viewContainer.css("border-bottom-width"));
        let number1 = 0;
        if (dir == "up") {
          for (let i = lastVis; i >= 0; i--) {
            let lastWord = $(viewSpans[i]);
            let lastWordBot = lastWord.height() + lastWord.position().top;
            if (lastWordBot < viewHeight) {
              number1 = lastWord.attr("id").match(/\d+/)[0];
              lastVis = i;
              break;
            }
          }
        } else {
          for (let i = lastVis; i < viewSpans.length - 2; i++) {
            let lastWord = $(viewSpans[i]);
            let lastWordBot = lastWord.height() + lastWord.position().top;
            let lastWordLeft = lastWord.offset().left;
            let lastNextLeft = $(viewSpans[i + 1]).offset().left;
            if (lastWordBot > viewHeight && lastWordLeft > lastNextLeft) {
              number1 = lastWord.attr("id").match(/\d+/)[0];
              lastVis = i;
              break;
            }
          }
        }
        return number1;
      },

      getFirstVisible: function (dir) {
        viewSpans = viewContainer.find("span:not(.text_whitespace)"); //the spans within the views need to be up to date
        let viewHeight =
          viewContainer.position().top +
          parseInt(viewContainer.css("border-top-width"));
        let number2 = 0;
        if (dir == "up") {
          for (let j = firstVis; j > 1; j--) {
            let firstWord = $(viewSpans[j]);
            let firstWordBot = firstWord.position().top + firstWord.height();
            let firstWordLeft = firstWord.offset().left;
            let firstPrevLeft = $(viewSpans[j - 1]).offset().left;
            if (firstWordBot < viewHeight && firstWordLeft < firstPrevLeft) {
              number2 = firstWord.attr("id").match(/\d+/)[0];
              firstVis = j;
              break;
            }
          }
        } else {
          for (let j = firstVis; j < viewSpans.length; j++) {
            let firstWord = $(viewSpans[j]);
            let firstWordBot = firstWord.position().top + firstWord.height();
            if (firstWordBot > viewHeight) {
              number2 = firstWord.attr("id").match(/\d+/)[0];
              firstVis = j;
              break;
            }
          }
        }

        return number2;
      },

      getCachedFirst: function () {
        viewSpans = viewContainer.find("span:not(.text_whitespace)"); //the spans within the views need to be up to date
        return $(viewSpans[firstVis]).attr("id").match(/\d+/)[0];
      },

      getCachedLast: function () {
        viewSpans = viewContainer.find("span:not(.text_whitespace)"); //the spans within the views need to be up to date
        return $(viewSpans[lastVis]).attr("id").match(/\d+/)[0];
      },
    };
  }

  return {
    //add new splitView after designated predecessor
    newView: function (newID, content, predec, chart) {
      let newView = $(
        '<div id="' + newID + '" class="splitView ui-droppable">' + "</div>"
      ).insertAfter("#" + predec);
      newView.append(content);
      let wordCount = newView.find("span:not(.text_whitespace)").length;
      // newView.droppable({
      //   drop: function(event, ui) {
      //     let spans = newView.find("span");
      //     for (let i = 0; i < spans.length; i++) {
      //       if (
      //         $(spans[i]).offset().top + 16 >= bandInstance.getMouseY() &&
      //         $(spans[i]).offset().left >= bandInstance.getMouseX()
      //       ) {
      //         let splitSpan = $(spans[i])
      //           .attr("id")
      //           .match(/\d+/)[0];
      //         monitor.bigSplitViewConfiguration(newID, $(spans[i]).attr("id"), splitSpan);
      //         break;
      //       }
      //     }
      //   }
      // });
      return init(newID, newID, wordCount, chart);
    },

    //initiate new first splitView functioning as an anchor for consecutive splitViews
    initView: function (containerID, newID, chart) {
      let newView = $("#" + containerID);
      newView.addClass("splitView ui-droppable");
      //newView.append(content);
      let wordCount = newView.find("span:not(text_whitespace)").length;
      // newView.droppable({
      //   drop: function(event, ui) {
      //     let spans = newView.find("span");
      //     for (let i = 0; i < spans.length; i++) {
      //       if (
      //         $(spans[i]).offset().top + 16 >= bandInstance.getMouseY() &&
      //         $(spans[i]).offset().left >= bandInstance.getMouseX()
      //       ) {
      //         let splitSpan = $(spans[i])
      //           .attr("id")
      //           .match(/\d+/)[0];
      //         monitor.bigSplitViewConfiguration(newID, $(spans[i]).attr("id"), splitSpan);
      //         break;
      //       }
      //     }
      //   }
      // });
      return init(newID, containerID, wordCount, chart);
    },

    //make existing div with text into splitView functioning as an anchor for consecutive splitViews
    redefView: function (containerID, viewID, span = true) {
      let wordCount =
        span == true ? view.spanify("#" + containerID) : undefined;
      // $("#" + containerID).droppable({
      //   drop: function(event, ui) {
      //     let spans = $("#" + containerID).find("span");
      //     for (let i = 0; i < spans.length; i++) {
      //       if (
      //         $(spans[i]).offset().top + 16 >= bandInstance.getMouseY() &&
      //         $(spans[i]).offset().left >= bandInstance.getMouseX()
      //       ) {
      //         let splitSpan = $(spans[i])
      //           .attr("id")
      //           .match(/\d+/)[0];
      //         monitor.bigSplitViewConfiguration(viewID, $(spans[i]).attr("id"), splitSpan);
      //         break;
      //       }
      //     }
      //   }
      // });
      return init("view0", containerID, wordCount);
    },

    /**
     * "spanify" every word inside a scrollable view:
     * tokenize the given text and classify every token by character sequences, whitespace(s) and punctuation
     * @param {String} div - id of the scrollable div
     * @returns total number of actual words in the text
     */
    spanify: function (id) {
      let spanCount = 0;
      let wordCount = 0;
      let spanID;
      let spanName;
      let text = tokenize(
        $(id).text(),
        {
          word: /[A-Za-z0-9_äÄöÖüÜß]+/,
          whitespace: /\s+/,
          punctuation: /[^\w\s]/,
        },
        "invalid"
      );
      $(id).empty(); //NEEDED?
      $.each(text, function (i, v) {
        if ($(v).attr("type") == "whitespace") {
          spanID = "span" + spanCount;
          spanName = '<span id="' + spanID + '" class="whitespace">';
          $(id).append($(spanName).text($(v).attr("token")));
        } else if ($(v).attr("type") == "punctuation") {
          spanID = "span" + spanCount;
          spanName = '<span id="' + spanID + '" class="punctuation">';
          $(id).append($(spanName).text($(v).attr("token")));
        } else {
          spanID = "span" + spanCount;
          spanName = '<span id="' + spanID + '" class="word">';
          $(id).append($(spanName).text($(v).attr("token")));
          wordCount++;
        }
        spanCount++;
      });
      return wordCount;
    },
  };
})();
