#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import re

"""resources.py: Various multi use functions"""

def trimstring(dirtystring):
    """Cleans out a dirty strings
Makes it lowercase, and strips out any whitespaces from start and end"""
    cleanstring = dirtystring.lower().strip()
    return cleanstring

def verify_email(email):
    """Performs a simple email verification"""
    trimstring(email)
    match = re.match(r'^.+@.+\..+$', email)
    if match is None:
        return False
    return email
