import { store, idPrefixes, storeTypes, removeFromStore } from "./store.js";
import { r } from "./index.js";

const addIDToParent = (annotationID, annotationText) => {
  const annotatedSpans = document.querySelectorAll(
    `[data-id="${annotationID}"]`
  );
  annotatedSpans.forEach((span) => {
    if (span.innerHTML === annotationText) {
      const parent = span.parentNode;
      parent.setAttribute("id", annotationID);
    }
  });
};

const renderToAnnotationList = () => {
  const listDiv = document.getElementById("anno-list");
  listDiv.innerHTML = "";

  const listEntries = store.annotations.map((annotation, i) => {
    const text = annotation.target.selector[0].exact;
    const entryID = idPrefixes.ANNOTATION_TO_LIST + annotation.id;

    const wrapper = createAnnotationEntry({ annotation, entryID, text, i });
    listDiv.appendChild(wrapper);

    addInteractionConnector(annotation.id);
  });
};

const createAnnotationEntry = ({ annotation, entryID, text, i }) => {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("class", "wrapper");

  const removeBtn = document.createElement("div");
  removeBtn.setAttribute("class", "remove-btn");
  removeBtn.innerHTML = "X";
  removeBtn.onclick = () => {
    removeAnnotation(r, annotation);
  };

  const contentBox = document.createElement("div");
  contentBox.setAttribute("class", "contentBox");

  const label = document.createElement("div");
  label.innerHTML = `${i}: ${text}`;
  label.setAttribute("id", entryID);
  label.setAttribute("class", "label");

  const content = document.createElement("div");
  content.setAttribute("class", "content");
  content.classList.add("annotation");

  const tagBox = document.createElement("div");
  tagBox.innerHTML = annotation.body
    .map((entry) => {
      if (entry.purpose === "tagging") {
        return `<div class="tagBox">${entry.value}</div>`;
      }
    })
    .join("");

  const commentBox = document.createElement("div");
  commentBox.innerHTML = annotation.body
    .map((entry) => {
      if (["commenting", "replying"].includes(entry.purpose)) {
        return `"${entry.value}"`;
      }
    })
    .join(",");

  const annoBox = document.createElement("pre");
  annoBox.innerHTML = `${i}: ${JSON.stringify(annotation, null, 2)}`;

  /* content.innerHTML = `<pre> ${i}: ${JSON.stringify(
    annotation,
    null,
    2
  )}</pre>`; */

  content.appendChild(tagBox);
  content.appendChild(commentBox);
  content.appendChild(annoBox);

  contentBox.appendChild(label);
  contentBox.appendChild(content);
  contentBox.onclick = () => {
    contentBox.classList.toggle("active");
  };

  wrapper.appendChild(contentBox);
  wrapper.appendChild(removeBtn);

  return wrapper;
};

const addInteractionConnector = (annotationID) => {
  const parentSpan = document.getElementById(annotationID);

  const listEntryID = idPrefixes.ANNOTATION_TO_LIST + annotationID;
  const annotationListEntry = document.getElementById(listEntryID);

  const hoverOverFunction = () => {
    parentSpan.classList.add("hovered");
    annotationListEntry.classList.add("hovered");
  };

  const hoverOutFunction = () => {
    parentSpan.classList.remove("hovered");
    annotationListEntry.classList.remove("hovered");
  };

  if (parentSpan && annotationListEntry) {
    parentSpan.onmouseover = hoverOverFunction;
    annotationListEntry.onmouseover = hoverOverFunction;

    parentSpan.onmouseout = hoverOutFunction;
    annotationListEntry.onmouseout = hoverOutFunction;
  }
};

const removeInteractionConnector = (annotationID) => {
  const parentSpan = document.getElementById(annotationID);

  parentSpan.onmouseover = null;
  parentSpan.onmouseout = null;
};

const removeAnnotation = (r, annotation) => {
  const annotationID = annotation.id;
  removeInteractionConnector(annotationID);
  removeFromStore(storeTypes.ANNOTATION, annotationID);
  renderToAnnotationList();
  r.removeAnnotation(annotation);
};

export {
  addIDToParent,
  renderToAnnotationList,
  createAnnotationEntry,
  addInteractionConnector,
  removeInteractionConnector,
  removeAnnotation,
};
