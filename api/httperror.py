#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""httperror.py: Contains a custom error class for throwing errors for webserver to handle"""

class HTTPError(Exception):
    def __init__(self, message, statuscode=None):
        self.message = message
        self.status = statuscode
