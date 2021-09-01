import createText from "./text.js";
import { storeTypes, addToStore, updateStore } from "./store.js";
import { addIDToParent, renderToAnnotationList } from "./annotation.js";
import { renderToRelationList } from "./relation.js";

const { text, textDiv } = createText();

export const r = Recogito.init({
  content: document.getElementById("text"), // ID or DOM element
});

const mode = {
  mode: "ANNOTATION",
};

const setMode = (m) => {
  if (m === storeTypes.ANNOTATION || m === storeTypes.RELATION) {
    mode.mode = m;
    r.setMode(mode.mode);
    modeBtn.innerHTML = m;
  }
};

const modeBtn = document.getElementById("modeBtn");
modeBtn.onclick = () => {
  let newMode =
    mode.mode === storeTypes.ANNOTATION
      ? storeTypes.RELATION
      : storeTypes.ANNOTATION;
  setMode(newMode);
};

r.setMode(mode.mode);

r.on("createAnnotation", function (annotation) {
  if (mode.mode === storeTypes.ANNOTATION) {
    addToStore(storeTypes.ANNOTATION, annotation);
    addIDToParent(annotation.id, annotation.target.selector[0].exact);
    renderToAnnotationList();
  } else {
    addToStore(storeTypes.RELATION, annotation);
    renderToRelationList();
  }
});

r.on("updateAnnotation", function (annotation) {
  if (mode.mode === storeTypes.ANNOTATION) {
    updateStore(storeTypes.ANNOTATION, annotation.id, annotation);
    renderToAnnotationList();
  } else {
    updateStore(storeTypes.RELATION, annotation.id, annotation);
    renderToRelationList();
  }
});

const addAnnotationFromDB = (newStore) => {
  newStore.annotations.forEach((anno) => {
    r.addAnnotation(anno);
  });
  newStore.relations.forEach((anno) => {
    r.addAnnotation(anno);
  });
};

export { addAnnotationFromDB };
