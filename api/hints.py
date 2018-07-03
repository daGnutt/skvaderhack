#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""template.py: A basic tempalte for CGI-work"""

import json
import os
import sqlite3
import sys

from httperror import HTTPError

RETURN_HEADERS = []

def fetch_valid_hints():
    database = sqlite3.connect('database.sqlite3')
    # hints = database.execute(('SELECT publish, description, url FROM hints'
    #                           ' WHERE publish IS NULL'
    #                           ' OR publish < CURRENT_TIMESTAMP'
    #                           ' ORDER BY publish ASC, description ASC'))
                            
    hints = database.execute(("SELECT hint_publish, hint_description, hint_url"
                              " FROM keys WHERE (hint_description IS NOT NULL)"
                              " AND (hint_publish IS NULL OR hint_publish < CURRENT_TIMESTAMP)"
                              " ORDER BY hint_publish ASC, hint_description ASC"))
    allhints = hints.fetchall()
    rvalues = []
    for row in allhints:
        rvalues.append({"publish": row[0], "description": row[1], "url": row[2]})
    return rvalues

def __do_get():
    return json.dumps(fetch_valid_hints())

def __main():
    if not 'REQUEST_METHOD' in os.environ:
        raise HTTPError("Missing REQUEST_METHOD")

    if os.environ['REQUEST_METHOD'] == 'GET':
        return __do_get()

    raise HTTPError("Undhandled REQUEST_METHOD")

if __name__ == '__main__':
    try:
        RESPONSE = __main()
    except HTTPError as err:
        if err.status:
            RETURN_HEADERS.append('Status: %d' % err.status)
        else:
            RETURN_HEADERS.append('Status: 400')
        RESPONSE = err.message

    NUM_HEADERS = len(RETURN_HEADERS)
    if NUM_HEADERS == 0:
        print('Status: 200')
    else:
        for header in RETURN_HEADERS:
            print(header)
    print('Content-Length: %d' % len(RESPONSE))
    print()
    print(RESPONSE)
