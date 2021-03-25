from flask import Flask, render_template
import pipeline

app = Flask(__name__, 
static_folder='../Frontend/static',
template_folder='../Frontend/templates')


@app.route('/')
def index():
    return render_template('index.html', data={})

@app.route('/get_text', methods=['POST'])
def get_text():
    tokens, annotation, POS, ENT = pipeline.pipeline()

    return {
        "text": tokens,
        "annotation" : annotation,
        "POS" : POS,
        "ENT" : ENT,
    }

if __name__ == "__main__":
    app.run(debug=True)