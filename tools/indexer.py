#
# tools/indexer.py
#
# Create a Whoosh index from JSON files
#

TOOL_NAME = 'Drocer Indexer'
INDEX_PATH = '../data/index/city-record'
INPUT_PATH = '../data/json'

import jsonpickle
import os
import timeit

import whoosh.fields
import whoosh.index
import whoosh.analysis
import whoosh.support.charset

from modules.document_structure import DrocerSerializable
from modules.document_structure import DrocerDocument
from modules.document_structure import DrocerPage
from modules.document_structure import DrocerBox

if __name__ == '__main__':

    # Setup logging.
    import logging
    logging.basicConfig(
        format='%(asctime)s.%(msecs)03d %(levelname)s: %(module)s.%(funcName)s %(message)s',
        level=logging.DEBUG,
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    logger = logging.getLogger(__name__)
    logger.info('Starting %s.' % TOOL_NAME)
    logger.info('Reading JSON files from %s.' % INPUT_PATH)
    logger.info('Writing Whoosh index to %s.' % INDEX_PATH)

    # Setup timer.
    start_time = timeit.default_timer()

    # Create schema.
    whoosh_analyzer = whoosh.analysis.StemmingAnalyzer() | whoosh.analysis.CharsetFilter(whoosh.support.charset.accent_map)
    whoosh_schema = whoosh.fields.Schema(
        title = whoosh.fields.TEXT(stored = True),
        content = whoosh.fields.TEXT(stored = True, analyzer = whoosh_analyzer),
        source_document_path = whoosh.fields.ID(stored = True),
        structured_document_path = whoosh.fields.ID(stored = True),
        ordres_numbers = whoosh.fields.KEYWORD(stored = True, scorable = True, commas = True),
        parcel_numbers = whoosh.fields.KEYWORD(stored = True, scorable = True, commas = True),
        calendar_numbers = whoosh.fields.KEYWORD(stored = True, scorable = True, commas = True)
    )

    # Create index.
    if not os.path.exists(INDEX_PATH):
        os.mkdir(INDEX_PATH)
    whoosh_index = whoosh.index.create_in(INDEX_PATH, whoosh_schema)
    whoosh_index = whoosh.index.open_dir(INDEX_PATH)
    whoosh_writer = whoosh_index.writer()

    # Index documents.
    for filename in os.listdir(INPUT_PATH):
        path = os.path.join(INPUT_PATH, filename)
        with open(path, 'r') as input_file:
            logger.info('Processing input file: %s' % filename)
            document = jsonpickle.decode(input_file.read())
            whoosh_writer.add_document(
                title = document.title,
                content = document.get_index_text(),
                source_document_path = document.source_document_path,
                structured_document_path = unicode(path),
                ordres_numbers = document.get_index_metadata('ordres_numbers'),
                parcel_numbers = document.get_index_metadata('parcel_numbers'),
                calendar_numbers = document.get_index_metadata('calendar_numbers')
            )

    # Write index.
    logger.info('Writing index to %s' % INDEX_PATH)
    whoosh_writer.commit()

    elapsed = timeit.default_timer() - start_time
    logger.info('%s complete.  Run time %ss' % (TOOL_NAME, elapsed))

