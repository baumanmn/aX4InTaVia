import { spanify, makeSpanifiedAnnotatable } from "./text.js";

export const createAnnotationTool = () => {
  return {
    spanifyAndAnnotate: (text) => spanify(text),
    annotate: (spans) => makeSpanifiedAnnotatable(spans),
    /**
     * Utility to close any open annotation-menu when scrolling
     */
    removeMenuOnScroll: (textDiv) => {
      textDiv.onscroll = () => {
        Array.from(
          document
            .getElementsByTagName("body")[0]
            .getElementsByClassName("annotation-menu")
        ).forEach((menu) => {
          menu.remove();
        });
      };
    },
    mode: "ANNOTATION",
  };
};
