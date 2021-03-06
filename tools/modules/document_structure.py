import hashlib
import jsonpickle
import logging
import re

class DrocerSerializable(object):
    """
    Superclass for document components.
    """
    meta = {} # object metadata, extensible
    logger = logging.getLogger(__name__)
    def add_metadata(self, key, value):
        self.logger.debug('[%s] = %s' % (key, value))
        """
        Add metadata to a named list.
        """
        if key in self.meta.keys():
            for item in self.meta[key]:
                if value == item:
                    self.logger.error('duplicate value: new=%s,  old=%s' % (value, item))
                    return # short circuit duplicates
            self.meta[key].append(value)
        else:
            self.meta[key] = []
            self.meta[key].append(value)

    def serial(self):
        d = self.__dict__.copy()
        d.update({
            'meta': self.meta
        })
        return d

    @staticmethod
    def serialize(obj):
        if hasattr(obj, 'serial'):
            return obj.serial()

class DrocerMetadata(DrocerSerializable):
    _dict = {}

    def __init__(self, initializer_dict):
        self._dict = initializer_dict.copy()
        self.meta = None

    def __cmp__(self, other):
        assert isinstance(other, DrocerMetadata)
        if self.__hash__() == other.__hash__():
            return 0
        else:
            return 1

    def __getitem__(self, key):
        return self._dict[key]

    def __hash__(self):
        _digest = hashlib.sha1(self.__str__()).hexdigest()
        return int(_digest, 16)

    def __str__(self):
        _list = [str(key)+':'+str(self._dict[key]) for key in self._dict]
        _list.sort()
        return ','.join(_list)

    def serial(self):
        return self._dict


class DrocerDocument(DrocerSerializable):
    title = ''
    source_document_path = ''
    pages = []
    text = ''

    def __init__(self, title, source_document_path):
        self.title = title
        self.source_document_path = source_document_path
        self.meta = {}
        self.text = ''
        self.pages = []

    @staticmethod
    def load(filename):
        f = open(filename, 'r')
        json_string = f.read()
        f.close()
        return jsonpickle.decode(json_string)

    def serial(self):
        d = self.__dict__.copy()
        d.update({
            'pages': self.pages,
            'meta': self.meta
        })
        return d

    def get_index_metadata(self, metadata_field):
        """
        @returns CSV string of values from metadata where metadata field
                 is plural and the items contain a singular element of
                 the same name.
        """
        try:
            return ','.join(
                [
                    item[metadata_field[:-1]]
                    for item in self.meta[metadata_field]
                ]
            )
        except KeyError:
            self.logger.debug('No metadata for field %s' % metadata_field)
            return u''

    def get_index_text(self):
        page_delim = ' '
        box_delim = ' '
        return page_delim.join(
            [
                box_delim.join([
                    box.text
                    for box in page.boxes
                    if box.meta.has_key('page_location') and
                       'body' in box.meta['page_location']
                ])
                for page in self.pages
            ]
        )

    def get_boxes_for_term(self, term):
        """
        @param term tuple (field, matched_term)
        """
        field, matched_term = term
        boxes = []
        if field == 'content':
            matcher = re.compile(matched_term, re.IGNORECASE)
            for page in self.pages:
                for box in page.boxes:
                    result = matcher.search(box.text)
                    if result:
                        boxes.append(box)
        if field in self.meta:
            for metadata in self.meta[field]:
                if metadata[field[:-1]] == matched_term:
                    box = self.pages[metadata['page_number']-1].boxes[metadata['box_number']-1]
                    boxes.append(box)
        return boxes

class DrocerPage(DrocerSerializable):
    number = 0
    boxes = []
    text = ''

    def __init__(self, number):
        self.number = number
        self.meta = {}
        self.boxes = []
        self.text = ''

    def serial(self):
        d = self.__dict__.copy()
        d.update({
            'boxes': self.boxes,
            'meta': self.meta
        })
        return d

class DrocerBox(DrocerSerializable):
    page_number = 0
    number = 0
    x0 = 0
    y0 = 0
    x1 = 0
    y1 = 0
    text = ''

    def __init__(self, page_number, number, x0, y0, x1, y1, text):
        self.page_number = page_number
        self.number = number
        self.x0 = x0
        self.y0 = y0
        self.x1 = x1
        self.y1 = y1
        self.text = text
        self.meta = {}
