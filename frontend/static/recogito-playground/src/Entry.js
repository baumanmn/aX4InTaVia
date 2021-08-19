import AnnoList from "./AnnoList";
import AnnoButtons from "./AnnoButtons";
import TextBox from "./TextBox";
import { useState, useEffect } from "react";
import { Recogito } from "@recogito/recogito-js";

import "@recogito/recogito-js/dist/recogito.min.css";

const Entry = () => {
  /**
   * Annotation state reflecting the annotations written to the databse
   */
  const [annos, setAnnos] = useState([]);

  const r = new Recogito({ content: "root" });

  /**
   * Load annotations from file on first render
   */
  useEffect(() => {
    fetch("http://localhost:8000/annotations")
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        data.map((anno) => {
          return r.addAnnotation(anno);
        });
        setAnnos(data);
      });
  }, []);

  /**
   * Write a newly created annotation to the databse.
   * Temporary hack: remove any # from the auto-generated ids, otherwise FETCH/PUT won't work
   */
  r.on("createAnnotation", function (annotation) {
    annotation.id = annotation.id.replace("#", "");
    fetch("http://localhost:8000/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(annotation),
    }).then(() => {
      /* let newAnnos = annos.slice();
      newAnnos = newAnnos.concat([annotation]);
      setAnnos(newAnnos); */
    });
  });

  /**
   * Update an existing annotation
   */
  r.on("updateAnnotation", function (annotation) {
    let id = annotation.id.replace("#", "");
    fetch("http://localhost:8000/annotations/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(annotation),
    }).then(() => {
      console.log(annotation);
    });
  });

  /**
   * Update the displayed annotation file state
   */
  const updateFileState = () => {
    fetch("http://localhost:8000/annotations")
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        setAnnos(data);
      });
  };

  return (
    <div>
      <div className="text-deco">
        Double click a word or click and drag multiple words to annotate.
        <br></br> The text is hardcoded in Textbox.js
      </div>
      <TextBox></TextBox>
      <AnnoButtons onclick={updateFileState}></AnnoButtons>
      <div className="file-state">File State</div>
      <AnnoList annos={annos}></AnnoList>
    </div>
  );
};

export default Entry;
