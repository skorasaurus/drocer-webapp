from __future__ import absolute_import
from builtins import str
# Import flask and template operators.
from flask import Flask, render_template, request, send_from_directory, session, redirect, url_for

# Define the WSGI application object.
wsgi_app = Flask(__name__, static_url_path='/static', static_folder='static')

# Load configuration.
wsgi_app.config.from_object('config')


# Import application modules.
from .modules.searcher import DrocerSearcher
drocer_searcher = DrocerSearcher(wsgi_app)

# Setup logging.
import logging
#logging.Formatter(fmt='%(asctime)s.%(msecs)03d %(levelname)s: %(message)s',datefmt='%Y-%m-%d %H:%M:%S')
logging.basicConfig(
    format='%(asctime)s.%(msecs)03d %(levelname)s: %(module)s.%(funcName)s %(message)s',
    level=logging.DEBUG,
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)
logger.info('WSGI application initialized.')


# Add error handlers.
@wsgi_app.errorhandler(404)
def error_handler_404(error):
    logger.error(error)
    return "File not found.", 404

@wsgi_app.errorhandler(Exception)
def error_handler_500(error):
    logger.error(error)
    import sys, os
    exc_type, exc_obj, exc_tb = sys.exc_info()
    fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
    logger.debug(str(exc_type) + " " + str(fname) + " " + str(exc_tb.tb_lineno))
    return "Server error.", 500

# Add page images route.
@wsgi_app.route('/page_images/<path:filename>')
def custom_static(filename):
    return send_from_directory(wsgi_app.config['PAGE_IMAGES_PATH'], filename)

# Add application routes.
@wsgi_app.route('/', methods=['GET'])
def route_landing():
    return render_template('landing.html')

@wsgi_app.route('/about', methods=['GET'])
def route_about():
    return render_template('about.html')

@wsgi_app.route('/browse', methods=['GET'])
def route_browse():
    return render_template('browse.html')

# Add search route.
@wsgi_app.route ('/search', methods=['POST'])
def route_search():
    return drocer_searcher.search(request.form['q'])

