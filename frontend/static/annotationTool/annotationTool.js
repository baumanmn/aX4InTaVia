import { spanify, restoreSpans, makeSpanifiedAnnotatable } from "./text.js";
import { getStore, setStore, addPredefinedTagsToStore } from "./store.js";

export const createAnnotationTool = () => {
  return {
    spanifyAndAnnotate: (text) => spanify(text),
    annotate: (spans) => makeSpanifiedAnnotatable(spans),
    loadData: (existingStore) => {
      setStore(existingStore);
      restoreSpans(existingStore["annotations"]);
    },
    addPredefinedTags: (tags) => addPredefinedTagsToStore(tags),
    serialize: () => getStore(),
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
