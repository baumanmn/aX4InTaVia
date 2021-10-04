import { createText, restoreSpans } from "./text.js";
import { getStore, setStore } from "./store.js";

const { text, textDiv } = createText();

const mode = {
  mode: "ANNOTATION",
};

const loadBtn = document.getElementById("load");

loadBtn.onclick = () => {
  const store = JSON.parse(localStorage.getItem("store"));
  if (store.annotations.length > 100) {
    const confirmMsg =
      "More than 100 annotations, are you sure you want to save the store?";
    if (!confirm(confirmMsg)) return 0;
  }
  setStore(store);
  restoreSpans(store.annotations);
};

const saveBtn = document.getElementById("save");

saveBtn.onclick = () => {
  const store = JSON.stringify(getStore());
  localStorage.setItem("store", store);
};

const clearBtn = document.getElementById("clear");

clearBtn.onclick = () => {
  const store = {
    annotations: [],
    annotationIDLookUp: {},
    tags: ["test", "test2"],
    numAnnotations: 0,
  };
  localStorage.setItem("store", store);
};
