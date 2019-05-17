#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""admin_top_bad_keys.py: Returns groups and number of logins active per group"""

import json
import os
import sys
import sqlite3

from httperror import HTTPError

RETURN_HEADERS = []

def __do_get():
    database = sqlite3.connect("database.sqlite3")
    alldata = database.execute(("SELECT COUNT(key), key FROM claims"
                                " GROUP BY key"
                                " ORDER BY COUNT(key) DESC, _ROWID_ DESC LIMIT 10"))
    allrows = alldata.fetchall()

    rv = []
    for row in allrows:
        rv.append({"count": row[0], "key": row[1]})
    return json.dumps(rv)

def __main():
    if not 'REQUEST_METHOD' in os.environ:
        raise HTTPError("Missing REQUEST_METHOD")

    if os.environ['REQUEST_METHOD'] == 'GET':
        return __do_get()

    raise HTTPError("Undhandled REQUEST_METHOD", 405)

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
