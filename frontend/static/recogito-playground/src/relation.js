import { store, idPrefixes, storeTypes, removeFromStore } from "./store.js";
import { r } from "./index.js";

const renderToRelationList = () => {
  const listDiv = document.getElementById("rel-list");
  listDiv.innerHTML = "";

  const listEntries = store.relations.map((relation, i) => {
    const text = relation.body[0].value;
    const entryID = idPrefixes.RELATION_TO_LIST + relation.id;

    const wrapper = createRelationEntry({ relation, entryID, text, i });
    listDiv.appendChild(wrapper);

    addInteractionConnector(relation);
  });
};

const createRelationEntry = ({ relation, entryID, text, i }) => {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("class", "wrapper");

  const removeBtn = document.createElement("div");
  removeBtn.setAttribute("class", "remove-btn");
  removeBtn.innerHTML = "X";
  removeBtn.onclick = () => {
    removeRelation(r, relation);
  };

  const contentBox = document.createElement("div");
  contentBox.setAttribute("class", "contentBox");

  const label = document.createElement("div");
  label.innerHTML = `${i}: ${text}`;
  label.setAttribute("id", entryID);
  label.setAttribute("class", "label");

  const content = document.createElement("div");
  content.setAttribute("class", "content");
  content.innerHTML = `<pre> ${i}: ${JSON.stringify(relation, null, 2)}</pre>`;

  contentBox.appendChild(label);
  contentBox.appendChild(content);
  contentBox.onclick = () => {
    contentBox.classList.toggle("active");
  };

  wrapper.appendChild(contentBox);
  wrapper.appendChild(removeBtn);

  return wrapper;
};

const addInteractionConnector = (relation) => {
  const [linkedAnno1ID, linkedAnno2ID] = relation.target;
  const linkedAnno1 = document.getElementById(linkedAnno1ID.id);
  const linkedAnno2 = document.getElementById(linkedAnno2ID.id);

  const listEntryID = idPrefixes.RELATION_TO_LIST + relation.id;
  const relationListEntry = document.getElementById(listEntryID);

  console.log(linkedAnno1, linkedAnno2, relationListEntry);

  const hoverFunction = () => {
    linkedAnno1.classList.toggle("relation-hovered");
    linkedAnno2.classList.toggle("relation-hovered");
    relationListEntry.classList.toggle("relation-hovered");
  };

  if (linkedAnno1 && linkedAnno2 && relationListEntry) {
    relationListEntry.onmouseover = hoverFunction;
    relationListEntry.onmouseout = hoverFunction;
  }
};

const removeRelation = (r, relation) => {
  const relationID = relation.id;
  //removeInteractionConnector(relationID);
  removeFromStore(storeTypes.RELATION, relationID);
  renderToRelationList();
  r.removeAnnotation(relation);
  console.log(relation);
};

export { renderToRelationList, createRelationEntry };
