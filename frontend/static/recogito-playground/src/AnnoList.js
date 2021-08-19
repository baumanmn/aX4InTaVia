import AnnoField from "./AnnoField";

/* <div className="anno-field" key={i}>
          {anno}
        </div> */
const AnnoList = (props) => {
  const annos = props.annos;
  return (
    <div className="anno-list">
      {annos.map((anno, i) => (
        <AnnoField anno={anno} key={i}></AnnoField>
      ))}
    </div>
  );
};

export default AnnoList;
