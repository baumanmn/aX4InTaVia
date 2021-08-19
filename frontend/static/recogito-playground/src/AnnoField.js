const AnnoField = (props) => {
  return (
    <div className="anno-field" id={props.anno.id}>
      <span>target: {props.anno.target.selector[0].exact}</span>
      {props.anno.body.map((b, i) => {
        return (
          <span key={i}>
            {b.purpose}: {b.value}
          </span>
        );
      })}
    </div>
  );
};

export default AnnoField;
