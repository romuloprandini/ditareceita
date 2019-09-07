#!/bin/bash

functions-emulator start
functions deploy dialogflowFirebaseFulfillment --trigger-http
functions-emulator inspect dialogflowFirebaseFulfillment --port 6000
