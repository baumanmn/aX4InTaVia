const AnnoButtons = (props) => {
  return (
    <button className="anno-buttons" onClick={() => props.onclick()}>
      Save to File
    </button>
  );
};

export default AnnoButtons;
