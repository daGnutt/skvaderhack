#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""groups.py: A CGI-script used to fetch groups based on a search term"""

import json
import os
import re
import sqlite3
import sys
import urllib.parse

import auth

RETURN_HEADERS = []

def __do_get():
    RETURN_HEADERS.append('Status: 200')
    querystring = urllib.parse.parse_qs(os.environ['QUERY_STRING'], keep_blank_values=True)
    if 'search' in querystring:
        search = "%" + querystring['search'][0] + "%"
        conn = sqlite3.connect('database.sqlite3')
        cur = conn.execute('SELECT name FROM groups WHERE name LIKE ? ORDER BY name', (search,))
        result = cur.fetchall()
        RETURN_HEADERS.append('Content-type: application/json')
        returnstring = json.dumps(result)
        RETURN_HEADERS.append("Content-Length: %d" %len(returnstring))
        return returnstring

    RETURN_HEADERS.append('Status: 400')
    return "Missing search term"

def trimstring(string):
    """Performs basic string normalization"""
    string = string.lower()
    string = string.strip()
    return string

def __create_group(groupname, password, contact):
    database = sqlite3.connect('database.sqlite3')

    #Verify Email Address
    contact = trimstring(contact)
    match = re.match(r'^.+@.+\..+$', contact)
    if match is None:
        raise ValueError('Malformed email address')

    #Verify that group does not already exist
    trim_group = trimstring(groupname)
    group_count = database.execute("SELECT count() FROM groups WHERE lower(name)=:groupname",
                                   {"groupname": trim_group}).fetchone()[0]
    if group_count > 0:
        raise ValueError("Groupname already exists")

    salt = auth.generate_random()
    hashed_password = auth.hash_password(password, salt)

    database.execute((
        "INSERT INTO groups(name, password, salt, contact_email)"
        " values(:name, :password, :salt, :contact)"),
                     {"name":groupname,
                      "password": hashed_password,
                      "salt": salt,
                      "contact": contact})
    database.commit()
    return True

def __do_post():
    postdata = sys.stdin.read()
    try:
        postdata = json.loads(postdata)
    except json.JSONDecodeError:
        RETURN_HEADERS.append('Status: 400')
        return "Malformed Request. Data not JSON-decodeable"

    if not 'action' in postdata:
        RETURN_HEADERS.append('Status: 400')
        return "Mission argument action"

    if postdata['action'] == "create":
        if not 'groupname' in postdata or\
                not 'password' in postdata or\
                not 'contact' in postdata:
            RETURN_HEADERS.append('Status: 400')
            return "Missing Required parameters"

        return __create_group(postdata['groupname'], postdata['password'], postdata['contact'])

    RETURN_HEADERS.append('Status: 400')
    return "Not Implemented"

def __main():
    if not 'REQUEST_METHOD' in os.environ:
        RETURN_HEADERS.append('Status: 400')
        return "MISSING REQUEST_METHOD"

    if os.environ['REQUEST_METHOD'] == 'GET':
        return __do_get()

    if os.environ['REQUEST_METHOD'] == 'POST':
        return __do_post()

    RETURN_HEADERS.append('Status: 400')
    return None

if __name__ == '__main__':
    RESULT = __main()
    for header in RETURN_HEADERS:
        print(header)
    print()
    print(RESULT)
