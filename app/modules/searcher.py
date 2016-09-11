#
# app/modules/searcher.py
#
# Search module for Drocer web application.
#

import jsonpickle
import logging
import os
import sys
import timeit

import whoosh.fields
import whoosh.index
import whoosh.qparser
from whoosh.query import *

sys.path.insert(1,'../../tools/modules')
from tools.modules.document_structure import DrocerSerializable
from tools.modules.document_structure import DrocerDocument
from tools.modules.document_structure import DrocerPage
from tools.modules.document_structure import DrocerBox

class DrocerSearcher(object):
    app = None
    index_path = None
    logger = None

    whoosh_index = None
    whoosh_parser = None
    whoosh_searcher = None

    def __init__(self, app):
        self.logger = logging.getLogger(__name__)
        logging.basicConfig(
            format='%(asctime)s.%(msecs)03d %(levelname)s: %(module)s.%(funcName)s %(message)s',
            level=logging.DEBUG,
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.app = app
        self.logger.info('app.config: %s' % app.config)
        self.index_path = app.config.get('SEARCH_INDEX_PATH')

        self.logger.debug('Opening Whoosh index from %s' % self.index_path)
        self.whoosh_index = whoosh.index.open_dir(self.index_path)
        self.whoosh_searcher = self.whoosh_index.searcher()
        self.whoosh_parser = whoosh.qparser.MultifieldParser(
            ["title", "content", "ordres_numbers", "parcel_numbers"],
            schema = self.whoosh_index.schema
        )

    def get_document_name(self, hit_document_path):
        return (os.path.split(hit_document_path)[1]).split('.')[0]

    def get_structured_document_path(self, hit_document_path):
        return os.path.join(
            self.app.config.get('STRUCTURED_DOCUMENT_PATH'),
            os.path.split(hit_document_path)[1]
        )

    def load_structured_document(self, path):
        f = open(path, 'r')
        original = f.read()
        modified = original.replace('modules.document_structure.', 'tools.modules.document_structure.')
        f.close()
        return jsonpickle.decode(modified)

    def search(self, query_string):
        whoosh_query = self.whoosh_parser.parse(query_string)
        whoosh_results = self.whoosh_searcher.search(whoosh_query, terms=True)
        whoosh_results.fragmenter.charlimit = None # turn off length limit for highlights
        self.logger.info('Search: %s' % query_string)
        client_results = []
        for hit in whoosh_results:
            structured_document_path = self.get_structured_document_path(hit.fields()['structured_document_path'])
            #self.logger.debug('Loading JSON document: %s' % structured_document_path)#debug
            document = self.load_structured_document(structured_document_path)
            self.logger.debug('Search hit:\n    document title: %s\n    highlight: %s\n    terms: %s' % (
                    hit['title'],
                    hit.highlights('content').replace('\n', ' ')[:64],
                    repr(hit.matched_terms())
            ))
            client_boxes = []
            for term in hit.matched_terms():
                boxes = document.get_boxes_for_term(term)
                for box in boxes:
                    if len(term[1]) > len(query_string) / 2: # ignore short matches
                        client_boxes.append(box)
                        self.logger.debug('        field %s term "%s" page %s box: %s: %s' % (
                            term[0],
                            term[1],
                            box.page_number,
                            box.number,
                            box.text.replace('\n', ' ')[:64]
                        ))
            if client_boxes:
                client_results.append({
                    'title': hit['title'],
                    'document_name': self.get_document_name(hit['structured_document_path']),
                    'boxes': client_boxes
                })
        return jsonpickle.encode(client_results)