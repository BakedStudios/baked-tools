from flask import escape, request
import shotgun_api3
import gspread
from datetime import datetime
import os
import json

    ######################
    # Make HTTP REQUESTS #
    ######################

def sync_shotgrid_to_sheet(request):
    project_name = request.args.get('project_name')
    sheet_name = request.args.get('sheet_name')

    if not project_name:
        return 'Project name is missing', 400

    if not sheet_name:
        return 'Sheet name is missing', 400


    ##############
    # GET SG STUFF#
    ##############

    # Retrieve API KEY from environment variable
    retrieved_key = os.environ.get('SG_API_KEY')
    if not retrieved_key:
        return 'ShotGrid API key is missing from environment variables', 500

    # Define ShotGrid server and script credentials
    SHOTGUN_URL = 'https://baked.shotgunstudio.com'
    SCRIPT_NAME = 'Tidbyt'
    SCRIPT_KEY = retrieved_key

    #Connect to shotgrid
    try:
        sg = shotgun_api3.Shotgun(SHOTGUN_URL, SCRIPT_NAME, SCRIPT_KEY)
    except Exception as e:
        return f"Failed to connect to ShotGrid: {str(e)}", 500

    # Define filter to find the playlist by name
    playlist_filters = [['code', 'is', sheet_name]]

    # Attempt to find the playlist
    try:
        playlists = sg.find_one("Playlist", playlist_filters, ['id'])
        if not playlists:
            raise ValueError(f'No playlist found with the name: {sheet_name}')
        playlist_id = playlists['id']
    except Exception as e:
        return f"Error finding playlist: {str(e)}", 500


    # Define version filters including playlist ID
    filters = [
        ["project.Project.name", "is", project_name],
        ["playlists", "in", [{"type": "Playlist", "id": playlist_id}]]
    ]

    # Define fields to be retrieved
    fields = ['sg_shot_code', 'client_code', 'sg_work_description']

    # Define note fields to be retrieved
    note_fields = ['content', 'addressings_to']

    try:
        versions = sg.find("Version", filters, fields)
        if not versions:
            raise ValueError(f'SG was not able to find versions for project: {project_name}')
    except Exception as e:
        return str(e), 500

    # Sort versions by 'sg_shot_code' in alphabetical order
    sorted_versions = sorted(versions, key=lambda x: x['sg_shot_code'])

    # Create a 2D array
    versions_data_for_sheet = [
        [version['sg_shot_code'], version['client_code'], version.get('sg_work_description', '')] 
        for version in sorted_versions
    ]

    ###############
    # PUT ON GSHEET#
    ###############

    # Retrieve Google Sheet keys from environment variable
    google_sheet_keys_json = os.environ.get('GOOGLE_SHEET_KEYS')
    if not google_sheet_keys_json:
        return 'Google Sheet keys are missing from environment variables', 500

    google_sheet_keys = json.loads(google_sheet_keys_json)

    # Use service account to open sheet
    sa = gspread.service_account_from_dict(google_sheet_keys)

    ################################
    ## CONTACTS PULL FROM GSHEET ###
    ################################

    try:
    # Open contacts sheet
        sh = sa.open(project_name + "_CLIENT_CONTACT_SHEET")
    except gspread.exceptions.SpreadsheetNotFound as e:
        return f"Google was not able to locate your contact sheet, check naming and try again.", 500

    # access correct contacts worksheet
    wks = sh.worksheet("Sheet1")

    # get cotacts data
    contacts_in_data = wks.get("A2:F15")

     # sync contacts
    contacts_out_data = contacts_in_data

    try: 
    #open Submission Sheet
        sh = sa.open(sheet_name)
    except gspread.exceptions.SpreadsheetNotFound as e:
        return "Google was not able to locate your submission sheet, check naming, date, and try again.", 500

    # Access correct worksheet
    wks = sh.worksheet("Submission")

    # Clear existing data
    cell_range_to_clear = 'A3:D30'
    wks.update(cell_range_to_clear, [["" for _ in range(4)] for _ in range(28)])

    # Update worksheet with both versions and corresponding notes
    try:
        wks.update('A3', versions_data_for_sheet)
    except gspread.exceptions.APIError as e:
        return f"Failed to update Google Sheet: {str(e)}", 500


    ##############################
    ## CONTACTS PUSH TO GSHEET ###
    ##############################

    # access correct contacts worksheet in target sheet
    wks = sh.worksheet("Contacts")

    # Fetch the range of contacts cells
    contacts_cell_range_to_clear = 'A3:F15'

    # Clear the values for contacts
    for cell in contacts_cell_range_to_clear:
        wks.update(contacts_cell_range_to_clear, [["" for _ in range(6)] for _ in range(13)])

    # update contacts worksheet
    wks.update('A3', contacts_out_data)

    return 'Sync complete', 200