#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""template.py: A basic tempalte for CGI-work"""

import hashlib
import json
import os
import sqlite3
import sys
import uuid

RETURN_HEADERS = []

def __do_get():
    """do_get() handles GET-requests"""
    RETURN_HEADERS.append('Status: 403')
    return "This script is NOT get-able"

def __do_post():
    """do_post() handles POST-requests"""
    postdata = sys.stdin.read()
    try:
        postdata = json.loads(postdata)
    except json.JSONDecodeError:
        RETURN_HEADERS.append('Status: 400')
        return "Malformed Request. Data not JSON-decodable"

    if 'action' in postdata and postdata['action'] == 'login':
        return __performlogin(postdata)
    if 'action' in postdata and postdata['action'] == 'authtoken':
        return __verify_token(postdata)

    RETURN_HEADERS.append('Status: 400')
    return "Not implemented"

def __performlogin(postdata):
    if not 'username' in postdata or \
            not 'password' in postdata:
        RETURN_HEADERS.append('Status: 400')
        return "Missing username or password"

    database = sqlite3.connect('database.sqlite3')
    result = database.execute(
        'SELECT salt, password FROM groups WHERE name = ?',
        (postdata['username'],)).fetchone()
    if result is None:
        RETURN_HEADERS.append('Status: 412')
        return "No group found"
    password_hash = hash_password(postdata['password'], result[0])
    if password_hash == result[1]:
        while True: #Create uniqe authtoken
            token = generate_random()
            authtokencount = database.execute((
                'SELECT count() FROM authtoken WHERE authtoken=?'),
                                              (token,)).fetchone()
            if authtokencount[0] == 0:
                break
        database.execute((
            'INSERT INTO authtoken(groupname, authtoken) values(?, ?)'),
                         (postdata['username'], token))
        database.commit()
        RETURN_HEADERS.append('Status: 200')
        return json.dumps(token)

    RETURN_HEADERS.append('Status: 400')
    return "Wrong groupname/password combination"

def generate_random():
    """Generates a random identifier. Is probably unique"""
    return uuid.uuid4().hex

def hash_password(password, salt):
    """Hashes a password with the supplied salt, and returns the result"""
    hasher = hashlib.sha512()
    hasher.update(password.encode())
    hasher.update(salt.encode())
    return hasher.hexdigest()

def __verify_token(request):
    group = verify_token(request['token'])
    if group is None:
        RETURN_HEADERS.append('Status: 400')
        return "Invalid Authtoken"
    RETURN_HEADERS.append('Stauts: 200')
    return group

def verify_token(token):
    """Verifies that the supplied token is valid. Expires old tokens.
       Returns groupname assoicated with the token"""
    database = sqlite3.connect('database.sqlite3')
    database.execute(
        ("DELETE FROM authtoken"
         " WHERE datetime(generated, '+4 days') < CURRENT_TIMESTAMP"))
    database.commit()
    groupname = database.execute("SELECT groupname FROM authtoken WHERE authtoken=?", (token,))
    groupname = groupname.fetchone()
    if groupname is None:
        return None
    return groupname[0]

def __main():
    if not 'REQUEST_METHOD' in os.environ:
        RETURN_HEADERS.append('Status: 400')
        return "MISSING REQUEST_METHOD"

    if os.environ['REQUEST_METHOD'] == 'GET':
        return __do_get()

    if os.environ['REQUEST_METHOD'] == 'POST':
        return __do_post()

    RETURN_HEADERS.append('Status: 400')
    return "Not implemented"

if __name__ == '__main__':
    RESPONSE = __main()
    for header in RETURN_HEADERS:
        print(header)
    print()
    print(RESPONSE)
