from flask import Flask, render_template, json, request
import pipeline

app = Flask(
    __name__,
    static_folder="../Frontend/static",
    template_folder="../Frontend/templates",
)


@app.route("/")
def index():
    test_file = "data/test.json"

    test_data = pipeline.create_data()

    with open(test_file, "w") as output:
        json.dump(test_data, output, sort_keys=False, indent=4)

    return render_template("index.html", data={})


@app.route("/retrieve_data", methods=["GET", "POST"])
def retrieve_data():
    data_key = request.form["key"]
    data_file = "data/" + data_key + ".json"
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
