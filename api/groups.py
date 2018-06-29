#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""groups.py: A CGI-script used to fetch groups based on a search term"""

import json
import os
import io
import re
import sqlite3
import sys
import urllib.parse

import auth
from httperror import HTTPError

RETURN_HEADERS = []

def set_output_encoding(codec, errors='strict'):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.detach(), errors=errors,
        line_buffering=sys.stdout.line_buffering)

def __do_get():
    querystring = urllib.parse.parse_qs(os.environ['QUERY_STRING'], keep_blank_values=True)
    if 'search' in querystring:
        search = "%" + querystring['search'][0] + "%"
        conn = sqlite3.connect('database.sqlite3')
        cur = conn.execute('SELECT name FROM groups WHERE name LIKE ? ORDER BY name', (search,))
        result = cur.fetchall()

        groupnames = []
        for group in result:
            groupnames.append(group[0])

        RETURN_HEADERS.append('Content-type: application/json')
        returnstring = json.dumps(groupnames)
        return returnstring

    RETURN_HEADERS.append('Content-type: application/json')
    return json.dumps(fetch_all_groups())

def fetch_all_groups():
    database = sqlite3.connect('database.sqlite3')
    allgroups = database.execute('SELECT name FROM groups ORDER BY lower(name)').fetchall()
    groupnames = []
    for group in allgroups:
        groupnames.append(group[0])

    return groupnames

def trimstring(string):
    """Performs basic string normalization"""
    string = string.lower()
    string = string.strip()
    return string

def __create_group(groupname, password, contact):
    try:
        create_group(groupname, password, contact)
        return auth.login(groupname, password)
    except ValueError as error:
        raise HTTPError(json.dumps(error.args))

def find_group_by_email(email):
    if not isinstance(email, str):
        raise TypeError("email must be a string")

    database = sqlite3.connect('database.sqlite3')
    first = database.execute('SELECT name FROM groups WHERE contact_email=? LIMIT 1', (email,))
    first = first.fetchone()

    if first is None:
        raise ValueError("Could not find supplied email address")
    return first[0]

def create_group(name, password, contact):
    if not name or not password or not contact:
        raise ValueError('Must have at least 1 character in all fields')

    contact = trimstring(contact)
    #Verify Email Address
    match = re.match(r'^.+@.+\..+$', contact)
    if match is None:
        raise ValueError('Malformed email address')

    database = sqlite3.connect('database.sqlite3')
    trim_group = trimstring(name)
    group_count = database.execute("SELECT count() FROM groups WHERE lower(name)=:groupname",
                                   {"groupname": trim_group}).fetchone()[0]

    if group_count > 0:
        raise ValueError('Groupname already exists')

    salt = auth.generate_random()
    hashed_password = auth.hash_password(password, salt)


    try:
        database.execute((
            'INSERT INTO groups(name, password, salt, contact_email)'
            ' values(:name, :password, :salt, :contact)'),
                         {"name": name,
                          "password": hashed_password,
                          "salt": salt,
                          "contact": contact})
        database.commit()
    except sqlite3.IntegrityError:
        raise ValueError("Could not create group. Contact Skvaderonen for support. %s")
    return True

def __do_post():
    postdata = sys.stdin.read()
    try:
        postdata = json.loads(postdata)
    except json.JSONDecodeError:
        raise HTTPError("Malformed POST data. Not JSON-decodable")

    if 'action' in postdata and postdata['action'] == "create":
        if not 'groupname' in postdata or\
                not 'password' in postdata or\
                not 'contact' in postdata:
            raise HTTPError("Missing required create parameters")

        return json.dumps(
            __create_group(
                postdata['groupname'],
                postdata['password'],
                postdata['contact']))

    raise HTTPError("Unhandled POST action")

def __main():
    if not 'REQUEST_METHOD' in os.environ:
        raise HTTPError("Missing REQUEST_METHOD")

    if os.environ['REQUEST_METHOD'] == 'GET':
        return __do_get()

    if os.environ['REQUEST_METHOD'] == 'POST':
        return __do_post()

    raise HTTPError("Unhandled REQUEST_METHOD")

if __name__ == '__main__':
    set_output_encoding('utf-8')
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
    print('Content-Lenght: %d' % len(RESPONSE))
    print()
    print(RESPONSE)
