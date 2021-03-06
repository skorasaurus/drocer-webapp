# woosh-example-1.py
#
# This example reads all the text documents in the input folder, indexes
# them according to content, then does a search for the word "national"
# and returns ranked document results along with highlights of the
# matched terms in the document.
#

import os
import whoosh.fields
import whoosh.index
import whoosh.qparser
from whoosh.query import *

schema = whoosh.fields.Schema(
    title = whoosh.fields.TEXT(stored = True),
    content = whoosh.fields.TEXT(stored = True),
    path = whoosh.fields.ID(stored=True),
    tags = whoosh.fields.KEYWORD,
    icon = whoosh.fields.STORED
)

INDEX_PATH = '../data/index/woosh-example-1'
INPUT_PATH = '../data/txt'

# create index
if not os.path.exists(INDEX_PATH):
    os.mkdir(INDEX_PATH)
ix = whoosh.index.create_in(INDEX_PATH, schema)
ix = whoosh.index.open_dir(INDEX_PATH)
writer = ix.writer()

for filename in os.listdir(INPUT_PATH):
    path = INPUT_PATH + '/' + filename
    with open(path, 'r') as f:
        writer.add_document(
            title = unicode(filename, errors='replace'),
            content = unicode(f.read(), errors='replace'),
            path = unicode(path, errors='replace')
        )
writer.commit()

# create searcher 
searcher = ix.searcher()

# create parser and query
query_field = "content"
parser = whoosh.qparser.QueryParser(query_field, ix.schema)
query_string = "national"
query = parser.parse(query_string)

# get search results
results = searcher.search(query)
results.fragmenter.charlimit = None # turn off length limit for highlights
for hit in results:
    print('Search hit:\n    document title: %s\n    highlight: %s' % 
        (
            hit['title'],
            hit.highlights(query_field).replace('\n', ' ')[:64]
        )
    )

# close searcher
searcher.close()
