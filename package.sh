#!/bin/bash

npm install
zimlet build
zimlet package -v 0.0.6 --zimbraXVersion ">=2.0.0" -n "zimbra-zimlet-bigbluebutton" --desc "Schedule BigBlueButton Meetings from Zimbra calendar" -l "BigBlueButton Zimlet"
