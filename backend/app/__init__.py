from flask import Flask

from config import Config


app = Flask(
    __name__,
    static_folder="../../frontend/static",
    template_folder="../../frontend/templates",
)
app.config.from_object(Config)

from app import routes
