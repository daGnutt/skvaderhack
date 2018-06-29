#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""password_recovery.py: A CGI endpoint for handling password recovery"""

import json
import os
import sys
import sqlite3

import auth
import groups
import sendemail

RETURN_HEADERS = []

def __do_get():
    RETURN_HEADERS.append('Status: 403')
    return "This script is NOT get-able"

def __do_post():
    postdata = sys.stdin.read()
    try:
        postdata = json.loads(postdata)
    except json.JSONDecodeError:
        RETURN_HEADERS.append('Status: 400')
        return "Malformed Request. Data not JSON-decodable"

    if 'action' in postdata and postdata['action'] == "request_token":
        return __get_token(postdata)

    if 'action' in postdata and postdata['action'] == 'reset_password':
        return __reset_password(postdata)

    RETURN_HEADERS.append('Status: 500')
    return "Not implemented"

def __get_token(request):
    if not 'email' in request:
        RETURN_HEADERS.append('Status: 400')
        return "Missing Email"

    try:
        token = get_token(request['email'])
        send_token(request['email'], token)
        RETURN_HEADERS.append('Status: 200')
        return ""
    except ValueError as err:
        RETURN_HEADERS.append('Status: 400')
        return json.dumps(err.args[0])

def get_token(email):
    """Recieves a new password recovery token for the email address"""
    database = sqlite3.connect('database.sqlite3')

    while True:
        token = auth.generate_random()
        count = database.execute("SELECT count() FROM password_recovery WHERE email=? AND token=?",
                                 (email, token)).fetchone()[0]
        if count == 0:
            break

    database.execute("INSERT INTO password_recovery(email, token) values(?,?)",
                     (email, token))
    database.commit()
    return token

def send_token(email, token):
    """Creates a email to the recipient with the token"""
    with open("templates/email_password_recovery.txt", mode="r") as file_pointer:
        string = file_pointer.read()

    string = string % (token, email, token)
    sendemail.send_email(email, "Password Recovery", string, "baron@skvaderhack.xyz")

def __reset_password(request):
    try:
        reset_password(request['email'], request['token'], request['password'])
        group = groups.find_group_by_email(request['email'])
        token = auth.login(group, request['password'])
        RETURN_HEADERS.append('Status: 200')
        return token

    except ValueError as err:
        RETURN_HEADERS.append('Status: 400')
        return err.args[0]

def reset_password(email, token, password):
    """Uses a token/email combination to set a password"""
    if not password:
        raise ValueError("Password must be specified")
    database = sqlite3.connect('database.sqlite3')
    database.execute(("DELETE FROM password_recovery"
                      " WHERE datetime(generated, '+15 minute') < CURRENT_TIMESTAMP"))
    database.commit()

    count = database.execute(("SELECT count() FROM password_recovery"
                              " WHERE email=:email AND token=:token"),
                             {"email": email, "token": token}).fetchone()[0]
    if not count == 1:
        raise ValueError("Incorrect email/token combination")

    salt = database.execute("SELECT salt FROM groups WHERE contact_email=?", (email,)).fetchone()
    if salt is None:
        raise ValueError("Could not find salt for email")
    salt = salt[0]

    password_hash = auth.hash_password(password, salt)
    database.execute("UPDATE groups SET password=:password WHERE contact_email=:email",
                     {"password": password_hash, "email": email})
    database.execute("DELETE from password_recovery WHERE token=:token", {"token": token})
    database.commit()

    return password_hash

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
