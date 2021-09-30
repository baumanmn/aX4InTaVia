import {
  storeTypes,
  generateID,
  addToStore,
  getAnnotationData,
  getTagColor,
  updateStore,
} from "./store.js";

const createEmptyAnnotation = (textBody) => {
  const id = generateID();
  const text = textBody.join(" ");
  const newAnnotation = {
    "@context": "http://www.w3.org/ns/anno.jsonld",
    id,
    text,
    textBody,
    type: "Annotation",
    tags: [],
    comments: [],
  };
  addToStore(storeTypes.ANNOTATION, newAnnotation);
  return id;
};

const assignAnnotationColor = (newSpanID, tag) => {
  const span = document.getElementById(newSpanID);
  const color = getTagColor(tag);
  span.style.backgroundColor = color;
};

const checkAnnotationTags = (newSpanID, tag) => {
  const annotation = getAnnotationData(newSpanID);
  return annotation.tags.indexOf(tag) === -1;
};

const addTagToAnnotation = (newSpanID, tag) => {
  const annotation = getAnnotationData(newSpanID);
  if (annotation.tags.indexOf(tag) === -1) {
    const newTagSet = [...annotation.tags];
    newTagSet.push(tag);
    const updatedAnnotation = {
      ...annotation,
      tags: newTagSet,
    };
    updateStore(storeTypes.ANNOTATION, newSpanID, updatedAnnotation);
    assignAnnotationColor(newSpanID, tag);
  }
};

const removeTagFromAnnotation = (newSpanID, tag) => {
  const annotation = getAnnotationData(newSpanID);
  const pos = annotation.tags.indexOf(tag);
  if (pos !== -1) {
    const newTagSet = [...annotation.tags];
    newTagSet.splice(pos, 1);
    const updatedAnnotation = {
      ...annotation,
      tags: newTagSet,
    };

    updateStore(storeTypes.ANNOTATION, newSpanID, updatedAnnotation);
    assignAnnotationColor(newSpanID, newTagSet[newTagSet.length - 1]);
  }
};

export {
  createEmptyAnnotation,
  assignAnnotationColor,
  checkAnnotationTags,
  addTagToAnnotation,
  removeTagFromAnnotation,
};
