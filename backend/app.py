from flask import Flask, render_template
import pipeline
import json

app = Flask(
    __name__,
    static_folder="../Frontend/static",
    template_folder="../Frontend/templates",
)


@app.route("/")
def index():
    return render_template("index.html", data={})


@app.route("/retrieve_data", methods=["GET", "POST"])
def retrieve_data():
    data_file = "data/bt_debatte4.json"
    with open(data_file) as f:
        data = json.load(f)
        return data


@app.route("/get_text", methods=["POST"])
def get_text():
    tokens, annotation, POS, ENT = pipeline.pipeline()

    return {
        "text": tokens,
        "annotation": annotation,
        "POS": POS,
        "ENT": ENT,
    }


if __name__ == "__main__":
    app.run(debug=True)
